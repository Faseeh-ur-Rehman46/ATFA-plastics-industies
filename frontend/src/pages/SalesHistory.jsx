import { useEffect, useState, useMemo, Fragment } from 'react';
import Layout from '../components/Layout';
import API from '../api/axios';
import theme from '../theme';

export default function SalesHistory() {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'paid'
    const [bulkStart, setBulkStart] = useState('');
    const [bulkEnd, setBulkEnd] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const [expandedBills, setExpandedBills] = useState({});
    const [downloadingBill, setDownloadingBill] = useState(null);

    // Pay Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');

    const formatMoney = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const toggleBillExpand = (billId) => {
        setExpandedBills(prev => ({ ...prev, [billId]: !prev[billId] }));
    };

    const fetchBills = async () => {
        setLoading(true);
        try {
            const res = await API.get('sales/bills/');
            setBills(res.data || []);
            setError('');
        } catch {
            // Fallback to legacy sales/
            try {
                const r = await API.get('sales/');
                const salesData = r.data?.results ?? r.data ?? [];
                const grouped = salesData.reduce((acc, s) => {
                    const key = s.bill_id || `SINGLE-${s.id}`;
                    if (!acc[key]) {
                        acc[key] = {
                            bill_id: key,
                            customer_name: s.customer_name,
                            date: s.date,
                            items: [],
                            total_amount: 0,
                            amount_paid: 0,
                            balance_due: 0,
                            status: 'unpaid',
                        };
                    }
                    acc[key].items.push(s);
                    const lineTotal = Number(s.quantity) * Number(s.unit_price) - Number(s.discount_amount || 0);
                    acc[key].total_amount += lineTotal;
                    acc[key].balance_due += lineTotal;
                    return acc;
                }, {});
                setBills(Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date)));
                setError('');
            } catch (err2) {
                setError(err2.response?.data?.detail || 'Failed to load sales history');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchBills(); 
    }, []);

    // Filter bills
    const filteredBills = useMemo(() => {
        if (statusFilter === 'pending') {
            return bills.filter(b => (b.status === 'unpaid' || b.status === 'partial' || b.balance_due > 0));
        }
        if (statusFilter === 'paid') {
            return bills.filter(b => b.status === 'paid' || b.balance_due <= 0);
        }
        return bills;
    }, [bills, statusFilter]);

    const downloadPdf = async (url, filename) => {
        try {
            const res = await API.get(url, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url_blob = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.style.display = 'none';
            document.body.appendChild(link);
            link.href = url_blob;
            link.download = filename;
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url_blob);
            }, 1000);
        } catch (err) {
            console.error('PDF download error:', err);
            setError('Failed to download invoice. Please try again.');
        }
    };

    const downloadBillInvoice = async (bill) => {
        setDownloadingBill(bill.bill_id);
        setError('');
        try {
            const saleIds = bill.items.map(it => it.id);
            const filename = `invoice_${bill.bill_id}.pdf`;
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
            link.download = filename || `invoice_${Date.now()}.pdf`;
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 1000);
        } catch (err) {
            console.error('Invoice download error:', err);
            setError(err.response?.data?.detail || 'Failed to download invoice. Please try again.');
        } finally {
            setDownloadingBill(null);
        }
    };

    const handleBulkInvoice = async () => {
        setBulkLoading(true);
        const params = new URLSearchParams();
        if (bulkStart) params.append('start', bulkStart);
        if (bulkEnd) params.append('end', bulkEnd);
        try {
            await downloadPdf(`sales/invoice-bulk/?${params}`, 'invoice_bulk.pdf');
        } finally {
            setBulkLoading(false);
        }
    };

    // Open Payment Modal
    const openPaymentModal = (bill) => {
        setSelectedBill(bill);
        setPaymentAmount(bill.balance_due ? String(bill.balance_due) : '');
        setPaymentMethod('cash');
        setPaymentReference('');
        setPaymentNotes(`Payment for ${bill.bill_id}`);
        setShowPaymentModal(true);
    };

    // Submit Payment
    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!selectedBill) return;
        const amt = Number(paymentAmount);
        if (!amt || amt <= 0) return alert('Enter a valid payment amount.');

        try {
            // Find or get customer
            let cid = selectedBill.customer_id;
            if (!cid) {
                const custRes = await API.get('customers/');
                const match = (custRes.data?.results ?? custRes.data ?? []).find(
                    c => c.name.toLowerCase() === selectedBill.customer_name.trim().toLowerCase()
                );
                if (match) {
                    cid = match.id;
                } else {
                    const created = await API.post('customers/', { name: selectedBill.customer_name.trim() });
                    cid = created.data.id;
                }
            }

            await API.post('customer-payments/', {
                customer: cid,
                amount: amt,
                payment_method: paymentMethod,
                reference: paymentReference,
                notes: paymentNotes,
                bill_id: selectedBill.bill_id,
            });

            setShowPaymentModal(false);
            fetchBills();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to record payment');
        }
    };

    return (
        <Layout>
            <div style={{ padding: '28px 24px', maxWidth: 1380, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#fff', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span>📜</span> Sales History &amp; Invoices
                        </h2>
                        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
                            Track bill payments, income received in parts, and export official invoices
                        </p>
                    </div>

                    {/* Filter Pills */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[
                            { key: 'all', label: 'All Bills' },
                            { key: 'pending', label: 'Unpaid & Partial' },
                            { key: 'paid', label: 'Fully Cleared' },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setStatusFilter(f.key)}
                                style={{
                                    background: statusFilter === f.key ? 'rgba(223, 177, 53, 0.18)' : '#FFFFFF',
                                    border: `1px solid ${statusFilter === f.key ? '#1E6BFF' : '#E5EAF2'}`,
                                    color: statusFilter === f.key ? '#1E6BFF' : '#94a3b8',
                                    borderRadius: 8,
                                    padding: '6px 14px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div style={{ 
                        backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                        color: '#f87171', 
                        padding: '12px 14px', 
                        borderRadius: 8, 
                        marginBottom: 16, 
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        <span>⚠️</span>
                        <span>{error}</span>
                        <button 
                            onClick={() => setError('')}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16 }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Bulk Invoice Export */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16, padding: '12px 16px', background: '#FFFFFF', borderRadius: 10, border: '1px solid #E5EAF2' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#1E6BFF', whiteSpace: 'nowrap' }}>📄 Bulk Date Export:</span>
                    <input type="date" value={bulkStart} onChange={e => setBulkStart(e.target.value)} style={styles.input} />
                    <span style={{ color: '#94A3B8', fontSize: 13 }}>to</span>
                    <input type="date" value={bulkEnd} onChange={e => setBulkEnd(e.target.value)} style={styles.input} />
                    <button onClick={handleBulkInvoice} disabled={bulkLoading} style={styles.bulkBtn}>
                        {bulkLoading ? 'Generating...' : '⬇ Download PDF Range'}
                    </button>
                </div>

                {/* Bills Table */}
                <div style={styles.card}>
                    {loading ? (
                        <div style={{ color: '#94A3B8', padding: 32, textAlign: 'center' }}>Loading sales history...</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={styles.table}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5EAF2' }}>
                                        {['Bill ID', 'Customer', '# Items', 'Bill Total', 'Amount Paid', 'Balance Due', 'Status', 'Date', 'Actions'].map(h => (
                                            <th key={h} style={styles.th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBills.length === 0 ? (
                                        <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No sales found</td></tr>
                                    ) : filteredBills.map((bill, i) => {
                                        const isExpanded = expandedBills[bill.bill_id];
                                        const itemCount = bill.items.length;
                                        const isPaid = bill.status === 'paid' || bill.balance_due <= 0;
                                        const isPartial = bill.status === 'partial' || (bill.amount_paid > 0 && bill.balance_due > 0);

                                        return (
                                            <Fragment key={bill.bill_id}>
                                                <tr 
                                                    style={{ 
                                                        borderBottom: isExpanded ? 'none' : '1px solid #E5EAF2', 
                                                        backgroundColor: i % 2 === 0 ? '#FAFCFF' : '#F8FAFC',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => toggleBillExpand(bill.bill_id)}
                                                >
                                                    <td style={styles.td}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ color: '#94A3B8', fontSize: 12 }}>{isExpanded ? '▼' : '▶'}</span>
                                                            <code style={{ color: '#1E6BFF', fontWeight: 600 }}>{bill.bill_id}</code>
                                                        </div>
                                                    </td>
                                                    <td style={styles.td}><span style={{ fontWeight: 600, color: '#fff' }}>{bill.customer_name}</span></td>
                                                    <td style={styles.td}>
                                                        <span style={{
                                                            backgroundColor: '#172554',
                                                            color: '#93c5fd',
                                                            padding: '3px 8px',
                                                            borderRadius: 12,
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            border: '1px solid #1e3a8a'
                                                        }}>
                                                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                                                        </span>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>
                                                            Rs. {formatMoney(bill.total_amount)}
                                                        </span>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={{ color: '#22c55e', fontWeight: 600 }}>
                                                            Rs. {formatMoney(bill.amount_paid || 0)}
                                                        </span>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={{ color: (bill.balance_due || 0) > 0 ? '#ef4444' : '#64748b', fontWeight: 700 }}>
                                                            Rs. {formatMoney(bill.balance_due || 0)}
                                                        </span>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={{
                                                            padding: '3px 8px',
                                                            borderRadius: 12,
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            background: isPaid ? 'rgba(34, 197, 94, 0.15)' : isPartial ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                            color: isPaid ? '#4ade80' : isPartial ? '#fbbf24' : '#f87171',
                                                            border: `1px solid ${isPaid ? 'rgba(34, 197, 94, 0.3)' : isPartial ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                                        }}>
                                                            {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                                                        </span>
                                                    </td>
                                                    <td style={styles.td}>{new Date(bill.date).toLocaleDateString()}</td>
                                                    <td style={styles.td}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                                                            {!isPaid && (
                                                                <button
                                                                    onClick={() => openPaymentModal(bill)}
                                                                    title="Record Payment"
                                                                    style={{
                                                                        background: '#16a34a',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        borderRadius: 6,
                                                                        padding: '4px 8px',
                                                                        fontSize: 11,
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 3,
                                                                    }}
                                                                >
                                                                    <span>💵</span> Pay
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => downloadBillInvoice(bill)} 
                                                                disabled={downloadingBill === bill.bill_id}
                                                                style={{
                                                                    ...styles.invoiceBtn,
                                                                    opacity: downloadingBill === bill.bill_id ? 0.6 : 1,
                                                                    cursor: downloadingBill === bill.bill_id ? 'not-allowed' : 'pointer'
                                                                }}
                                                            >
                                                                {downloadingBill === bill.bill_id ? '⏳' : '📄 Invoice'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr key={`${bill.bill_id}-details`} style={{ backgroundColor: i % 2 === 0 ? '#F8FAFC' : '#FAFCFF', borderBottom: '1px solid #E5EAF2' }}>
                                                        <td colSpan="9" style={{ padding: '0 14px 14px 48px' }}>
                                                            <div style={{ 
                                                                backgroundColor: '#FFFFFF', 
                                                                borderRadius: 8, 
                                                                padding: 14,
                                                                border: '1px solid #E5EAF2'
                                                            }}>
                                                                <div style={{ 
                                                                    fontWeight: 600, 
                                                                    fontSize: 12, 
                                                                    color: '#94A3B8', 
                                                                    marginBottom: 10,
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: 0.5
                                                                }}>
                                                                    Bill Itemized Breakdown
                                                                </div>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                                    <thead>
                                                                        <tr style={{ borderBottom: '1px solid #E5EAF2', color: '#94a3b8', fontSize: 11 }}>
                                                                            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Product</th>
                                                                            <th style={{ textAlign: 'center', padding: '6px 8px' }}>Weight / Qty</th>
                                                                            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Rate</th>
                                                                            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Discount</th>
                                                                            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Line Total</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {bill.items.map((it) => {
                                                                            const lineTotal = Number(it.total_price || (Number(it.unit_price) * Number(it.quantity) - Number(it.discount_amount || 0)));
                                                                            const isTon = it.unit === 'ton';
                                                                            const displayQty = isTon ? (it.input_quantity ?? (Number(it.quantity) / 1000)) : it.quantity;
                                                                            const displayRate = isTon ? (it.rate_per_unit ?? (Number(it.unit_price) * 1000)) : it.unit_price;

                                                                            return (
                                                                                <tr key={it.id} style={{ borderBottom: '1px solid #E5EAF2' }}>
                                                                                    <td style={{ padding: '8px', color: '#fff' }}>
                                                                                        <div style={{ fontWeight: 600 }}>{it.product_name}</div>
                                                                                    </td>
                                                                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                                                                        <div style={{ fontWeight: 700, color: '#1E6BFF' }}>
                                                                                            {Number(displayQty).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {isTon ? 'MT' : 'KG'}
                                                                                        </div>
                                                                                        {isTon && (
                                                                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                                                                                ({Number(it.quantity).toLocaleString()} KG)
                                                                                            </div>
                                                                                        )}
                                                                                    </td>
                                                                                    <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>
                                                                                        <div>Rs. {formatMoney(displayRate)}</div>
                                                                                        <div style={{ fontSize: 10, color: '#94a3b8' }}>/{isTon ? 'MT' : 'KG'}</div>
                                                                                    </td>
                                                                                    <td style={{ padding: '8px', textAlign: 'right', color: it.discount_amount > 0 ? '#fca5a5' : '#64748b' }}>
                                                                                        {it.discount_amount > 0 ? `-Rs. ${formatMoney(it.discount_amount)}` : '—'}
                                                                                    </td>
                                                                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>
                                                                                        Rs. {formatMoney(lineTotal)}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODAL: Receive Payment on specific Bill */}
                {showPaymentModal && selectedBill && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                        <div style={{ background: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 14, width: '100%', maxWidth: 460, padding: 24, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #E5EAF2', paddingBottom: 12 }}>
                                <div>
                                    <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>💵 Receive Payment</h3>
                                    <div style={{ color: '#1E6BFF', fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                                        {selectedBill.customer_name} • Bill: {selectedBill.bill_id}
                                    </div>
                                    <div style={{ color: '#f87171', fontSize: 12, marginTop: 2 }}>
                                        Remaining Due: Rs. {formatMoney(selectedBill.balance_due)}
                                    </div>
                                </div>
                                <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
                            </div>

                            <form onSubmit={handleRecordPayment}>
                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Amount Received (Rs.) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        placeholder="Enter amount"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 15, fontWeight: 700 }}
                                    />
                                </div>

                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Payment Method *</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13 }}
                                    >
                                        <option value="cash">Cash in Hand</option>
                                        <option value="bank">Bank Transfer / Online Deposit</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="online">Online / Mobile Payment</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Reference / Cheque # / Slip #</label>
                                    <input
                                        type="text"
                                        placeholder="Optional (e.g. Cheque #5502)"
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13 }}
                                    />
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Notes</label>
                                    <textarea
                                        rows={2}
                                        value={paymentNotes}
                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                        style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowPaymentModal(false)}
                                        style={{ background: '#F8FAFC', border: '1px solid #E5EAF2', color: '#94a3b8', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{ background: '#1E6BFF', color: '#F4F6FA', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Record Payment
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

const styles = {
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, border: '1px solid #E5EAF2' },
    input: { width: 150, padding: '7px 10px', borderRadius: 8, border: '1px solid #E5EAF2', backgroundColor: '#F8FAFC', color: '#0F172A', fontSize: 12 },
    bulkBtn: { background: '#16A34A', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
    th: { padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    td: { padding: '12px 14px', color: '#0F172A', fontSize: 13 },
    invoiceBtn: { background: '#EEF4FF', color: '#1E6BFF', border: '1px solid #C7D9FE', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' },
};
