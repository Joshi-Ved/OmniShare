"""
Payment Services Module - Experiment 5
Handles all payment operations including:
- Razorpay integration
- Escrow management
- Commission calculations
- Invoice generation
- Settlement processing
"""

import razorpay
import stripe
from django.conf import settings
from django.db import transaction as db_transaction
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from io import BytesIO
import json
import logging
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)


class RazorpayService:
    """Handles all Razorpay operations"""
    
    def __init__(self):
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
    
    def create_order(self, booking):
        """
        Create Razorpay order for booking payment
        
        Args:
            booking: Booking instance
            
        Returns:
            Razorpay order data
        """
        try:
            amount = int(float(booking.guest_total) * 100)  # Convert to paise
            
            order_data = {
                'amount': amount,
                'currency': 'INR',
                'receipt': f'booking_{booking.id}_{timezone.now().timestamp()}',
                'notes': {
                    'booking_id': str(booking.id),
                    'guest_id': str(booking.guest.id),
                    'host_id': str(booking.host.id),
                    'listing_id': str(booking.listing.id),
                    'rental_days': str(booking.rental_days),
                }
            }
            
            order = self.client.order.create(data=order_data)
            logger.info(f"Razorpay order created: {order['id']} for booking {booking.id}")
            return order
        
        except Exception as e:
            logger.error(f"Razorpay order creation failed: {str(e)}")
            raise
    
    def verify_signature(self, razorpay_order_id, razorpay_payment_id, razorpay_signature):
        """
        Verify Razorpay payment signature
        
        Args:
            razorpay_order_id: Order ID from Razorpay
            razorpay_payment_id: Payment ID from Razorpay
            razorpay_signature: Signature for verification
            
        Returns:
            Boolean indicating if signature is valid
        """
        try:
            params_dict = {
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            }
            
            self.client.utility.verify_payment_signature(params_dict)
            logger.info(f"Payment signature verified for order {razorpay_order_id}")
            return True
        
        except razorpay.errors.SignatureVerificationError:
            logger.warning(f"Payment signature verification failed for order {razorpay_order_id}")
            return False
    
    def capture_payment(self, razorpay_payment_id, amount):
        """
        Capture authorized payment
        
        Args:
            razorpay_payment_id: Payment ID
            amount: Amount in paise
            
        Returns:
            Captured payment data
        """
        try:
            payment = self.client.payment.capture(razorpay_payment_id, int(amount * 100))
            logger.info(f"Payment captured: {razorpay_payment_id}")
            return payment
        
        except Exception as e:
            logger.error(f"Payment capture failed: {str(e)}")
            raise
    
    def create_refund(self, razorpay_payment_id, amount=None):
        """
        Create refund for payment
        
        Args:
            razorpay_payment_id: Payment ID to refund
            amount: Optional amount to refund (in rupees)
            
        Returns:
            Refund data
        """
        try:
            refund_data = {'notes': {}}
            if amount:
                refund_data['amount'] = int(float(amount) * 100)  # Convert to paise
            
            refund = self.client.payment.refund(razorpay_payment_id, refund_data)
            logger.info(f"Refund created: {refund['id']} for payment {razorpay_payment_id}")
            return refund
        
        except Exception as e:
            logger.error(f"Refund creation failed: {str(e)}")
            raise
    
    def transfer_funds(self, account_id, amount, notes=None):
        """
        Transfer funds to host account
        
        Args:
            account_id: Razorpay account ID
            amount: Amount in rupees
            notes: Optional notes
            
        Returns:
            Transfer data
        """
        try:
            transfer_data = {
                'account': account_id,
                'amount': int(float(amount) * 100),
                'currency': 'INR',
            }
            if notes:
                transfer_data['notes'] = notes
            
            transfer = self.client.transfer.create(transfer_data)
            logger.info(f"Transfer created: {transfer['id']} for amount {amount}")
            return transfer
        
        except Exception as e:
            logger.error(f"Transfer creation failed: {str(e)}")
            raise
    
    def fetch_payment(self, razorpay_payment_id):
        """Fetch payment details from Razorpay"""
        try:
            return self.client.payment.fetch(razorpay_payment_id)
        except Exception as e:
            logger.error(f"Failed to fetch payment {razorpay_payment_id}: {str(e)}")
            raise


class StripeService:
    """Handles Stripe checkout operations with sandbox/demo support."""

    def __init__(self):
        self.secret_key = settings.STRIPE_SECRET_KEY
        self.publishable_key = settings.STRIPE_PUBLISHABLE_KEY
        self.use_demo = settings.STRIPE_USE_DEMO or not self.secret_key
        if self.secret_key:
            stripe.api_key = self.secret_key

    def create_checkout_session(self, booking):
        """Create Stripe Checkout session for booking payment."""
        frontend_url = settings.FRONTEND_BASE_URL.rstrip('/')
        success_url = (
            f"{frontend_url}/payments/{booking.id}"
            "?gateway=stripe&stripe_status=success&session_id={CHECKOUT_SESSION_ID}"
        )
        cancel_url = f"{frontend_url}/payments/{booking.id}?gateway=stripe&stripe_status=cancelled"

        if self.use_demo:
            session_id = f"demo_cs_{booking.id}_{int(timezone.now().timestamp())}"
            return {
                'id': session_id,
                'url': success_url.replace('{CHECKOUT_SESSION_ID}', session_id),
                'payment_status': 'unpaid',
                'demo': True,
                'publishable_key': self.publishable_key,
            }

        session = stripe.checkout.Session.create(
            mode='payment',
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'inr',
                        'unit_amount': int(float(booking.guest_total) * 100),
                        'product_data': {
                            'name': f'OmniShare Booking #{booking.id}',
                            'description': f'{booking.listing.title} ({booking.start_date} to {booking.end_date})',
                        },
                    },
                    'quantity': 1,
                }
            ],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'booking_id': str(booking.id),
                'guest_id': str(booking.guest_id),
                'host_id': str(booking.host_id),
            },
        )
        return {
            'id': session.id,
            'url': session.url,
            'payment_status': session.payment_status,
            'demo': False,
            'publishable_key': self.publishable_key,
        }

    def verify_checkout_session(self, session_id):
        """Verify Stripe Checkout session payment status."""
        if self.use_demo:
            return {
                'id': session_id,
                'payment_status': 'paid',
                'status': 'complete',
                'paid': True,
                'demo': True,
            }

        session = stripe.checkout.Session.retrieve(session_id)
        return {
            'id': session.id,
            'payment_status': session.payment_status,
            'status': session.status,
            'paid': session.payment_status == 'paid',
            'demo': False,
        }


class EscrowService:
    """Manages escrow accounts for bookings"""
    
    @db_transaction.atomic
    def create_escrow(self, booking):
        """
        Create escrow account for booking
        Holds guest payment until booking completion
        
        Args:
            booking: Booking instance
            
        Returns:
            EscrowAccount instance
        """
        from .models import EscrowAccount, CommissionSplit
        
        # Calculate commission split
        rental_amount = booking.rental_amount
        host_commission = rental_amount * Decimal('0.12')  # 12%
        guest_commission = rental_amount * Decimal('0.06')  # 6%
        total_commission = host_commission + guest_commission
        
        # Create escrow
        escrow = EscrowAccount.objects.create(
            booking=booking,
            guest=booking.guest,
            host=booking.host,
            total_amount=booking.guest_total,
            guest_commission=guest_commission,
            host_commission=host_commission,
            rental_amount=booking.rental_amount,
            platform_revenue=total_commission,
            held_until=timezone.now() + timedelta(days=1)
        )
        
        # Create commission split record
        CommissionSplit.objects.create(
            booking=booking,
            escrow=escrow,
            rental_amount=rental_amount,
            commission_host=host_commission,
            commission_guest=guest_commission,
            total_commission=total_commission,
            guest_total=booking.guest_total,
            host_payout=booking.host_payout,
            platform_earnings=total_commission
        )
        
        logger.info(f"Escrow created for booking {booking.id}: ₹{escrow.total_amount}")
        return escrow
    
    @db_transaction.atomic
    def release_escrow(self, booking):
        """
        Release escrow funds to host after booking completion
        
        Args:
            booking: Completed booking instance
            
        Returns:
            EscrowAccount instance
        """
        escrow = booking.escrow
        
        if escrow.status != 'active':
            raise ValueError(f"Cannot release escrow with status: {escrow.status}")
        
        escrow.release_to_host()
        logger.info(f"Escrow released for booking {booking.id}: ₹{escrow.rental_amount} to host")
        return escrow
    
    @db_transaction.atomic
    def refund_escrow(self, booking, amount=None):
        """
        Refund escrow funds to guest
        
        Args:
            booking: Booking instance
            amount: Optional partial refund amount
            
        Returns:
            EscrowAccount instance
        """
        escrow = booking.escrow
        refund_amount = amount or escrow.total_amount
        
        if refund_amount > escrow.total_amount:
            raise ValueError("Refund amount exceeds escrow total")
        
        escrow.refund_to_guest(refund_amount)
        logger.info(f"Escrow refunded for booking {booking.id}: ₹{refund_amount} to guest")
        return escrow


class InvoiceService:
    """Generates PDF invoices for bookings"""
    
    @db_transaction.atomic
    def generate_invoice(self, booking):
        """
        Generate PDF invoice for booking
        
        Args:
            booking: Booking instance
            
        Returns:
            Invoice instance
        """
        from .models import Invoice
        
        # Generate invoice number
        invoice_number = f"INV-{booking.id}-{timezone.now().strftime('%Y%m%d')}"
        
        # Create invoice record
        invoice = Invoice.objects.create(
            booking=booking,
            guest=booking.guest,
            host=booking.host,
            invoice_number=invoice_number,
            due_date=timezone.now().date() + timedelta(days=7),
            subtotal=booking.rental_amount,
            platform_commission=booking.platform_commission,
            total_amount=booking.guest_total
        )
        
        # Generate PDF
        pdf_content = self._generate_pdf(booking, invoice)
        
        # Save PDF
        pdf_filename = f"invoice_{invoice_number}.pdf"
        invoice.pdf_file.save(pdf_filename, ContentFile(pdf_content), save=True)
        invoice.pdf_generated = True
        invoice.save()
        
        logger.info(f"Invoice generated: {invoice_number} for booking {booking.id}")
        return invoice
    
    def _generate_pdf(self, booking, invoice):
        """
        Generate PDF content for invoice
        
        Args:
            booking: Booking instance
            invoice: Invoice instance
            
        Returns:
            PDF content as bytes
        """
        buffer = BytesIO()
        
        # Create PDF
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72,
                                topMargin=72, bottomMargin=18)
        
        # Container for the 'Flowable' objects
        elements = []
        
        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=30,
            alignment=1  # Center
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#374151'),
            spaceAfter=12,
            spaceBefore=12
        )
        
        # Title
        elements.append(Paragraph("OMNISHARE BOOKING INVOICE", title_style))
        elements.append(Spacer(1, 0.2*inch))
        
        # Invoice details
        invoice_details = [
            [Paragraph("<b>Invoice Number:</b>", styles['Normal']), invoice.invoice_number],
            [Paragraph("<b>Invoice Date:</b>", styles['Normal']), str(invoice.invoice_date)],
            [Paragraph("<b>Due Date:</b>", styles['Normal']), str(invoice.due_date)],
            [Paragraph("<b>Booking ID:</b>", styles['Normal']), str(booking.id)],
        ]
        
        invoice_table = Table(invoice_details, colWidths=[2*inch, 2*inch])
        invoice_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ]))
        
        elements.append(invoice_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Party details
        elements.append(Paragraph("<b>GUEST INFORMATION</b>", heading_style))
        guest_info = [
            [Paragraph("<b>Name:</b>", styles['Normal']), booking.guest.get_full_name() or booking.guest.username],
            [Paragraph("<b>Email:</b>", styles['Normal']), booking.guest.email],
            [Paragraph("<b>Phone:</b>", styles['Normal']), getattr(booking.guest, 'phone_number', 'N/A')],
        ]
        
        guest_table = Table(guest_info, colWidths=[1.5*inch, 3*inch])
        guest_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ]))
        
        elements.append(guest_table)
        elements.append(Spacer(1, 0.2*inch))
        
        # Booking details
        elements.append(Paragraph("<b>BOOKING DETAILS</b>", heading_style))
        booking_details = [
            [Paragraph("<b>Item:</b>", styles['Normal']), booking.listing.title],
            [Paragraph("<b>Check-in:</b>", styles['Normal']), str(booking.start_date)],
            [Paragraph("<b>Check-out:</b>", styles['Normal']), str(booking.end_date)],
            [Paragraph("<b>Rental Days:</b>", styles['Normal']), str(booking.rental_days)],
            [Paragraph("<b>Daily Rate:</b>", styles['Normal']), f"₹{booking.daily_price}"],
        ]
        
        booking_table = Table(booking_details, colWidths=[1.5*inch, 3*inch])
        booking_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ]))
        
        elements.append(booking_table)
        elements.append(Spacer(1, 0.2*inch))
        
        # Amount breakdown
        elements.append(Paragraph("<b>PAYMENT BREAKDOWN</b>", heading_style))
        breakdown_data = [
            [Paragraph("<b>Description</b>", styles['Normal']), 
             Paragraph("<b>Amount</b>", styles['Normal'])],
            ["Rental Amount (Base)", f"₹{booking.rental_amount}"],
            ["Guest Commission (6%)", f"₹{booking.commission_guest}"],
            ["Deposit (Refundable)", f"₹{booking.deposit}"],
            ["Insurance Fee", f"₹{booking.insurance_fee}"],
            [Paragraph("<b>TOTAL GUEST PAYS</b>", styles['Normal']), 
             Paragraph(f"<b>₹{booking.guest_total}</b>", styles['Normal'])],
        ]
        
        breakdown_table = Table(breakdown_data, colWidths=[3*inch, 2*inch])
        breakdown_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0f9ff')),
        ]))
        
        elements.append(breakdown_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Host information
        elements.append(Paragraph("<b>HOST PAYOUT</b>", heading_style))
        host_data = [
            [Paragraph("<b>Description</b>", styles['Normal']), 
             Paragraph("<b>Amount</b>", styles['Normal'])],
            ["Rental Amount", f"₹{booking.rental_amount}"],
            ["Host Commission (12%)", f"-₹{booking.commission_host}"],
            [Paragraph("<b>HOST RECEIVES</b>", styles['Normal']), 
             Paragraph(f"<b>₹{booking.host_payout}</b>", styles['Normal'])],
        ]
        
        host_table = Table(host_data, colWidths=[3*inch, 2*inch])
        host_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#ecfdf5')),
        ]))
        
        elements.append(host_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Footer
        elements.append(Paragraph(
            "<i>This is an automated invoice. Payment status and disputes can be tracked in your OmniShare account.</i>",
            ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey)
        ))
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    
    def send_invoice_email(self, invoice):
        """
        Send invoice via email to guest
        
        Args:
            invoice: Invoice instance
        """
        try:
            subject = f"Booking Invoice - {invoice.invoice_number}"
            
            message = EmailMessage(
                subject=subject,
                body=f"""
Hello {invoice.guest.first_name or 'Guest'},

Your booking invoice is ready. Please find it attached.

Booking Details:
- Listing: {invoice.booking.listing.title}
- Check-in: {invoice.booking.start_date}
- Check-out: {invoice.booking.end_date}
- Total Amount: ₹{invoice.total_amount}

Best regards,
OmniShare Team
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[invoice.guest.email]
            )
            
            if invoice.pdf_file:
                message.attach_file(invoice.pdf_file.path)
            
            message.send()
            
            invoice.sent_to_guest = True
            invoice.save()
            
            logger.info(f"Invoice {invoice.invoice_number} sent to {invoice.guest.email}")
        
        except Exception as e:
            logger.error(f"Failed to send invoice {invoice.invoice_number}: {str(e)}")
            raise


class SettlementService:
    """Manages host settlements and payouts"""
    
    @db_transaction.atomic
    def create_settlement(self, escrow, settlement_type='escrow_release'):
        """
        Create settlement record for host
        
        Args:
            escrow: EscrowAccount instance
            settlement_type: Type of settlement
            
        Returns:
            Settlement instance
        """
        from .models import Settlement
        
        settlement = Settlement.objects.create(
            user=escrow.host,
            escrow=escrow,
            settlement_type=settlement_type,
            amount=escrow.rental_amount,
            status='pending',
            metadata={
                'booking_id': escrow.booking.id,
                'rental_amount': str(escrow.rental_amount),
                'commission': str(escrow.host_commission),
            }
        )
        
        logger.info(f"Settlement created: {settlement.id} for host {escrow.host.username}")
        return settlement
    
    @db_transaction.atomic
    def process_settlement(self, settlement):
        """
        Process settlement payout via Razorpay
        
        Args:
            settlement: Settlement instance
            
        Returns:
            Updated Settlement instance
        """
        try:
            razorpay_service = RazorpayService()
            
            # Transfer funds to host account
            host_account_id = getattr(settlement.user, 'razorpay_account_id', None)
            
            if not host_account_id:
                raise ValueError(f"Host {settlement.user.username} has no Razorpay account")
            
            transfer = razorpay_service.transfer_funds(
                account_id=host_account_id,
                amount=settlement.amount,
                notes={
                    'settlement_id': str(settlement.id),
                    'booking_id': str(settlement.escrow.booking.id),
                }
            )
            
            # Update settlement
            settlement.status = 'completed'
            settlement.processed_at = timezone.now()
            settlement.razorpay_transfer_id = transfer['id']
            settlement.save()
            
            logger.info(f"Settlement {settlement.id} processed: {transfer['id']}")
            return settlement
        
        except Exception as e:
            settlement.status = 'failed'
            settlement.save()
            logger.error(f"Settlement processing failed: {str(e)}")
            raise
    
    def get_pending_settlements(self, user=None):
        """
        Get pending settlements for user or all
        
        Args:
            user: Optional user instance
            
        Returns:
            QuerySet of pending settlements
        """
        from .models import Settlement
        
        query = Settlement.objects.filter(status='pending')
        if user:
            query = query.filter(user=user)
        return query
    
    def get_settlement_stats(self, user=None, date_from=None, date_to=None):
        """
        Get settlement statistics
        
        Args:
            user: Optional user instance
            date_from: Optional start date
            date_to: Optional end date
            
        Returns:
            Dictionary with settlement stats
        """
        from django.db.models import Sum, Count
        from .models import Settlement
        
        query = Settlement.objects.filter(status='completed')
        
        if user:
            query = query.filter(user=user)
        
        if date_from:
            query = query.filter(processed_at__gte=date_from)
        
        if date_to:
            query = query.filter(processed_at__lte=date_to)
        
        stats = query.aggregate(
            total_settlements=Count('id'),
            total_amount=Sum('amount'),
        )
        
        return {
            'total_settlements': stats['total_settlements'] or 0,
            'total_amount': stats['total_amount'] or Decimal('0.00'),
            'average_settlement': (stats['total_amount'] / stats['total_settlements']) 
                if stats['total_settlements'] > 0 else Decimal('0.00')
        }
