"""
Payment Views - API endpoints for payment processing
Handles:
- Payment order creation
- Payment verification
- Refunds
- Invoice management
- Settlement tracking
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.conf import settings
import json
import logging

from bookings.models import Booking
from users.models import User
from .models import (
    Transaction, EscrowAccount, CommissionSplit, 
    Settlement, Invoice, WebhookLog
)
from .serializers_enhanced import (
    TransactionSerializer, EscrowAccountSerializer,
    SettlementSerializer, InvoiceSerializer, WebhookLogSerializer
)
from .payment_services import (
    RazorpayService, EscrowService, InvoiceService, SettlementService
)

logger = logging.getLogger(__name__)


class PaymentViewSet(viewsets.ModelViewSet):
    """Payment operations endpoint"""
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def create_order(self, request):
        """
        Create payment order for booking
        
        POST /api/payments/create-order/
        {
            "booking_id": 123
        }
        """
        try:
            booking_id = request.data.get('booking_id')
            booking = get_object_or_404(Booking, id=booking_id, guest=request.user)
            
            # Check if payment already exists
            existing = Transaction.objects.filter(booking=booking).first()
            if existing and existing.status in ['pending', 'success']:
                return Response({
                    'error': 'Payment already exists for this booking',
                    'transaction': TransactionSerializer(existing).data
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                # Initialize Razorpay service
                razorpay_service = RazorpayService()
                
                # Create Razorpay order
                razorpay_order = razorpay_service.create_order(booking)
                
                # Create escrow account
                escrow_service = EscrowService()
                escrow = escrow_service.create_escrow(booking)
                
                # Create transaction record
                trans = Transaction.objects.create(
                    booking=booking,
                    user=request.user,
                    amount=booking.guest_total,
                    status='pending',
                    payment_gateway='razorpay',
                    razorpay_order_id=razorpay_order['id'],
                    metadata={
                        'razorpay_key_id': settings.RAZORPAY_KEY_ID,
                        'order_data': razorpay_order,
                    }
                )
                
                logger.info(f"Payment order created: {razorpay_order['id']} for booking {booking.id}")
            
            return Response({
                'order_id': razorpay_order['id'],
                'amount': razorpay_order['amount'],
                'currency': razorpay_order['currency'],
                'transaction_id': trans.id,
                'razorpay_key_id': settings.RAZORPAY_KEY_ID,
                'booking': {
                    'id': booking.id,
                    'listing': booking.listing.title,
                    'start_date': booking.start_date,
                    'end_date': booking.end_date,
                }
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"Payment order creation failed: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def verify(self, request):
        """
        Verify payment and update transaction status
        
        POST /api/payments/verify/
        {
            "razorpay_order_id": "order_xxx",
            "razorpay_payment_id": "pay_xxx",
            "razorpay_signature": "signature_xxx"
        }
        """
        try:
            razorpay_order_id = request.data.get('razorpay_order_id')
            razorpay_payment_id = request.data.get('razorpay_payment_id')
            razorpay_signature = request.data.get('razorpay_signature')
            
            if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
                return Response({
                    'error': 'Missing required fields'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get transaction
            trans = get_object_or_404(
                Transaction,
                razorpay_order_id=razorpay_order_id,
                user=request.user
            )
            
            # Verify signature
            razorpay_service = RazorpayService()
            if not razorpay_service.verify_signature(
                razorpay_order_id, 
                razorpay_payment_id,
                razorpay_signature
            ):
                trans.status = 'failed'
                trans.save()
                return Response({
                    'error': 'Payment verification failed'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                # Fetch payment details
                payment = razorpay_service.fetch_payment(razorpay_payment_id)
                
                # Update transaction
                trans.razorpay_payment_id = razorpay_payment_id
                trans.status = 'success'
                trans.processed_at = timezone.now()
                trans.metadata = {
                    'payment_details': payment,
                }
                trans.save()
                
                # Update booking status
                booking = trans.booking
                booking.payment_status = 'paid'
                booking.status = 'confirmed'
                booking.save()
                
                # Create invoice
                invoice_service = InvoiceService()
                invoice = invoice_service.generate_invoice(booking)
                invoice_service.send_invoice_email(invoice)
                
                # Release settlement (for demo - in production, release after stay)
                escrow = booking.escrow
                settlement_service = SettlementService()
                settlement = settlement_service.create_settlement(escrow)
                
                logger.info(f"Payment verified for booking {booking.id}")
            
            return Response({
                'message': 'Payment successful',
                'transaction': TransactionSerializer(trans).data,
                'booking_id': trans.booking.id,
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Payment verification failed: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def refund(self, request):
        """
        Create refund for booking
        
        POST /api/payments/refund/
        {
            "booking_id": 123,
            "reason": "cancellation",
            "amount": 500.00 (optional)
        }
        """
        try:
            booking_id = request.data.get('booking_id')
            reason = request.data.get('reason', 'unspecified')
            amount = request.data.get('amount')
            
            booking = get_object_or_404(Booking, id=booking_id)
            
            # Check permission
            if request.user not in [booking.guest, booking.host]:
                return Response({
                    'error': 'Permission denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get transaction
            trans = Transaction.objects.filter(
                booking=booking,
                status='success'
            ).first()
            
            if not trans:
                return Response({
                    'error': 'No successful transaction found for this booking'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                razorpay_service = RazorpayService()
                
                # Create refund
                refund_response = razorpay_service.create_refund(
                    trans.razorpay_payment_id,
                    amount
                )
                
                # Create refund transaction
                refund_amount = amount or trans.amount
                refund_trans = Transaction.objects.create(
                    booking=booking,
                    user=request.user,
                    amount=refund_amount,
                    status='success',
                    transaction_type='refund',
                    payment_gateway='razorpay',
                    razorpay_payment_id=trans.razorpay_payment_id,
                    razorpay_refund_id=refund_response['id'],
                    metadata={
                        'reason': reason,
                        'refund_details': refund_response,
                    }
                )
                
                # Update original transaction
                trans.refund_status = 'refunded'
                trans.save()
                
                # Update escrow if applicable
                escrow = booking.escrow
                if escrow and escrow.status == 'active':
                    escrow_service = EscrowService()
                    escrow_service.refund_escrow(booking, refund_amount)
                
                logger.info(f"Refund created for booking {booking.id}: ₹{refund_amount}")
            
            return Response({
                'message': 'Refund processed successfully',
                'refund_id': refund_response['id'],
                'amount': refund_amount,
                'transaction': TransactionSerializer(refund_trans).data,
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"Refund processing failed: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def transactions(self, request):
        """
        Get user transactions
        
        GET /api/payments/transactions/
        """
        transactions = Transaction.objects.filter(user=request.user).order_by('-created_at')
        
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def settlements(self, request):
        """
        Get user settlements
        
        GET /api/payments/settlements/
        """
        settlements = Settlement.objects.filter(user=request.user).order_by('-created_at')
        
        serializer = SettlementSerializer(settlements, many=True)
        return Response(serializer.data)


class InvoiceViewSet(viewsets.ModelViewSet):
    """Invoice management endpoint"""
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only show invoices for current user"""
        return Invoice.objects.filter(
            models.Q(guest=self.request.user) | models.Q(host=self.request.user)
        )
    
    @action(detail=True, methods=['post'])
    def resend_email(self, request, pk=None):
        """
        Resend invoice via email
        
        POST /api/invoices/{id}/resend_email/
        """
        invoice = self.get_object()
        
        # Check permission
        if request.user != invoice.guest and request.user != invoice.host:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            invoice_service = InvoiceService()
            invoice_service.send_invoice_email(invoice)
            
            return Response({
                'message': 'Invoice sent successfully',
                'email': invoice.guest.email
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Failed to resend invoice: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Download invoice PDF
        
        GET /api/invoices/{id}/download/
        """
        invoice = self.get_object()
        
        # Check permission
        if request.user != invoice.guest and request.user != invoice.host:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if not invoice.pdf_file:
            return Response({
                'error': 'Invoice PDF not available'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            from django.http import FileResponse
            response = FileResponse(invoice.pdf_file.open('rb'))
            response['Content-Type'] = 'application/pdf'
            response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
            return response
        
        except Exception as e:
            logger.error(f"Failed to download invoice: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class WebhookViewSet(viewsets.ModelViewSet):
    """Webhook handling endpoint"""
    queryset = WebhookLog.objects.all()
    serializer_class = WebhookLogSerializer
    
    @action(detail=False, methods=['post'])
    def razorpay_webhook(self, request):
        """
        Handle Razorpay webhooks
        
        POST /api/webhooks/razorpay_webhook/
        """
        try:
            # Extract webhook data
            webhook_data = request.data
            webhook_event = webhook_data.get('event')
            webhook_payload = webhook_data.get('payload', {})
            webhook_id = webhook_data.get('id')
            
            # Create webhook log
            webhook_log = WebhookLog.objects.create(
                webhook_id=webhook_id,
                event_type=webhook_event,
                payload=webhook_data,
                ip_address=request.META.get('REMOTE_ADDR'),
                verified=False
            )
            
            logger.info(f"Webhook received: {webhook_event} (ID: {webhook_id})")
            
            # Verify webhook signature
            razorpay_signature = request.META.get('HTTP_X_RAZORPAY_SIGNATURE')
            # TODO: Implement proper signature verification
            
            # Process webhook events
            if webhook_event == 'payment.authorized':
                self._handle_payment_authorized(webhook_payload, webhook_log)
            
            elif webhook_event == 'payment.failed':
                self._handle_payment_failed(webhook_payload, webhook_log)
            
            elif webhook_event == 'refund.created':
                self._handle_refund_created(webhook_payload, webhook_log)
            
            elif webhook_event == 'settlement.processed':
                self._handle_settlement_processed(webhook_payload, webhook_log)
            
            webhook_log.verified = True
            webhook_log.processed = True
            webhook_log.save()
            
            return Response({
                'message': 'Webhook processed successfully'
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Webhook processing failed: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _handle_payment_authorized(self, payload, webhook_log):
        """Handle payment.authorized event"""
        payment = payload.get('payment', {})
        razorpay_payment_id = payment.get('id')
        
        try:
            trans = Transaction.objects.get(razorpay_payment_id=razorpay_payment_id)
            trans.status = 'authorized'
            trans.save()
            
            webhook_log.metadata = {
                'transaction_id': trans.id,
                'booking_id': trans.booking.id,
            }
            
            logger.info(f"Payment authorized: {razorpay_payment_id}")
        
        except Transaction.DoesNotExist:
            logger.warning(f"Payment authorized but transaction not found: {razorpay_payment_id}")
    
    def _handle_payment_failed(self, payload, webhook_log):
        """Handle payment.failed event"""
        payment = payload.get('payment', {})
        razorpay_payment_id = payment.get('id')
        error_reason = payment.get('error_reason')
        
        try:
            trans = Transaction.objects.filter(
                razorpay_payment_id=razorpay_payment_id
            ).first()
            
            if trans:
                trans.status = 'failed'
                trans.save()
                
                webhook_log.metadata = {
                    'transaction_id': trans.id,
                    'booking_id': trans.booking.id,
                    'error_reason': error_reason,
                }
            
            logger.warning(f"Payment failed: {razorpay_payment_id} ({error_reason})")
        
        except Exception as e:
            logger.error(f"Error handling payment failed event: {str(e)}")
    
    def _handle_refund_created(self, payload, webhook_log):
        """Handle refund.created event"""
        refund = payload.get('refund', {})
        razorpay_refund_id = refund.get('id')
        razorpay_payment_id = refund.get('payment_id')
        
        try:
            trans = Transaction.objects.get(razorpay_payment_id=razorpay_payment_id)
            trans.refund_status = 'refunded'
            trans.save()
            
            webhook_log.metadata = {
                'transaction_id': trans.id,
                'refund_id': razorpay_refund_id,
            }
            
            logger.info(f"Refund created: {razorpay_refund_id}")
        
        except Transaction.DoesNotExist:
            logger.warning(f"Refund created but transaction not found: {razorpay_payment_id}")
    
    def _handle_settlement_processed(self, payload, webhook_log):
        """Handle settlement.processed event"""
        settlement_data = payload.get('settlement', {})
        razorpay_settlement_id = settlement_data.get('id')
        amount = settlement_data.get('amount')
        
        try:
            settlement = Settlement.objects.filter(
                razorpay_transfer_id=razorpay_settlement_id
            ).first()
            
            if settlement:
                settlement.status = 'completed'
                settlement.metadata = {
                    'razorpay_settlement_id': razorpay_settlement_id,
                    'amount': amount,
                }
                settlement.save()
                
                webhook_log.metadata = {
                    'settlement_id': settlement.id,
                    'user_id': settlement.user.id,
                }
            
            logger.info(f"Settlement processed: {razorpay_settlement_id}")
        
        except Exception as e:
            logger.error(f"Error handling settlement processed event: {str(e)}")


# Import here to avoid circular imports
from django.db import models
from django.utils import timezone
