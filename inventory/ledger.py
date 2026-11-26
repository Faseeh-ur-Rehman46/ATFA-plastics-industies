from decimal import Decimal
from django.db.models import Sum, Q
from django.utils import timezone


def get_bill_summary_for_customer(customer):
    """
    Returns bills, payments, and FIFO smart auto-settlement for a given Customer instance.
    """
    from .models import Sale, CustomerPayment

    # Find sales either linked by FK or by exact customer name match
    sales_qs = Sale.objects.filter(
        Q(customer=customer) | Q(customer_name__iexact=customer.name),
        is_deleted=False
    ).select_related('product', 'voucher').order_by('date', 'id')

    # Group sales by bill_id
    bills_map = {}
    for s in sales_qs:
        bid = s.bill_id or f"SINGLE-{s.id}"
        if bid not in bills_map:
            bills_map[bid] = {
                'bill_id': bid,
                'customer_id': customer.id,
                'customer_name': customer.name,
                'date': s.date,
                'items': [],
                'total_amount': Decimal('0.00'),
                'direct_paid': Decimal('0.00'),
                'fifo_paid': Decimal('0.00'),
                'amount_paid': Decimal('0.00'),
                'balance_due': Decimal('0.00'),
                'status': 'unpaid',
            }
        line_total = (Decimal(str(s.quantity)) * Decimal(str(s.unit_price))) - Decimal(str(s.discount_amount or 0))
        bills_map[bid]['total_amount'] += line_total
        bills_map[bid]['items'].append({
            'id': s.id,
            'product_id': s.product_id,
            'product_name': s.product.name if s.product else '',
            'quantity': float(s.quantity),
            'unit': getattr(s, 'unit', 'kg') or 'kg',
            'input_quantity': float(getattr(s, 'input_quantity', None) or (s.quantity / Decimal('1000') if getattr(s, 'unit', 'kg') == 'ton' else s.quantity)),
            'rate_per_unit': float(getattr(s, 'rate_per_unit', None) or (s.unit_price * Decimal('1000') if getattr(s, 'unit', 'kg') == 'ton' else s.unit_price)),
            'unit_price': float(s.unit_price),
            'discount_amount': float(s.discount_amount or 0),
            'line_total': float(line_total),
        })

    # Fetch payments
    payments_qs = CustomerPayment.objects.filter(customer=customer).order_by('date', 'id')
    payments_list = list(payments_qs)

    # 1. Apply direct payments (where bill_id matches an existing bill)
    general_payments_pool = Decimal('0.00')
    for p in payments_list:
        amt = Decimal(str(p.amount))
        if p.bill_id and p.bill_id in bills_map:
            bills_map[p.bill_id]['direct_paid'] += amt
        else:
            general_payments_pool += amt

    # 2. Sort bills chronologically for FIFO allocation of general pool
    sorted_bills = sorted(bills_map.values(), key=lambda b: b['date'])

    # Allocate general payments to oldest unpaid bills first
    remaining_general = general_payments_pool
    for b in sorted_bills:
        direct = b['direct_paid']
        total = b['total_amount']
        needed = max(Decimal('0.00'), total - direct)

        if needed > 0 and remaining_general > 0:
            alloc = min(needed, remaining_general)
            b['fifo_paid'] = alloc
            remaining_general -= alloc
        else:
            b['fifo_paid'] = Decimal('0.00')

        b['amount_paid'] = b['direct_paid'] + b['fifo_paid']
        b['balance_due'] = max(Decimal('0.00'), total - b['amount_paid'])

        if b['balance_due'] <= Decimal('0.00'):
            b['status'] = 'paid'
        elif b['amount_paid'] > Decimal('0.00'):
            b['status'] = 'partial'
        else:
            b['status'] = 'unpaid'

    # Build chronological ledger timeline
    timeline = []
    running_balance = Decimal(str(customer.opening_balance or 0))

    if running_balance != 0:
        timeline.append({
            'date': customer.created_at,
            'type': 'OPENING',
            'reference': 'Opening Balance',
            'description': 'Account opening balance',
            'debit': float(running_balance) if running_balance > 0 else 0.0,
            'credit': float(abs(running_balance)) if running_balance < 0 else 0.0,
            'running_balance': float(running_balance),
        })

    # Merge bills and payments into timeline events
    events = []
    for b in sorted_bills:
        events.append({
            'date': b['date'],
            'type': 'INVOICE',
            'reference': b['bill_id'],
            'description': f"Invoice with {len(b['items'])} item(s)",
            'debit': b['total_amount'],
            'credit': Decimal('0.00'),
            'bill': b,
        })

    for p in payments_list:
        events.append({
            'date': p.date,
            'type': 'PAYMENT',
            'reference': f"PAY-{p.id}" if not p.reference else f"PAY-{p.id} ({p.reference})",
            'description': f"Payment via {p.get_payment_method_display()}" + (f" for {p.bill_id}" if p.bill_id else " (General / FIFO)"),
            'debit': Decimal('0.00'),
            'credit': Decimal(str(p.amount)),
            'payment': p,
        })

    # Sort events by date
    events.sort(key=lambda x: x['date'])

    for ev in events:
        running_balance += ev['debit'] - ev['credit']
        timeline.append({
            'date': ev['date'],
            'type': ev['type'],
            'reference': ev['reference'],
            'description': ev['description'],
            'debit': float(ev['debit']),
            'credit': float(ev['credit']),
            'running_balance': float(running_balance),
        })

    total_billed = sum(b['total_amount'] for b in sorted_bills)
    total_paid = sum(Decimal(str(p.amount)) for p in payments_list)
    current_balance = Decimal(str(customer.opening_balance or 0)) + total_billed - total_paid

    # Format bills for JSON serialization
    serialized_bills = []
    for b in sorted(sorted_bills, key=lambda x: x['date'], reverse=True):
        serialized_bills.append({
            'bill_id': b['bill_id'],
            'customer_id': b['customer_id'],
            'customer_name': b['customer_name'],
            'date': b['date'],
            'items': b['items'],
            'total_amount': float(b['total_amount']),
            'amount_paid': float(b['amount_paid']),
            'balance_due': float(b['balance_due']),
            'status': b['status'],
        })

    return {
        'customer': {
            'id': customer.id,
            'name': customer.name,
            'phone': customer.phone,
            'email': customer.email,
            'address': customer.address,
            'opening_balance': float(customer.opening_balance),
            'credit_limit': float(customer.credit_limit),
            'notes': customer.notes,
        },
        'total_billed': float(total_billed),
        'total_paid': float(total_paid),
        'current_balance': float(current_balance),
        'unpaid_bills_count': sum(1 for b in sorted_bills if b['status'] in ('unpaid', 'partial')),
        'bills': serialized_bills,
        'timeline': timeline,
    }


def get_all_bills_with_payment_status():
    """
    Returns all bills grouped across the whole system with their live payment status and amounts.
    """
    from .models import Customer, Sale, CustomerPayment

    customers = Customer.objects.filter(is_deleted=False)
    all_bills = []

    for c in customers:
        summary = get_bill_summary_for_customer(c)
        all_bills.extend(summary['bills'])

    # Handle any orphan sales without customer FK or matching Customer
    linked_customer_names = set(c.name.lower() for c in customers)
    orphan_sales = Sale.objects.filter(
        customer__isnull=True,
        is_deleted=False
    ).exclude(customer_name__iregex=r'|'.join(re_escape(c.name) for c in customers) if customers else r'^$')

    # Group orphan sales by bill_id
    orphan_bills_map = {}
    for s in orphan_sales:
        if s.customer_name and s.customer_name.strip().lower() in linked_customer_names:
            continue
        bid = s.bill_id or f"SINGLE-{s.id}"
        if bid not in orphan_bills_map:
            orphan_bills_map[bid] = {
                'bill_id': bid,
                'customer_id': None,
                'customer_name': s.customer_name or 'Walk-in Customer',
                'date': s.date,
                'items': [],
                'total_amount': Decimal('0.00'),
                'amount_paid': Decimal('0.00'),
                'balance_due': Decimal('0.00'),
                'status': 'unpaid',
            }
        line_total = (Decimal(str(s.quantity)) * Decimal(str(s.unit_price))) - Decimal(str(s.discount_amount or 0))
        orphan_bills_map[bid]['total_amount'] += line_total
        orphan_bills_map[bid]['items'].append({
            'id': s.id,
            'product_id': s.product_id,
            'product_name': s.product.name if s.product else '',
            'quantity': s.quantity,
            'unit_price': float(s.unit_price),
            'discount_amount': float(s.discount_amount or 0),
            'line_total': float(line_total),
        })

    for b in orphan_bills_map.values():
        b['balance_due'] = b['total_amount']
        all_bills.append({
            'bill_id': b['bill_id'],
            'customer_id': None,
            'customer_name': b['customer_name'],
            'date': b['date'],
            'items': b['items'],
            'total_amount': float(b['total_amount']),
            'amount_paid': 0.0,
            'balance_due': float(b['balance_due']),
            'status': 'unpaid',
        })

    all_bills.sort(key=lambda x: x['date'], reverse=True)
    return all_bills


def re_escape(s):
    import re
    return re.escape(s)
