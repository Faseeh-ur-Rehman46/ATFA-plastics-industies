from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Sum, F, FloatField, DecimalField, ExpressionWrapper
from django.db.models.functions import Coalesce
from decimal import Decimal, ROUND_HALF_UP
from .models import Category, Supplier, Product, Stock, Purchase, Sale, AuditLog, Notification, Voucher, Customer, CustomerPayment, WashingBatch, WashingBatchOutput

QTY_OUTPUT_FIELD = DecimalField(max_digits=14, decimal_places=3)
QTY_ZERO = Decimal('0.000')
MONEY_OUTPUT_FIELD = DecimalField(max_digits=18, decimal_places=2)
MONEY_ZERO = Decimal('0.00')

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True, allow_blank=False)
    password = serializers.CharField(write_only=True)
    staff_permissions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        write_only=True,
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role', 'staff_permissions']

    def validate_password(self, value):
        validate_password(value, self.instance)
        return value

    def validate_email(self, value):
        email = (value or '').strip()
        if not email:
            raise serializers.ValidationError('Email is required.')
        return email

    def create(self, validated_data):
        staff_permissions = validated_data.pop('staff_permissions', [])
        user = User.objects.create_user(**validated_data)
        user.set_staff_permissions(staff_permissions)
        user.save(update_fields=['staff_permissions'])
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True, allow_blank=False)
    password = serializers.CharField(required=True, allow_blank=False, write_only=True)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'



class VoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Voucher
        fields = '__all__'

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'


class StockSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)
    quantity_tons = serializers.SerializerMethodField(read_only=True)

    def get_quantity_tons(self, obj):
        return round(float(obj.quantity or 0) / 1000.0, 3)

    class Meta:
        model = Stock
        fields = ['id', 'quantity', 'quantity_tons', 'low_stock_threshold', 'is_low_stock', 'product']


class ProductSerializer(serializers.ModelSerializer):
    stock = StockSerializer(read_only=True)
    low_stock_threshold = serializers.DecimalField(max_digits=14, decimal_places=3, write_only=True, required=False, min_value=0)
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    image = serializers.ImageField(max_length=None, use_url=True, allow_null=True, required=False)
    average_purchase_cost = serializers.SerializerMethodField(read_only=True)
    has_cost_variation = serializers.SerializerMethodField(read_only=True)
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)
    formatted_stock = serializers.SerializerMethodField(read_only=True)

    def get_formatted_stock(self, obj):
        qty = float(getattr(obj.stock, 'quantity', 0) if hasattr(obj, 'stock') else 0)
        tons = qty / 1000.0
        return {
            'kg': qty,
            'tons': round(tons, 3),
            'display': f"{qty:,.2f} kg ({tons:,.3f} MT)"
        }

    def get_average_purchase_cost(self, obj):
        stats = obj.purchases.aggregate(
            total_qty=Coalesce(Sum('quantity'), QTY_ZERO, output_field=QTY_OUTPUT_FIELD),
            total_cost=Coalesce(Sum(ExpressionWrapper(F('quantity') * F('unit_cost'), output_field=MONEY_OUTPUT_FIELD)), MONEY_ZERO, output_field=MONEY_OUTPUT_FIELD),
        )
        qty = float(stats.get('total_qty') or 0)
        if qty <= 0:
            return None
        avg = float(stats.get('total_cost') or 0) / qty
        return round(avg, 2)

    def get_has_cost_variation(self, obj):
        return obj.purchases.values_list('unit_cost', flat=True).distinct().count() > 1

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, 'instance', None)

        discount_percent = attrs.get('discount_percent', instance.discount_percent if instance else Decimal('0'))
        if discount_percent is None:
            discount_percent = Decimal('0')
        discount_percent = Decimal(str(discount_percent))

        if discount_percent < 0 or discount_percent > 100:
            raise serializers.ValidationError({'discount_percent': 'Discount percent must be between 0 and 100.'})

        full_price = attrs.get('full_price')
        sale_price = attrs.get('sale_price')

        if full_price is None:
            if sale_price is not None and discount_percent == 0:
                full_price = sale_price
            elif sale_price is not None and discount_percent > 0:
                discounted_multiplier = (Decimal('100') - discount_percent) / Decimal('100')
                if discounted_multiplier > 0:
                    full_price = (Decimal(str(sale_price)) / discounted_multiplier).quantize(
                        Decimal('0.01'),
                        rounding=ROUND_HALF_UP,
                    )
                else:
                    full_price = sale_price
            elif instance:
                full_price = instance.full_price or instance.sale_price

        if full_price is not None:
            full_price = Decimal(str(full_price))
            discounted_multiplier = (Decimal('100') - discount_percent) / Decimal('100')
            attrs['full_price'] = full_price
            attrs['discount_percent'] = discount_percent
            attrs['sale_price'] = (full_price * discounted_multiplier).quantize(
                Decimal('0.01'),
                rounding=ROUND_HALF_UP,
            )

        return attrs

    def create(self, validated_data):
        low_stock_threshold = validated_data.pop('low_stock_threshold', 10)
        product = super().create(validated_data)
        Stock.objects.create(product=product, quantity=0, low_stock_threshold=low_stock_threshold)
        return product

    def update(self, instance, validated_data):
        low_stock_threshold = validated_data.pop('low_stock_threshold', None)
        product = super().update(instance, validated_data)
        if low_stock_threshold is not None:
            stock, _ = Stock.objects.get_or_create(product=product, defaults={'quantity': 0})
            stock.low_stock_threshold = low_stock_threshold
            stock.save(update_fields=['low_stock_threshold'])
        return product

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'description', 'unit', 'unit_display', 'material_type', 'formatted_stock',
            'price', 'sale_price', 'full_price', 'discount_percent', 'image',
            'category', 'category_name', 'supplier', 'supplier_name',
            'stock', 'low_stock_threshold', 'average_purchase_cost', 'has_cost_variation', 'created_at'
        ]


class PurchaseSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, 'instance', None)

        unit = attrs.get('unit', getattr(instance, 'unit', 'kg') if instance else 'kg')
        input_qty = attrs.get('input_quantity')
        qty = attrs.get('quantity')
        rate_per_unit = attrs.get('rate_per_unit')
        unit_cost = attrs.get('unit_cost')

        if input_qty is not None:
            input_qty_dec = Decimal(str(input_qty))
            attrs['input_quantity'] = input_qty_dec
            if unit == 'ton':
                attrs['quantity'] = input_qty_dec * Decimal('1000')
            else:
                attrs['quantity'] = input_qty_dec
        elif qty is not None:
            attrs['quantity'] = Decimal(str(qty))
            if unit == 'ton':
                attrs['input_quantity'] = attrs['quantity'] / Decimal('1000')
            else:
                attrs['input_quantity'] = attrs['quantity']

        if rate_per_unit is not None:
            rate_dec = Decimal(str(rate_per_unit))
            attrs['rate_per_unit'] = rate_dec
            if unit == 'ton':
                attrs['unit_cost'] = rate_dec / Decimal('1000')
            else:
                attrs['unit_cost'] = rate_dec
        elif unit_cost is not None:
            u_cost_dec = Decimal(str(unit_cost))
            attrs['unit_cost'] = u_cost_dec
            if unit == 'ton':
                attrs['rate_per_unit'] = u_cost_dec * Decimal('1000')
            else:
                attrs['rate_per_unit'] = u_cost_dec

        discount_percent = attrs.get(
            'discount_percent',
            instance.discount_percent if instance else Decimal('0'),
        )
        if discount_percent is None:
            discount_percent = Decimal('0')
        discount_percent = Decimal(str(discount_percent))

        if discount_percent < 0 or discount_percent > 100:
            raise serializers.ValidationError({'discount_percent': 'Discount percent must be between 0 and 100.'})

        full_selling_price = attrs.get('full_selling_price')
        incoming_selling_price = attrs.get('selling_price')

        if full_selling_price is None:
            if incoming_selling_price is not None and discount_percent == 0:
                full_selling_price = incoming_selling_price
            elif incoming_selling_price is not None and discount_percent > 0:
                discounted_multiplier = (Decimal('100') - discount_percent) / Decimal('100')
                if discounted_multiplier > 0:
                    full_selling_price = (Decimal(str(incoming_selling_price)) / discounted_multiplier).quantize(
                        Decimal('0.01'),
                        rounding=ROUND_HALF_UP,
                    )
                else:
                    full_selling_price = incoming_selling_price
            elif instance:
                full_selling_price = instance.full_selling_price or instance.selling_price

        if full_selling_price is not None:
            full_selling_price = Decimal(str(full_selling_price))
            discounted_multiplier = (Decimal('100') - discount_percent) / Decimal('100')
            effective_selling_price = (full_selling_price * discounted_multiplier).quantize(
                Decimal('0.01'),
                rounding=ROUND_HALF_UP,
            )
            attrs['full_selling_price'] = full_selling_price
            attrs['discount_percent'] = discount_percent
            attrs['selling_price'] = effective_selling_price

        return attrs

    class Meta:
        model = Purchase
        fields = '__all__'


class SaleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)
    full_unit_price = serializers.SerializerMethodField(read_only=True)

    def get_full_unit_price(self, obj):
        product = getattr(obj, 'product', None)
        if not product:
            return None
        full_price = float(getattr(product, 'full_price', 0) or 0)
        charged_price = float(getattr(obj, 'unit_price', 0) or 0)
        if full_price > charged_price:
            return round(full_price, 2)
        return None

    voucher_code = serializers.CharField(source='voucher.code', read_only=True)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, 'instance', None)
        unit = attrs.get('unit', getattr(instance, 'unit', 'kg') if instance else 'kg')
        input_qty = attrs.get('input_quantity')
        qty = attrs.get('quantity')
        rate_per_unit = attrs.get('rate_per_unit')
        unit_price = attrs.get('unit_price')

        if input_qty is not None:
            input_qty_dec = Decimal(str(input_qty))
            attrs['input_quantity'] = input_qty_dec
            if unit == 'ton':
                attrs['quantity'] = input_qty_dec * Decimal('1000')
            else:
                attrs['quantity'] = input_qty_dec
        elif qty is not None:
            attrs['quantity'] = Decimal(str(qty))
            if unit == 'ton':
                attrs['input_quantity'] = attrs['quantity'] / Decimal('1000')
            else:
                attrs['input_quantity'] = attrs['quantity']

        if rate_per_unit is not None:
            rate_dec = Decimal(str(rate_per_unit))
            attrs['rate_per_unit'] = rate_dec
            if unit == 'ton':
                attrs['unit_price'] = rate_dec / Decimal('1000')
            else:
                attrs['unit_price'] = rate_dec
        elif unit_price is not None:
            u_price_dec = Decimal(str(unit_price))
            attrs['unit_price'] = u_price_dec
            if unit == 'ton':
                attrs['rate_per_unit'] = u_price_dec * Decimal('1000')
            else:
                attrs['rate_per_unit'] = u_price_dec

        return attrs

    class Meta:
        model = Sale
        fields = '__all__'

class CustomTokenSerializer(serializers.Serializer):
    """Used by the /auth/me/ endpoint to return user info."""
    username = serializers.CharField(source='user.username')
    role     = serializers.CharField(source='user.role')
    id       = serializers.IntegerField(source='user.id')


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    
    def get_username(self, obj):
        return obj.user.username if obj.user else '—'

    class Meta:
        model = AuditLog
        fields = ['id', 'timestamp', 'username', 'action', 'model_name', 'object_id', 'object_repr']


class NotificationSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True, default=None)

    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'is_read', 'created_at', 'product', 'product_name']


class CustomerPaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default='')

    class Meta:
        model = CustomerPayment
        fields = ['id', 'customer', 'customer_name', 'bill_id', 'amount', 'payment_method', 'reference', 'notes', 'date', 'created_by', 'created_by_username', 'created_at']


class CustomerSerializer(serializers.ModelSerializer):
    total_billed = serializers.SerializerMethodField(read_only=True)
    total_paid = serializers.SerializerMethodField(read_only=True)
    current_balance = serializers.SerializerMethodField(read_only=True)
    unpaid_bills_count = serializers.SerializerMethodField(read_only=True)

    def get_total_billed(self, obj):
        from .ledger import get_bill_summary_for_customer
        return get_bill_summary_for_customer(obj)['total_billed']

    def get_total_paid(self, obj):
        from .ledger import get_bill_summary_for_customer
        return get_bill_summary_for_customer(obj)['total_paid']

    def get_current_balance(self, obj):
        from .ledger import get_bill_summary_for_customer
        return get_bill_summary_for_customer(obj)['current_balance']

    def get_unpaid_bills_count(self, obj):
        from .ledger import get_bill_summary_for_customer
        return get_bill_summary_for_customer(obj)['unpaid_bills_count']

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'email', 'address', 'opening_balance',
            'credit_limit', 'notes', 'created_at', 'updated_at',
            'total_billed', 'total_paid', 'current_balance', 'unpaid_bills_count'
        ]


class WashingBatchOutputSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = WashingBatchOutput
        fields = ['id', 'product', 'product_name', 'product_sku', 'quantity']


class WashingBatchSerializer(serializers.ModelSerializer):
    outputs = WashingBatchOutputSerializer(many=True, required=False)
    raw_product_name = serializers.CharField(source='raw_product.name', read_only=True)
    raw_product_sku = serializers.CharField(source='raw_product.sku', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = WashingBatch
        fields = [
            'id', 'batch_id', 'raw_product', 'raw_product_name', 'raw_product_sku',
            'raw_quantity', 'ready_quantity', 'waste_quantity', 'notes',
            'created_at', 'created_by', 'created_by_username', 'outputs'
        ]
        read_only_fields = ['batch_id', 'ready_quantity', 'waste_quantity', 'created_at', 'created_by']

