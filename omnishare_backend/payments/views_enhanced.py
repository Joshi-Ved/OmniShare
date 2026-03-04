"""
Payment Views - schema-aligned endpoints for checkout, payment verification,
refund handling, invoice lifecycle, settlements, and Razorpay webhooks.
"""

import json
import logging

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.http import FileResponse
from django.utils import timezone
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from bookings.models import Booking
from .models import Transaction, Settlement, Invoice, WebhookLog
from .serializers_enhanced import (
    TransactionSerializer,
    SettlementSerializer,
    InvoiceSerializer,
    WebhookLogSerializer,
)
from .payment_services import RazorpayService, EscrowService, InvoiceService, SettlementService

logger = logging.getLogger(__name__)


class PaymentViewSet(viewsets.ModelViewSet):
    """Payment operations endpoint"""

    queryset = Transaction.objects.select_related('booking', 'user', 'escrow').all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.role == 'admin':
            return self.queryset
        return self.queryset.filter(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='checkout-preview')
    def checkout_preview(self, request):
        """Preview checkout totals before creating order."""
        booking_id = request.data.get('booking_id')
        booking = get_object_or_404(Booking, id=booking_id, guest=request.user)

        return Response({
            'booking_id': booking.id,
            'listing': booking.listing.title,
            'date_range': {
                'start_date': booking.start_date,
                'end_date': booking.end_date,
                'rental_days': booking.rental_days,
            },
            'amounts': {
                'rental_amount': booking.rental_amount,
                'deposit': booking.deposit,
                'insurance_fee': booking.insurance_fee,
                'commission_guest': booking.commission_guest,
                'guest_total': booking.guest_total,
                'host_payout': booking.host_payout,
                'platform_commission': booking.platform_commission,
            },
            'booking_status': booking.booking_status,
        })

    @action(detail=False, methods=['post'], url_path='create-order')
    def create_order(self, request):
        """Create Razorpay order and pending transaction for a booking."""
        booking_id = request.data.get('booking_id')
        booking = get_object_or_404(Booking, id=booking_id, guest=request.user)

        if booking.booking_status not in ['pending']:
            return Response(
                {'error': 'Payment can only be initiated for pending bookings'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_success = Transaction.objects.filter(
            booking=booking,
            transaction_type='booking_payment',
            status='success',
        ).exists()
        if existing_success:
            return Response(
                {'error': 'Booking is already paid'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                razorpay_service = RazorpayService()
                razorpay_order = razorpay_service.create_order(booking)

                escrow_service = EscrowService()
                escrow = getattr(booking, 'escrow', None)
                if escrow is None:
                    escrow = escrow_service.create_escrow(booking)

                trans = Transaction.objects.create(
                    booking=booking,
                    user=request.user,
                    escrow=escrow,
                    transaction_type='booking_payment',
                    amount=booking.guest_total,
                    status='pending',
                    razorpay_order_id=razorpay_order['id'],
                    description=f'Checkout initiated for booking {booking.id}',
                    metadata={'order_data': razorpay_order},
                )

            return Response(
                {
                    'order_id': razorpay_order['id'],
                    'amount': razorpay_order['amount'],
                    'currency': razorpay_order['currency'],
                    'razorpay_key_id': settings.RAZORPAY_KEY_ID,
                    'transaction': TransactionSerializer(trans).data,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            logger.error('Payment order creation failed: %s', str(exc))
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='verify')
    def verify(self, request):
        """Verify payment signature, mark transaction success, confirm booking, and generate invoice."""
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature = request.data.get('razorpay_signature')

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

        trans = get_object_or_404(
            Transaction,
            razorpay_order_id=razorpay_order_id,
            user=request.user,
            transaction_type='booking_payment',
        )

        razorpay_service = RazorpayService()
        is_valid = razorpay_service.verify_signature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        )
        if not is_valid:
            trans.status = 'failed'
            trans.razorpay_payment_id = razorpay_payment_id
            trans.razorpay_signature = razorpay_signature
            trans.description = 'Payment verification failed'
            trans.save(update_fields=['status', 'razorpay_payment_id', 'razorpay_signature', 'description'])
            return Response({'error': 'Payment verification failed'}, status=status.HTTP_400_BAD_REQUEST)

        booking = trans.booking

        try:
            with transaction.atomic():
                trans.status = 'success'
                trans.razorpay_payment_id = razorpay_payment_id
                trans.razorpay_signature = razorpay_signature
                trans.completed_at = timezone.now()
                trans.description = 'Payment verified successfully'
                trans.save()

                if booking.can_confirm():
                    booking.confirm_booking()

                invoice_service = InvoiceService()
                invoice = getattr(booking, 'invoice', None)
                if invoice is None:
                    invoice = invoice_service.generate_invoice(booking)
                    try:
                        invoice_service.send_invoice_email(invoice)
                    except Exception as mail_exc:
                        logger.warning('Invoice email send failed for booking %s: %s', booking.id, str(mail_exc))

                if hasattr(booking, 'escrow') and booking.escrow.status == 'active':
                    settlement_service = SettlementService()
                    settlement_service.create_settlement(booking.escrow)

            return Response(
                {
                    'message': 'Payment successful',
                    'transaction': TransactionSerializer(trans).data,
                    'booking_status': booking.booking_status,
                    'invoice_number': getattr(booking.invoice, 'invoice_number', None),
                },
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            logger.error('Payment verification flow failed: %s', str(exc))
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='refund')
    def refund(self, request):
        """Create refund for a successful booking transaction."""
        booking_id = request.data.get('booking_id')
        reason = request.data.get('reason', 'unspecified')
        requested_amount = request.data.get('amount')

        booking = get_object_or_404(Booking, id=booking_id)
        if request.user not in [booking.guest, booking.host] and request.user.role != 'admin':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        payment_txn = Transaction.objects.filter(
            booking=booking,
            transaction_type='booking_payment',
            status='success',
        ).first()
        if not payment_txn:
            return Response(
                {'error': 'No successful booking payment found for this booking'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        amount = payment_txn.amount if requested_amount in [None, ''] else requested_amount

        try:
            with transaction.atomic():
                razorpay_service = RazorpayService()
                refund_response = razorpay_service.create_refund(payment_txn.razorpay_payment_id, amount)

                refund_txn = Transaction.objects.create(
                    booking=booking,
                    user=request.user,
                    escrow=getattr(booking, 'escrow', None),
                    transaction_type='refund',
                    amount=amount,
                    status='success',
                    razorpay_payment_id=payment_txn.razorpay_payment_id,
                    description=f'Refund processed: {reason}',
                    metadata={'refund_details': refund_response, 'reason': reason},
                    completed_at=timezone.now(),
                )

                payment_txn.status = 'refunded'
                payment_txn.save(update_fields=['status'])

                if hasattr(booking, 'escrow') and booking.escrow.status in ['active', 'partially_released']:
                    EscrowService().refund_escrow(booking, amount)

            return Response(
                {
                    'message': 'Refund processed successfully',
                    'refund_id': refund_response.get('id'),
                    'transaction': TransactionSerializer(refund_txn).data,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            logger.error('Refund processing failed: %s', str(exc))
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='transactions')
    def transactions(self, request):
        query = Transaction.objects.filter(user=request.user).order_by('-created_at')
        txn_type = request.query_params.get('type')
        txn_status = request.query_params.get('status')
        if txn_type:
            query = query.filter(transaction_type=txn_type)
        if txn_status:
            query = query.filter(status=txn_status)
        return Response(TransactionSerializer(query, many=True).data)

    @action(detail=False, methods=['get'], url_path='settlements')
    def settlements(self, request):
        if request.user.role in ['host', 'both', 'admin']:
            query = Settlement.objects.filter(user=request.user).order_by('-created_at')
        else:
            query = Settlement.objects.none()
        return Response(SettlementSerializer(query, many=True).data)


class InvoiceViewSet(viewsets.ModelViewSet):
    """Invoice management endpoint"""

    queryset = Invoice.objects.select_related('booking', 'guest', 'host').all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.role == 'admin':
            return self.queryset
        return self.queryset.filter(Q(guest=self.request.user) | Q(host=self.request.user))

    @action(detail=True, methods=['post'])
    def resend_email(self, request, pk=None):
        invoice = self.get_object()
        if request.user not in [invoice.guest, invoice.host] and request.user.role != 'admin':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        try:
            InvoiceService().send_invoice_email(invoice)
            return Response({'message': 'Invoice sent successfully'}, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.error('Failed to resend invoice: %s', str(exc))
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        invoice = self.get_object()
        if request.user not in [invoice.guest, invoice.host] and request.user.role != 'admin':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        if not invoice.pdf_file:
            return Response({'error': 'Invoice PDF not available'}, status=status.HTTP_404_NOT_FOUND)

        response = FileResponse(invoice.pdf_file.open('rb'))
        response['Content-Type'] = 'application/pdf'
        response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
        return response


class WebhookViewSet(viewsets.ModelViewSet):
    """Razorpay webhook intake and logging endpoint"""

    queryset = WebhookLog.objects.all()
    serializer_class = WebhookLogSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def razorpay_webhook(self, request):
        payload = request.data
        event = payload.get('event')
        webhook_id = payload.get('id')

        if not event or not webhook_id:
            return Response({'error': 'Invalid webhook payload'}, status=status.HTTP_400_BAD_REQUEST)

        webhook = WebhookLog.objects.create(
            event=event,
            razorpay_webhook_id=webhook_id,
            payload=payload,
            processed=False,
        )

        try:
            if event == 'payment.failed':
                payment_id = payload.get('payload', {}).get('payment', {}).get('entity', {}).get('id')
                if payment_id:
                    txn = Transaction.objects.filter(razorpay_payment_id=payment_id).first()
                    if txn:
                        txn.status = 'failed'
                        txn.description = 'Marked failed from webhook'
                        txn.save(update_fields=['status', 'description'])

            webhook.processed = True
            webhook.processed_at = timezone.now()
            webhook.save(update_fields=['processed', 'processed_at'])
            return Response({'message': 'Webhook processed'}, status=status.HTTP_200_OK)
        except Exception as exc:
            webhook.processing_error = str(exc)
            webhook.processed = False
            webhook.processed_at = timezone.now()
            webhook.save(update_fields=['processing_error', 'processed', 'processed_at'])
            logger.error('Webhook processing failed: %s', str(exc))
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
