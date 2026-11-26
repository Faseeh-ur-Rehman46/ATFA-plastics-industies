import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import API from '../api/axios';
import ScanInput from '../components/ScanInput';

export default function Sales() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loadedProducts, setLoadedProducts] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [scanMessage, setScanMessage] = useState('');
    const [scanClearSignal, setScanClearSignal] = useState(0);
    const [cartItems, setCartItems] = useState([]);
    const [manualSearch, setManualSearch] = useState('');
    const [showManualDropdown, setShowManualDropdown] = useState(false);
    const [vouchers, setVouchers] = useState([]);
    const [loadedVouchers, setLoadedVouchers] = useState(false);
    const [voucherCode, setVoucherCode] = useState('');
    const [showVoucherDropdown, setShowVoucherDropdown] = useState(false);
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [voucherError, setVoucherError] = useState('');
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [paymentTerm, setPaymentTerm] = useState('credit'); // 'credit', 'partial', 'full'
    const [initialPaid, setInitialPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentRef, setPaymentRef] = useState('');
    const formatMoney = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const ensureProductsLoaded = async () => {
        if (loadedProducts) return products;
        const res = await API.get('products/', { params: { material_type: 'final_product' } });
        setProducts(res.data?.results ?? res.data ?? []);
        setLoadedProducts(true);
        return res.data?.results ?? res.data ?? [];
    };

    const ensureVouchersLoaded = async () => {
        if (loadedVouchers) return vouchers;
        const res = await API.get('vouchers/');
        const loaded = res.data?.results ?? res.data ?? [];
        setVouchers(loaded);
        setLoadedVouchers(true);
        return loaded;
    };

    useEffect(() => {
        API.get('customers/')
            .then(r => setCustomers(r.data?.results ?? r.data ?? []))
            .catch(() => {});
    }, []);

    const normalizeCode = (raw) => String(raw || '').trim().toUpperCase();

    const findProductLocally = (raw, sourceProducts) => {
        const q = normalizeCode(raw);
        if (!q) return null;
        return sourceProducts.find(p => normalizeCode(p.sku) === q) || null;
    };

    const upsertCartItem = (product, quantityDelta = 1) => {
        const availableStockKg = Number(product?.stock?.quantity || 0);
        if (availableStockKg <= 0) {
            setError(`${product.name} stock is 0.`);
            return false;
        }

        const pUnit = product.unit || 'kg';
        const isTon = pUnit === 'ton';
        const initialUnit = isTon ? 'ton' : 'kg';
        const initialPrice = isTon
            ? Number(product.sale_price || 0) * 1000
            : Number(product.sale_price || 0);
        const initialFullPrice = isTon
            ? Number(product.full_price || product.sale_price || 0) * 1000
            : Number(product.full_price || product.sale_price || 0);

        const existingItem = cartItems.find(it => String(it.product) === String(product.id));
        const currentReqKg = existingItem
            ? (existingItem.unit === 'ton' ? Number(existingItem.quantity) * 1000 : Number(existingItem.quantity))
            : 0;
        const addKg = isTon ? Number(quantityDelta) * 1000 : Number(quantityDelta);
        if (currentReqKg + addKg > availableStockKg) {
            setError(`Cannot add more ${product.name}. Available stock: ${availableStockKg.toLocaleString()} KG (${(availableStockKg/1000).toFixed(3)} MT).`);
            return false;
        }

        setError('');
        setCartItems(prev => {
            const idx = prev.findIndex(it => String(it.product) === String(product.id));
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], quantity: Number((next[idx].quantity + quantityDelta).toFixed(3)) };
                return next;
            }
            return [
                ...prev,
                {
                    product: product.id,
                    product_name: product.name,
                    sku: product.sku,
                    unit: initialUnit,
                    unit_price: initialPrice,
                    full_price: initialFullPrice,
                    costing_method: 'average',
                    show_costing_method: Boolean(product.has_cost_variation),
                    quantity: quantityDelta,
                    available_stock: availableStockKg,
                    unit_cost: null,
                    line_cost: null,
                    line_total: null,
                    cost_error: '',
                },
            ];
        });
        return true;
    };

    const toggleCartItemUnit = (productId) => {
        setCartItems(prev => prev.map(it => {
            if (String(it.product) !== String(productId)) return it;
            const toTon = it.unit !== 'ton';
            const newQty = toTon
                ? Number((Number(it.quantity || 0) / 1000).toFixed(3))
                : Number((Number(it.quantity || 0) * 1000).toFixed(2));
            const newPrice = toTon
                ? Number((Number(it.unit_price || 0) * 1000).toFixed(2))
                : Number((Number(it.unit_price || 0) / 1000).toFixed(2));
            const newFull = toTon
                ? Number((Number(it.full_price || 0) * 1000).toFixed(2))
                : Number((Number(it.full_price || 0) / 1000).toFixed(2));
            return {
                ...it,
                unit: toTon ? 'ton' : 'kg',
                quantity: newQty || (toTon ? 0.001 : 1),
                unit_price: newPrice,
                full_price: newFull,
            };
        }));
    };


    const validateVoucherForCurrentCart = (voucher) => {
        if (!voucher) return 'Invalid or inactive voucher.';
        const subtotal = cartItems.reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
        if (subtotal < Number(voucher.min_spend)) {
            return `Minimum spend of Rs. ${formatMoney(voucher.min_spend)} required.`;
        }
        if (new Date(voucher.expiry_date) < new Date()) {
            return 'Voucher has expired.';
        }
        if (voucher.used_count >= voucher.limit_usage) {
            return 'Voucher usage limit reached.';
        }
        return '';
    };

    const applyVoucherFromOption = (voucher) => {
        setVoucherCode(voucher?.code || '');
        setShowVoucherDropdown(false);
        const validationError = validateVoucherForCurrentCart(voucher);
        if (validationError) {
            setVoucherError(validationError);
            setAppliedVoucher(null);
            return;
        }
        setAppliedVoucher(voucher);
        setVoucherError('');
    };

    const handleApplyVoucher = async () => {
        if (!voucherCode.trim()) {
            setAppliedVoucher(null);
            setVoucherError('');
            return;
        }
        try {
            const sourceVouchers = await ensureVouchersLoaded();
            const voucher = sourceVouchers.find(v => v.code.toUpperCase() === voucherCode.trim().toUpperCase() && v.is_active && !v.is_deleted);
            const validationError = validateVoucherForCurrentCart(voucher);
            if (validationError) {
                setVoucherError(validationError);
                setAppliedVoucher(null);
                return;
            }
            setAppliedVoucher(voucher);
            setVoucherError('');
            setShowVoucherDropdown(false);
        } catch {
            setVoucherError('Failed to validate voucher.');
        }
    };

    const updateCartQty = (productId, qty) => {
        const requestedQty = Math.max(0.001, Number(qty || 0));
        setCartItems(prev => prev.map(it => {
            if (String(it.product) !== String(productId)) return it;
            const availableKg = Number(it.available_stock || 0);
            const reqKg = it.unit === 'ton' ? requestedQty * 1000 : requestedQty;
            if (availableKg <= 0) {
                setError(`${it.product_name} stock is 0.`);
                return { ...it, quantity: it.unit === 'ton' ? 0.001 : 1 };
            }
            if (reqKg > availableKg) {
                const maxVal = it.unit === 'ton' ? Number((availableKg / 1000).toFixed(3)) : availableKg;
                setError(`Only ${availableKg.toLocaleString()} KG (${(availableKg/1000).toFixed(3)} MT) available for ${it.product_name}.`);
                return { ...it, quantity: maxVal };
            }
            setError('');
            return { ...it, quantity: requestedQty };
        }));
    };

    const removeCartItem = (productId) => {
        setCartItems(prev => prev.filter(it => String(it.product) !== String(productId)));
    };

    const updateCartCostingMethod = (productId, method) => {
        setCartItems(prev => prev.map(it => String(it.product) === String(productId) ? { ...it, costing_method: method } : it));
    };

    const clearCart = () => {
        setCartItems([]);
        setScanMessage('');
        setError('');
        setMessage('');
        setScanClearSignal(prev => prev + 1);
    };

    const cartSubtotal = useMemo(() => {
        return cartItems.reduce((acc, it) => acc + (Number(it.unit_price || 0) * Number(it.quantity || 0)), 0);
    }, [cartItems]);

    const cartDiscount = useMemo(() => {
        if (!appliedVoucher) return 0;
        if (appliedVoucher.voucher_type === 'percentage') {
            return (cartSubtotal * Number(appliedVoucher.discount_value)) / 100;
        }
        return Math.min(Number(appliedVoucher.discount_value), cartSubtotal);
    }, [appliedVoucher, cartSubtotal]);

    const cartFinalTotal = Math.max(0, cartSubtotal - cartDiscount);

    useEffect(() => {
        if (!cartItems.length) return;
        let cancelled = false;

        const fetchPreviews = async () => {
            const previewRequests = cartItems.map(async (it) => {
                try {
                    const reqKg = it.unit === 'ton' ? Number(it.quantity) * 1000 : Number(it.quantity);
                    const res = await API.post('sales/cost-preview/', {
                        product: it.product,
                        quantity: reqKg,
                        costing_method: it.costing_method || 'average',
                    });
                    const baseUnitPrice = Number(res.data?.unit_selling_price ?? res.data?.selling_price ?? 0);
                    const calculatedUnitPrice = it.unit === 'ton' ? baseUnitPrice * 1000 : baseUnitPrice;
                    const finalUnitPrice = it.unit_price != null ? it.unit_price : calculatedUnitPrice;
                    const lineTotal = Number((finalUnitPrice * Number(it.quantity)).toFixed(2));
                    return {
                        product: it.product,
                        has_cost_variation: Boolean(res.data?.has_cost_variation),
                        unit_price: finalUnitPrice,
                        line_total: lineTotal,
                        unit_cost: Number(res.data?.unit_cost || 0),
                        line_cost: Number(res.data?.line_cost || 0),
                        cost_error: '',
                    };
                } catch (err) {
                    const fallbackTotal = Number((Number(it.unit_price || 0) * Number(it.quantity || 0)).toFixed(2));
                    return {
                        product: it.product,
                        has_cost_variation: false,
                        unit_price: it.unit_price ?? 0,
                        line_total: fallbackTotal,
                        unit_cost: null,
                        line_cost: null,
                        cost_error: err.response?.data?.detail || 'Unable to preview cost',
                    };
                }
            });

            const previews = await Promise.all(previewRequests);
            if (cancelled) return;
            const previewMap = new Map(previews.map(p => [String(p.product), p]));
            setCartItems(prev => prev.map(it => {
                const preview = previewMap.get(String(it.product));
                if (!preview) return it;
                return {
                    ...it,
                    show_costing_method: preview.has_cost_variation,
                    costing_method: preview.has_cost_variation ? (it.costing_method || 'average') : 'average',
                    unit_price: preview.unit_price,
                    line_total: preview.line_total,
                    unit_cost: preview.unit_cost,
                    line_cost: preview.line_cost,
                    cost_error: preview.cost_error,
                };
            }));
        };

        fetchPreviews();
        return () => { cancelled = true; };
    }, [cartItems]); // run when product/qty/method changes

    const filteredManualProducts = useMemo(() => {
        const q = manualSearch.trim().toLowerCase();
        if (!q) return products.slice(0, 12);
        return products
            .filter(p =>
                p.name.toLowerCase().includes(q) ||
                String(p.sku || '').toLowerCase().includes(q)
            )
            .slice(0, 12);
    }, [manualSearch, products]);

    const filteredVoucherOptions = useMemo(() => {
        const activeVouchers = vouchers.filter(v => v.is_active && !v.is_deleted && new Date(v.expiry_date) >= new Date());
        const q = voucherCode.trim().toLowerCase();
        if (!q) return activeVouchers.slice(0, 12);
        return activeVouchers
            .filter(v => String(v.code || '').toLowerCase().includes(q))
            .slice(0, 12);
    }, [vouchers, voucherCode]);

    const handleSalesScan = async (raw) => {
        setError('');
        setMessage('');
        setScanMessage('');
        const q = String(raw || '').trim();
        if (!q) return;

        const sourceProducts = await ensureProductsLoaded();
        try {
            const res = await API.get(`products/scan/?q=${encodeURIComponent(q)}`);
            const product = res.data;
            const added = upsertCartItem(product, 1);
            if (added) {
                setScanMessage(`Scanned: ${product.name} (${product.sku})`);
            }
            return;
        } catch {
            const local = findProductLocally(q, sourceProducts);
            if (local) {
                const added = upsertCartItem(local, 1);
                if (added) {
                    setScanMessage(`Scanned (local match): ${local.name} (${local.sku})`);
                }
                return;
            }
        }
        setError('No product matched this code.');
    };

    const manualAddProduct = (product) => {
        setError('');
        const added = upsertCartItem(product, 1);
        if (added) {
            setManualSearch('');
            setShowManualDropdown(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!customerName.trim()) return setError('Customer name is required.');
        if (!cartItems.length) return setError('Add at least one product to the sale.');

        setLoading(true);
        try {
            const paidNum = paymentTerm === 'credit' ? 0 : paymentTerm === 'full' ? cartFinalTotal : Number(initialPaid || 0);
            const payload = {
                customer_name: customerName.trim(),
                customer_id: selectedCustomer?.id || null,
                notes,
                voucher_code: appliedVoucher?.code || '',
                initial_payment: paidNum,
                payment_method: paymentMethod,
                payment_reference: paymentRef,
                items: cartItems.map(it => ({
                    product: it.product,
                    unit: it.unit || 'kg',
                    input_quantity: Number(it.quantity),
                    rate_per_unit: Number(it.unit_price),
                    quantity: it.unit === 'ton' ? Number(it.quantity) * 1000 : Number(it.quantity),
                    costing_method: it.costing_method || 'average',
                })),
            };
            const res = await API.post('sales/bulk-create/', payload);
            const createdSales = res.data?.sales || [];
            const saleIds = createdSales.map(s => s.id);

            setMessage(`Sale recorded with ${createdSales.length} item(s). Downloading invoice...`);
            setCustomerName('');
            setSelectedCustomer(null);
            setPaymentTerm('credit');
            setInitialPaid('');
            setPaymentRef('');
            setNotes('');
            setVoucherCode('');
            setAppliedVoucher(null);
            setCartItems([]);
            setScanMessage('');
            setScanClearSignal(prev => prev + 1);

            if (saleIds.length > 0) {
                const filename = `invoice_sale_items_${saleIds.length}.pdf`;
                try {
                    const res = await API.post('sales/invoice-selected/', { sale_ids: saleIds });
                    const jsonData = res.data;
                    const binaryString = window.atob(jsonData.pdf_64);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const blobData = new Blob([bytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blobData);
                    const link = document.createElement('a');
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.href = url;
                    link.download = filename;
                    link.click();
                    setTimeout(() => {
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }, 1000);
                } catch (invoiceErr) {
                    console.error('Invoice download error:', invoiceErr);
                    // If response is a blob (error from PDF endpoint), try to read it as text
                    let errorDetail = 'Invoice generation failed';
                    if (invoiceErr.response?.data instanceof Blob) {
                        try {
                            const text = await invoiceErr.response.data.text();
                            const errorData = JSON.parse(text);
                            errorDetail = errorData.detail || errorDetail;
                        } catch {
                            // Failed to parse error blob, use default message
                        }
                    } else if (invoiceErr.response?.data?.detail) {
                        errorDetail = invoiceErr.response.data.detail;
                    }
                    setMessage(`Sale recorded successfully! (${errorDetail} - please try from Sales History)`);
                }
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Error recording sale');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div style={{ padding: '28px 24px' }}>
                <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#fff' }}>Sales Cart</h2>
                        <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>Scan or search products, build cart, and checkout in one invoice</p>
                    </div>
                    <button type="button" style={styles.secondaryBtn} onClick={() => navigate('/sales-history')}>
                        Sales History
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                    <div>
                        <div style={styles.card}>
                            <div style={styles.cardTitle}>Checkout</div>
                            {message && <div style={styles.success}>✅ {message}</div>}
                            {error && <div style={styles.error}>⚠️ {error}</div>}

                        <ScanInput
                            label="Scan Product"
                            placeholder="Scan barcode/QR or type code"
                            onScan={handleSalesScan}
                            clearSignal={scanClearSignal}
                            clearOnScan
                        />
                        {scanMessage && <div style={styles.scanInfo}>ℹ️ {scanMessage} — input auto-cleared for next scan.</div>}

                            <form onSubmit={handleSubmit}>
                            <Field label="Customer Account *">
                                <div style={{ display: 'flex', gap: 8, marginBottom: selectedCustomer ? 6 : 0 }}>
                                    <input
                                        style={{ ...styles.input, flex: 1 }}
                                        value={customerName}
                                        list="existing-customers-list"
                                        onChange={e => {
                                            const val = e.target.value;
                                            setCustomerName(val);
                                            const match = customers.find(c => c.name.toLowerCase() === val.trim().toLowerCase());
                                            setSelectedCustomer(match || null);
                                        }}
                                        placeholder="Type or select customer name"
                                        required
                                    />
                                    <datalist id="existing-customers-list">
                                        {customers.map(c => (
                                            <option key={c.id} value={c.name}>
                                                Balance: Rs. {formatMoney(c.current_balance)}
                                            </option>
                                        ))}
                                    </datalist>
                                </div>
                                {selectedCustomer && (
                                    <div style={{
                                        fontSize: 12, padding: '4px 10px', borderRadius: 6,
                                        background: Number(selectedCustomer.current_balance) > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                        color: Number(selectedCustomer.current_balance) > 0 ? '#f87171' : '#4ade80',
                                        border: `1px solid ${Number(selectedCustomer.current_balance) > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                    }}>
                                        <span>{Number(selectedCustomer.current_balance) > 0 ? '⚠️' : '✓'}</span>
                                        <span>Current Account Balance: <b>Rs. {formatMoney(selectedCustomer.current_balance)}</b></span>
                                    </div>
                                )}
                            </Field>

                            <Field label="Search Product Manually">
                                <input
                                    style={styles.input}
                                    value={manualSearch}
                                    onChange={async e => {
                                        setManualSearch(e.target.value);
                                        if (!loadedProducts) await ensureProductsLoaded();
                                    }}
                                    onFocus={async () => {
                                        setShowManualDropdown(true);
                                        if (!loadedProducts) await ensureProductsLoaded();
                                    }}
                                    onBlur={() => setTimeout(() => setShowManualDropdown(false), 120)}
                                    placeholder="Type product name or SKU"
                                />
                                {showManualDropdown && filteredManualProducts.length > 0 && (
                                    <div style={styles.searchPanel}>
                                        {filteredManualProducts.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                style={styles.searchItem}
                                                onClick={() => manualAddProduct(p)}
                                            >
                                                <span>{p.name}</span>
                                                        <span style={{ color: '#94A3B8', fontFamily: 'monospace' }}>{p.sku}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </Field>

                                                        <Field label="Voucher Code">
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        style={styles.input}
                                        value={voucherCode}
                                        onChange={async e => {
                                            setVoucherCode(e.target.value);
                                            if (!loadedVouchers) await ensureVouchersLoaded();
                                            setShowVoucherDropdown(true);
                                        }}
                                        onFocus={async () => {
                                            setShowVoucherDropdown(true);
                                            if (!loadedVouchers) await ensureVouchersLoaded();
                                        }}
                                        onBlur={() => setTimeout(() => setShowVoucherDropdown(false), 120)}
                                        placeholder="Enter voucher code"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleApplyVoucher}
                                        style={styles.secondaryBtn}
                                    >
                                        Apply
                                    </button>
                                </div>
                                {showVoucherDropdown && filteredVoucherOptions.length > 0 && (
                                    <div style={styles.searchPanel}>
                                        {filteredVoucherOptions.map(v => (
                                            <button
                                                key={v.id}
                                                type="button"
                                                style={styles.searchItem}
                                                onClick={() => applyVoucherFromOption(v)}
                                            >
                                                <span>{v.code}</span>
                                                <span style={{ color: '#94A3B8', fontSize: 12 }}>
                                                    {v.voucher_type === 'percentage' ? `${v.discount_value}%` : `Rs. ${formatMoney(v.discount_value)}`}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {voucherError && <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>{voucherError}</div>}
                                {appliedVoucher && <div style={{ color: '#86efac', fontSize: 12, marginTop: 4 }}>
                                    Voucher applied: {appliedVoucher.voucher_type === 'percentage' ? `${appliedVoucher.discount_value}% off` : `Rs. ${formatMoney(appliedVoucher.discount_value)} off`}
                                </div>}
                            </Field>

                            <Field label="Notes">
                                <input
                                    style={styles.input}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Optional note for this sale"
                                />
                            </Field>

                            <div style={{ ...styles.card, padding: 16, marginBottom: 14, backgroundColor: '#F8FAFC' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ color: '#64748B' }}>Subtotal</span>
                                    <span style={{ color: '#fff' }}>Rs. {formatMoney(cartSubtotal)}</span>
                                </div>
                                {cartDiscount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ color: '#fca5a5' }}>Discount</span>
                                        <span style={{ color: '#fca5a5' }}>- Rs. {formatMoney(cartDiscount)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #E5EAF2' }}>
                                    <span style={{ color: '#fff', fontWeight: 700 }}>Total</span>
                                    <span style={{ fontWeight: 700, color: '#16A34A', fontSize: 20 }}>
                                        Rs. {formatMoney(cartFinalTotal)}
                                    </span>
                                </div>
                            </div>

                            {/* Payment Terms (Income in Parts) */}
                            <div style={{ ...styles.card, padding: 14, marginBottom: 14, backgroundColor: '#F8FAFC', border: '1px solid #E5EAF2' }}>
                                <div style={{ color: '#1E6BFF', fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>💵</span> Payment Terms (Income in Parts)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                                    {[
                                        { id: 'credit', label: '📒 Khaata (Pay Later)' },
                                        { id: 'partial', label: '💵 Part Payment' },
                                        { id: 'full', label: '✅ Full Payment' },
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => {
                                                setPaymentTerm(t.id);
                                                if (t.id === 'full') setInitialPaid(cartFinalTotal);
                                                else if (t.id === 'credit') setInitialPaid(0);
                                                else setInitialPaid('');
                                            }}
                                            style={{
                                                background: paymentTerm === t.id ? '#EEF4FF' : '#FFFFFF',
                                                border: `1px solid ${paymentTerm === t.id ? '#1E6BFF' : '#E5EAF2'}`,
                                                color: paymentTerm === t.id ? '#1E6BFF' : '#94a3b8',
                                                padding: '7px 4px',
                                                borderRadius: 6,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                {paymentTerm === 'partial' && (
                                    <div style={{ marginBottom: 10 }}>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>Advance Payment Received (Rs.)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max={cartFinalTotal}
                                            placeholder="Enter advance amount"
                                            value={initialPaid}
                                            onChange={e => setInitialPaid(e.target.value)}
                                            style={{ ...styles.input, padding: '7px 10px', fontSize: 13 }}
                                        />
                                    </div>
                                )}

                                {(paymentTerm === 'full' || (paymentTerm === 'partial' && Number(initialPaid) > 0)) && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>Payment Method</label>
                                            <select
                                                value={paymentMethod}
                                                onChange={e => setPaymentMethod(e.target.value)}
                                                style={{ ...styles.input, padding: '7px 8px', fontSize: 12 }}
                                            >
                                                <option value="cash">Cash in Hand</option>
                                                <option value="bank">Bank Transfer</option>
                                                <option value="cheque">Cheque</option>
                                                <option value="online">Online / Mobile</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>Reference / Slip #</label>
                                            <input
                                                type="text"
                                                placeholder="Optional slip #"
                                                value={paymentRef}
                                                onChange={e => setPaymentRef(e.target.value)}
                                                style={{ ...styles.input, padding: '7px 8px', fontSize: 12 }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8, paddingTop: 8, borderTop: '1px solid #E5EAF2' }}>
                                    <span style={{ color: '#94a3b8' }}>Remaining Due on this Bill:</span>
                                    <span style={{ color: (cartFinalTotal - Number(initialPaid || 0)) > 0 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                                        Rs. {formatMoney(Math.max(0, cartFinalTotal - (paymentTerm === 'full' ? cartFinalTotal : Number(initialPaid || 0))))}
                                    </span>
                                </div>
                            </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" style={loading ? styles.btnDisabled : styles.btn} disabled={loading}>
                                        {loading ? 'Saving...' : '+ Complete Sale'}
                                    </button>
                                    <button type="button" style={styles.cancelBtn} onClick={clearCart}>
                                        Clear Cart
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardTitle}>Current Cart ({cartItems.length} items)</div>
                        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                            <table style={styles.table}>
                            <thead>
                                <tr style={{ backgroundColor: '#F8FAFC' }}>
                                    {['Product', 'SKU', 'Weight / Qty', 'Unit', 'Method', 'Selling Rate', 'Line Total', 'Available Stock', ''].map(h => (
                                        <th key={h} style={styles.th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {cartItems.length === 0 ? (
                                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: 30, color: '#94A3B8' }}>No products in cart yet</td></tr>
                                ) : cartItems.map(item => (
                                    <tr key={item.product} style={{ borderBottom: '1px solid #E5EAF2' }}>
                                        <td style={styles.td}>{item.product_name}</td>
                                        <td style={styles.td}><code>{item.sku}</code></td>
                                        <td style={styles.td}>
                                            <input
                                                type="number"
                                                min={item.unit === 'ton' ? '0.001' : '0.01'}
                                                step={item.unit === 'ton' ? '0.001' : '0.01'}
                                                value={item.quantity}
                                                onChange={e => updateCartQty(item.product, e.target.value)}
                                                style={{ ...styles.input, width: 85, padding: '6px 8px' }}
                                            />
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                type="button"
                                                onClick={() => toggleCartItemUnit(item.product)}
                                                title="Click to switch between Metric Tons and Kilograms"
                                                style={{
                                                    background: item.unit === 'ton' ? '#EEF4FF' : '#F8FAFC',
                                                    border: `1px solid ${item.unit === 'ton' ? '#1E6BFF' : '#E5EAF2'}`,
                                                    color: item.unit === 'ton' ? '#1E6BFF' : '#94a3b8',
                                                    borderRadius: 6,
                                                    padding: '4px 8px',
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {item.unit === 'ton' ? '🚛 MT (Ton)' : '⚖️ KG'}
                                            </button>
                                        </td>
                                        <td style={styles.td}>
                                            {item.show_costing_method ? (
                                                <select
                                                    style={{ ...styles.input, width: 100, padding: '6px 8px' }}
                                                    value={item.costing_method || 'average'}
                                                    onChange={e => updateCartCostingMethod(item.product, e.target.value)}
                                                >
                                                    <option value="average">Average</option>
                                                    <option value="fifo">FIFO</option>
                                                </select>
                                            ) : (
                                                <span style={{ color: '#94A3B8', fontSize: 12 }}>Average</span>
                                            )}
                                        </td>
                                        <td style={styles.td}>
                                            {Number(item.full_price || 0) > Number(item.unit_price || 0) ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    <span style={{ color: '#94A3B8', fontSize: 11, textDecoration: 'line-through' }}>
                                                        Rs. {formatMoney(item.full_price)}
                                                    </span>
                                                    <span style={{ color: '#86efac', fontWeight: 700 }}>
                                                        Rs. {formatMoney(item.unit_price)} <span style={{ fontSize: 10, color: '#94a3b8' }}>/{item.unit === 'ton' ? 'Ton' : 'KG'}</span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#fff', fontWeight: 600 }}>
                                                    Rs. {formatMoney(item.unit_price)} <span style={{ fontSize: 10, color: '#94a3b8' }}>/{item.unit === 'ton' ? 'Ton' : 'KG'}</span>
                                                </span>
                                            )}
                                        </td>
                                        <td style={styles.td}>
                                            {item.line_total == null
                                                ? <span style={{ color: '#fca5a5', fontSize: 12 }}>{item.cost_error || '—'}</span>
                                                : <span style={{ fontWeight: 700, color: '#fff' }}>Rs. {formatMoney(item.line_total)}</span>
                                            }
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ fontSize: 12, color: '#475569' }}>
                                                {Number(item.available_stock).toLocaleString()} KG
                                            </div>
                                            <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                                ({(Number(item.available_stock)/1000).toFixed(3)} MT)
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <button type="button" style={styles.removeBtn} onClick={() => removeCartItem(item.product)}>
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#475569' }}>{label}</label>
            {children}
        </div>
    );
}

const styles = {
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24, border: '1px solid #E5EAF2' },
    cardTitle: { fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #E5EAF2' },
    success: { backgroundColor: '#F0FDF4', color: '#16A34A', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14, border: '1px solid #BBF7D0' },
    error: { backgroundColor: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14, border: '1px solid #FECACA' },
    scanInfo: { backgroundColor: '#EEF4FF', color: '#1E6BFF', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, border: '1px solid #C7D9FE' },
    input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E5EAF2', fontSize: 14, boxSizing: 'border-box', outline: 'none', backgroundColor: '#F8FAFC', color: '#fff' },
    totalPreview: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: 8, marginBottom: 14, border: '1px solid #E5EAF2' },
    btn: { flex: 1, padding: '11px', backgroundColor: '#16A34A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnDisabled: { flex: 1, padding: '11px', backgroundColor: '#94A3B8', color: 'white', border: 'none', borderRadius: 8, cursor: 'not-allowed', fontWeight: 600, fontSize: 14 },
    secondaryBtn: { padding: '10px 16px', background: '#F8FAFC', color: '#475569', border: '1px solid #E5EAF2', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    cancelBtn: { padding: '11px 14px', background: '#F8FAFC', color: '#475569', border: '1px solid #E5EAF2', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    removeBtn: { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
    searchPanel: { marginTop: 8, border: '1px solid #E5EAF2', borderRadius: 8, maxHeight: 220, overflowY: 'auto', background: '#F8FAFC' },
    searchItem: { width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 8, border: 'none', borderBottom: '1px solid #E5EAF2', padding: '9px 10px', background: '#F8FAFC', cursor: 'pointer', color: '#fff' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
    th: { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    td: { padding: '12px 14px', color: '#0F172A', fontSize: 14 },
};
