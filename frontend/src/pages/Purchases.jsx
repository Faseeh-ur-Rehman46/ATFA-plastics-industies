import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import API from '../api/axios';
import ScanInput from '../components/ScanInput';
import FormModal from '../components/FormModal';
import { modalActionStyles } from '../components/modalActionStyles';
import { useAuth } from '../context/AuthContext';

const defaultForm = {
    product: '',
    unit: 'kg', // 'kg' or 'ton'
    input_quantity: '',
    quantity: '',
    rate_per_unit: '',
    unit_cost: '',
    full_selling_price: '',
    discount_percent: '0',
    selling_price: '',
    notes: '',
};

const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

export default function Purchases() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { can } = useAuth();
    const [purchases, setPurchases] = useState([]);
    const [products, setProducts] = useState([]);
    const [purchaseAuditHistory, setPurchaseAuditHistory] = useState([]);
    const [purchaseAuditLoading, setPurchaseAuditLoading] = useState(true);
    const [purchaseAuditError, setPurchaseAuditError] = useState('');
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [editPurchaseId, setEditPurchaseId] = useState(null);
    const [form, setForm] = useState(defaultForm);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [scanMessage, setScanMessage] = useState('');
    const [scanClearSignal, setScanClearSignal] = useState(0);

    const fetchData = () => {
        API.get('purchases/').then(r => setPurchases(r.data));
        API.get('products/', { params: { material_type: 'raw_material' } }).then(r => setProducts(r.data));
    };

    const fetchPurchaseAuditHistory = () => {
        if (!(can('audit.view') || can('purchases.manage'))) {
            setPurchaseAuditLoading(false);
            return;
        }
        setPurchaseAuditLoading(true);
        setPurchaseAuditError('');
        API.get('audit-logs/', {
            params: { action: 'UPDATE', model_name: 'Purchase' },
        })
            .then((res) => {
                setPurchaseAuditHistory(res.data?.results ?? res.data ?? []);
            })
            .catch((err) => {
                setPurchaseAuditError(err.response?.data?.detail || 'Failed to load purchase edit history.');
            })
            .finally(() => setPurchaseAuditLoading(false));
    };

    useEffect(() => {
        fetchData();
        fetchPurchaseAuditHistory();
    }, []);

    useEffect(() => {
        const full = toNumber(form.full_selling_price, 0);
        const discount = Math.min(100, Math.max(0, toNumber(form.discount_percent, 0)));
        const discounted = Number((full * (1 - (discount / 100))).toFixed(2));
        setForm(prev => ({ ...prev, selling_price: String(discounted) }));
    }, [form.full_selling_price, form.discount_percent]);

    useEffect(() => {
        if (searchParams.get('openModal') !== 'purchase') return;
        setForm(defaultForm);
        setEditPurchaseId(null);
        setError('');
        setScanMessage('');
        setShowPurchaseModal(true);
        const next = new URLSearchParams(searchParams);
        next.delete('openModal');
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    const openPurchaseModal = () => {
        setForm(defaultForm);
        setEditPurchaseId(null);
        setError('');
        setScanMessage('');
        setScanClearSignal(prev => prev + 1);
        setShowPurchaseModal(true);
    };

    const openEditPurchaseModal = (purchase) => {
        setEditPurchaseId(purchase.id);
        const pUnit = purchase.unit || 'kg';
        const inQty = purchase.input_quantity != null ? purchase.input_quantity : (pUnit === 'ton' ? purchase.quantity / 1000 : purchase.quantity);
        const inRate = purchase.rate_per_unit != null ? purchase.rate_per_unit : (pUnit === 'ton' ? purchase.unit_cost * 1000 : purchase.unit_cost);
        setForm({
            product: String(purchase.product),
            unit: pUnit,
            input_quantity: String(inQty ?? ''),
            rate_per_unit: String(inRate ?? ''),
            full_selling_price: String(purchase.full_selling_price ?? purchase.selling_price ?? ''),
            discount_percent: String(purchase.discount_percent ?? 0),
            selling_price: String(purchase.selling_price ?? ''),
            notes: purchase.notes ?? '',
        });
        setError('');
        setMessage('');
        setScanMessage('');
        setShowPurchaseModal(true);
    };

    const closePurchaseModal = () => {
        setShowPurchaseModal(false);
        setEditPurchaseId(null);
        setError('');
        setScanMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const inQty = toNumber(form.input_quantity);
            const inRate = toNumber(form.rate_per_unit);
            const baseQty = form.unit === 'ton' ? inQty * 1000 : inQty;
            const baseCost = form.unit === 'ton' ? inRate / 1000 : inRate;

            const payload = {
                product: form.product,
                unit: form.unit,
                input_quantity: inQty,
                quantity: baseQty,
                rate_per_unit: inRate,
                unit_cost: baseCost,
                full_selling_price: form.full_selling_price,
                discount_percent: String(Math.min(100, Math.max(0, toNumber(form.discount_percent, 0)))),
                selling_price: form.selling_price,
                notes: form.notes,
            };
            if (editPurchaseId) {
                await API.patch(`purchases/${editPurchaseId}/`, payload);
                setMessage('Purchase updated successfully! Stock has been adjusted.');
            } else {
                await API.post('purchases/', payload);
                setMessage('Purchase recorded successfully! Stock has been updated.');
            }
            setForm(defaultForm);
            setEditPurchaseId(null);
            setScanMessage('');
            setScanClearSignal(prev => prev + 1);
            setShowPurchaseModal(false);
            fetchData();
            fetchPurchaseAuditHistory();
        } catch (err) {
            setError(err.response?.data?.detail || (editPurchaseId ? 'Error updating purchase' : 'Error recording purchase'));
        } finally {
            setLoading(false);
        }
    };

    const handlePurchaseScan = async (raw) => {
        setError('');
        setMessage('');
        setScanMessage('');
        const q = String(raw || '').trim();
        if (!q) return;
        try {
            const res = await API.get(`products/scan/?q=${encodeURIComponent(q)}`);
            const product = res.data;
            setForm(prev => ({
                ...prev,
                product: String(product.id),
                unit_cost: product.price ?? '',
                full_selling_price: product.full_price ?? product.sale_price ?? '',
                discount_percent: '0',
            }));
            setScanMessage(`Scanned: ${product.name} (${product.sku}). Enter quantity and save.`);
        } catch (err) {
            setError(err.response?.data?.detail || 'No product matched this code.');
        }
    };

    return (
        <Layout>
            <div style={{ padding: '28px 24px' }}>
                <div style={{ marginBottom: 18 }}>
                    <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#fff' }}>Purchases</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>Record incoming stock from suppliers</p>
                </div>

                <div style={styles.actionRow}>
                    <button type="button" style={styles.actionBtnPrimary} onClick={openPurchaseModal}>Record New Purchase</button>
                    <button type="button" style={styles.actionBtn} onClick={() => navigate('/categories?openModal=category')}>Add New Category</button>
                    <button type="button" style={styles.actionBtn} onClick={() => navigate('/suppliers?openModal=supplier')}>Add New Supplier</button>
                </div>

                {message && <div style={styles.success}>✅ {message}</div>}

                <div style={styles.card}>
                    <div style={styles.cardTitle}>Purchase History ({purchases.length} records)</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={{ backgroundColor: '#F8FAFC' }}>
                                    {['Product', 'Weight / Quantity', 'Unit Rate', 'Effective Selling Price', 'Full/Discount', 'Total Cost', 'Date', 'Notes', 'Actions'].map(h => (
                                        <th key={h} style={styles.th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.length === 0 ? (
                                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No purchases yet</td></tr>
                                ) : purchases.map((p, i) => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #E5EAF2', backgroundColor: i % 2 === 0 ? '#FAFCFF' : '#F8FAFC' }}>
                                        <td style={styles.td}>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/products?focusProductId=${p.product}`)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    margin: 0,
                                                    color: '#93c5fd',
                                                    cursor: 'pointer',
                                                    fontWeight: 700,
                                                    fontSize: 14,
                                                    textDecoration: 'underline',
                                                    textUnderlineOffset: 2,
                                                }}
                                            >
                                                {p.product_name}
                                            </button>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={styles.qtyBadge}>
                                                {p.unit === 'ton'
                                                    ? `${Number(p.input_quantity || (p.quantity / 1000)).toLocaleString(undefined, { maximumFractionDigits: 3 })} MT`
                                                    : `${Number(p.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })} KG`}
                                            </span>
                                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                                                {p.unit === 'ton'
                                                    ? `${Number(p.quantity).toLocaleString()} KG`
                                                    : `${(Number(p.quantity) / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 })} MT`}
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ fontWeight: 600, color: '#1E6BFF' }}>
                                                Rs. {Number(p.rate_per_unit || (p.unit === 'ton' ? p.unit_cost * 1000 : p.unit_cost)).toLocaleString()}
                                                <span style={{ fontSize: 11, color: '#94a3b8' }}> /{p.unit === 'ton' ? 'Ton' : 'KG'}</span>
                                            </div>
                                            {p.unit === 'ton' && (
                                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                                    (= Rs. {Number(p.unit_cost).toLocaleString()}/KG)
                                                </div>
                                            )}
                                        </td>
                                        <td style={styles.td}>Rs. {Number(p.selling_price).toLocaleString()}</td>
                                        <td style={styles.td}>
                                            {p.full_selling_price ? (
                                                <>
                                                    Rs. {Number(p.full_selling_price).toLocaleString()}
                                                    <div style={{ fontSize: 12, color: '#94A3B8' }}>
                                                        {Number(p.discount_percent || 0).toLocaleString()}% off
                                                    </div>
                                                </>
                                            ) : <span style={{ color: '#64748B' }}>—</span>}
                                        </td>
                                        <td style={styles.td}><span style={{ fontWeight: 600, color: '#22c55e' }}>Rs. {(p.quantity * p.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                                        <td style={styles.td}>{new Date(p.date).toLocaleDateString()}</td>
                                        <td style={styles.td}>{p.notes || <span style={{ color: '#64748B' }}>—</span>}</td>
                                        <td style={styles.td}>
                                            {can('purchases.manage') ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openEditPurchaseModal(p)}
                                                    style={styles.editBtn}
                                                >
                                                    Edit
                                                </button>
                                            ) : (
                                                <span style={{ color: '#64748B' }}>—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {(can('audit.view') || can('purchases.manage')) && (
                    <div style={{ ...styles.card, marginTop: 20 }}>
                        <div style={styles.cardTitle}>Purchase Edit History</div>
                        {purchaseAuditLoading ? (
                            <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>Loading edit history...</div>
                        ) : purchaseAuditError ? (
                            <div style={{ color: '#fca5a5', padding: '8px 0' }}>{purchaseAuditError}</div>
                        ) : purchaseAuditHistory.length === 0 ? (
                            <div style={{ color: '#94A3B8' }}>No purchase edits have been recorded yet.</div>
                        ) : (
                            <div style={{ display: 'grid', gap: 10 }}>
                                {purchaseAuditHistory.slice(0, 8).map((entry) => (
                                    <div
                                        key={entry.id}
                                        style={{
                                            background: '#F8FAFC',
                                            border: '1px solid #E5EAF2',
                                            borderRadius: 10,
                                            padding: '12px 14px',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                            <div style={{ color: '#1E6BFF', fontWeight: 700, fontSize: 13 }}>
                                                {entry.username || 'System'} updated Purchase #{entry.object_id}
                                            </div>
                                            <div style={{ color: '#94a3b8', fontSize: 12 }}>
                                                {new Date(entry.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{ color: '#475569', fontSize: 13, marginTop: 6, whiteSpace: 'pre-wrap' }}>
                                            {entry.object_repr}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <FormModal
                open={showPurchaseModal}
                title={editPurchaseId ? 'Edit Scrap Purchase' : 'Purchase Raw Scrap Material'}
                onClose={closePurchaseModal}
                error={error}
                maxWidth={680}
                footer={(
                    <div style={modalActionStyles.row}>
                        <button type="button" style={modalActionStyles.cancelBtn} onClick={closePurchaseModal}>Cancel</button>
                        <button type="submit" form="purchase-form" style={loading ? modalActionStyles.primaryBtnDisabled : modalActionStyles.primaryBtn} disabled={loading}>
                            {loading ? 'Saving...' : (editPurchaseId ? 'Save Changes' : '+ Record Raw Purchase')}
                        </button>
                    </div>
                )}
            >
                <div style={{ background: '#EEF4FF', border: '1px solid rgba(218, 165, 32, 0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#1E6BFF' }}>
                    💡 <strong>Raw Material Mode:</strong> Only unwashed scrap plastic items from vendors appear in this purchase section.
                </div>
                <ScanInput
                    label="Scan Raw Material"
                    placeholder="Scan barcode/QR or type code"
                    onScan={handlePurchaseScan}
                    clearSignal={scanClearSignal}
                />
                {scanMessage && <div style={styles.scanInfo}>ℹ️ {scanMessage}</div>}
                <form id="purchase-form" onSubmit={handleSubmit}>
                    <Field label="Raw Scrap Material * (Raw Only)">
                        <select
                            style={styles.input}
                            value={form.product}
                            onChange={e => {
                                const pid = e.target.value;
                                const prod = products.find(p => String(p.id) === String(pid));
                                const pUnit = prod?.unit || 'kg';
                                setForm({
                                    ...form,
                                    product: pid,
                                    unit: pUnit,
                                    rate_per_unit: prod?.price ?? form.rate_per_unit,
                                    full_selling_price: prod?.full_price ?? prod?.sale_price ?? form.full_selling_price,
                                    discount_percent: String(prod?.discount_percent ?? form.discount_percent),
                                });
                            }}
                            required
                        >
                            <option value="">Select product</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (Stock: {Number(p.stock?.quantity ?? 0).toLocaleString()} KG / {(Number(p.stock?.quantity ?? 0)/1000).toFixed(3)} MT)
                                </option>
                            ))}
                        </select>
                    </Field>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#475569' }}>
                                Weight Unit *
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[
                                    { id: 'kg', label: '⚖️ Kilograms (KG)' },
                                    { id: 'ton', label: '🚛 Metric Tons (MT / Ton)' },
                                ].map(u => (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => {
                                            setForm(prev => {
                                                const prevUnit = prev.unit;
                                                const rawQ = Number(prev.input_quantity || 0);
                                                const rawR = Number(prev.rate_per_unit || 0);
                                                if (prevUnit === u.id) return prev;
                                                let newQ = prev.input_quantity;
                                                let newR = prev.rate_per_unit;
                                                if (rawQ > 0) {
                                                    newQ = u.id === 'ton' ? String(rawQ / 1000) : String(rawQ * 1000);
                                                }
                                                if (rawR > 0) {
                                                    newR = u.id === 'ton' ? String(rawR * 1000) : String(rawR / 1000);
                                                }
                                                return { ...prev, unit: u.id, input_quantity: newQ, rate_per_unit: newR };
                                            });
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '9px 10px',
                                            borderRadius: 8,
                                            border: `1px solid ${form.unit === u.id ? '#1E6BFF' : '#E5EAF2'}`,
                                            background: form.unit === u.id ? 'rgba(223, 177, 53, 0.18)' : '#F8FAFC',
                                            color: form.unit === u.id ? '#1E6BFF' : '#94a3b8',
                                            fontWeight: form.unit === u.id ? 700 : 500,
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {u.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#475569' }}>
                                Quantity ({form.unit === 'ton' ? 'Metric Tons / MT' : 'KG'}) *
                            </label>
                            <input
                                style={styles.input}
                                type="number"
                                step={form.unit === 'ton' ? '0.001' : '0.01'}
                                min="0.001"
                                placeholder={form.unit === 'ton' ? 'e.g. 5.5 MT' : 'e.g. 5500 KG'}
                                value={form.input_quantity}
                                onChange={e => setForm({ ...form, input_quantity: e.target.value })}
                                required
                            />
                            {Number(form.input_quantity || 0) > 0 && (
                                <div style={{ fontSize: 11, color: '#1E6BFF', marginTop: 4, fontWeight: 600 }}>
                                    {form.unit === 'ton'
                                        ? `⇄ ${(Number(form.input_quantity) * 1000).toLocaleString()} KG`
                                        : `⇄ ${(Number(form.input_quantity) / 1000).toFixed(3)} Metric Tons (MT)`}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#475569' }}>
                                Purchase Rate (Rs. per {form.unit === 'ton' ? 'Ton' : 'KG'}) *
                            </label>
                            <input
                                style={styles.input}
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder={form.unit === 'ton' ? 'e.g. 140000 / Ton' : 'e.g. 140 / KG'}
                                value={form.rate_per_unit}
                                onChange={e => setForm({ ...form, rate_per_unit: e.target.value })}
                                required
                            />
                            {Number(form.rate_per_unit || 0) > 0 && (
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                    {form.unit === 'ton'
                                        ? `(= Rs. ${(Number(form.rate_per_unit) / 1000).toFixed(2)} / KG)`
                                        : `(= Rs. ${(Number(form.rate_per_unit) * 1000).toLocaleString()} / Ton)`}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#94a3b8' }}>
                                Total Purchase Cost
                            </label>
                            <div style={{ ...styles.input, backgroundColor: '#101116', color: '#22c55e', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center' }}>
                                Rs. {(Number(form.input_quantity || 0) * Number(form.rate_per_unit || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                    <Field label="Full Selling Price (Rs.) *">
                        <input style={styles.input} type="number" min="0" step="0.01" value={form.full_selling_price} onChange={e => setForm({ ...form, full_selling_price: e.target.value })} required />
                    </Field>
                    <Field label="Discount (%)">
                        <input style={styles.input} type="number" min="0" max="100" step="0.01" value={form.discount_percent} onChange={e => setForm({ ...form, discount_percent: e.target.value })} />
                    </Field>
                    <Field label="Effective Selling Price (Rs.)">
                        <input style={styles.input} type="number" value={form.selling_price} readOnly />
                    </Field>
                    <Field label="Notes">
                        <input style={styles.input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
                    </Field>
                </form>
            </FormModal>
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
    cardTitle: { fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #E5EAF2' },
    actionRow: { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
    actionBtn: { padding: '9px 14px', borderRadius: 8, border: '1px solid #E5EAF2', backgroundColor: '#F8FAFC', color: '#475569', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
    actionBtnPrimary: { padding: '9px 14px', borderRadius: 8, border: '1px solid #1555D1', backgroundColor: '#1E6BFF', color: '#F4F6FA', cursor: 'pointer', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 12px rgba(223,177,53,0.25)' },
    success: { backgroundColor: '#F0FDF4', color: '#16A34A', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14, border: '1px solid #BBF7D0' },
    scanInfo: { backgroundColor: '#EEF4FF', color: '#1E6BFF', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, border: '1px solid #C7D9FE' },
    input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E5EAF2', backgroundColor: '#F8FAFC', color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 680 },
    th: { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    td: { padding: '12px 14px', color: '#0F172A', fontSize: 14 },
    qtyBadge: { backgroundColor: '#EEF4FF', color: '#1E6BFF', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 13, border: '1px solid #C7D9FE' },
    editBtn: { backgroundColor: '#EEF4FF', color: '#1E6BFF', border: '1px solid #C7D9FE', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 },
};

