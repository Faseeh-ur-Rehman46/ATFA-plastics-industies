import { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import API from '../api/axios';
import theme from '../theme';

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'owing', 'cleared'
    const [feedback, setFeedback] = useState({ error: '', success: '' });

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showStatementModal, setShowStatementModal] = useState(false);

    // Selected customer & forms
    const [activeCustomer, setActiveCustomer] = useState(null);
    const [customerForm, setCustomerForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        opening_balance: 0,
        credit_limit: 0,
        notes: '',
    });

    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        payment_method: 'cash',
        reference: '',
        notes: '',
        bill_id: '',
    });

    const [statementData, setStatementData] = useState(null);
    const [statementLoading, setStatementLoading] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);

    const formatMoney = (val) => Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await API.get('customers/');
            setCustomers(res.data?.results ?? res.data ?? []);
            setFeedback({ error: '', success: '' });
        } catch (err) {
            setFeedback({ error: err.response?.data?.detail || 'Failed to load customers', success: '' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    // Summary statistics
    const stats = useMemo(() => {
        let totalReceivables = 0;
        let totalCollections = 0;
        let owingCount = 0;

        customers.forEach(c => {
            const bal = Number(c.current_balance || 0);
            if (bal > 0) {
                totalReceivables += bal;
                owingCount += 1;
            }
            totalCollections += Number(c.total_paid || 0);
        });

        return {
            totalReceivables,
            totalCollections,
            owingCount,
            totalCustomers: customers.length,
        };
    }, [customers]);

    // Filtered customers
    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const q = search.trim().toLowerCase();
            const matchesSearch = !q ||
                c.name.toLowerCase().includes(q) ||
                String(c.phone || '').toLowerCase().includes(q) ||
                String(c.address || '').toLowerCase().includes(q);

            if (!matchesSearch) return false;

            const bal = Number(c.current_balance || 0);
            if (filterTab === 'owing') return bal > 0;
            if (filterTab === 'cleared') return bal <= 0;
            return true;
        });
    }, [customers, search, filterTab]);

    // Handle Add Customer
    const handleAddCustomer = async (e) => {
        e.preventDefault();
        try {
            await API.post('customers/', {
                ...customerForm,
                opening_balance: Number(customerForm.opening_balance || 0),
                credit_limit: Number(customerForm.credit_limit || 0),
            });
            setShowAddModal(false);
            setCustomerForm({ name: '', phone: '', email: '', address: '', opening_balance: 0, credit_limit: 0, notes: '' });
            fetchCustomers();
            setFeedback({ success: 'Customer created successfully.', error: '' });
        } catch (err) {
            setFeedback({ error: err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to save customer', success: '' });
        }
    };

    // Handle Edit Customer
    const handleEditCustomer = async (e) => {
        e.preventDefault();
        if (!activeCustomer) return;
        try {
            await API.patch(`customers/${activeCustomer.id}/`, {
                ...customerForm,
                opening_balance: Number(customerForm.opening_balance || 0),
                credit_limit: Number(customerForm.credit_limit || 0),
            });
            setShowEditModal(false);
            fetchCustomers();
            setFeedback({ success: 'Customer updated successfully.', error: '' });
        } catch (err) {
            setFeedback({ error: err.response?.data?.detail || 'Failed to update customer', success: '' });
        }
    };

    // Handle Delete Customer
    const handleDeleteCustomer = async (customer) => {
        if (!window.confirm(`Are you sure you want to delete customer "${customer.name}"?`)) return;
        try {
            await API.delete(`customers/${customer.id}/`);
            fetchCustomers();
            setFeedback({ success: `Customer "${customer.name}" deleted.`, error: '' });
        } catch (err) {
            setFeedback({ error: err.response?.data?.detail || 'Failed to delete customer', success: '' });
        }
    };

    // Open Payment Modal
    const openPaymentModal = (customer, defaultBillId = '') => {
        setActiveCustomer(customer);
        setPaymentForm({
            amount: '',
            payment_method: 'cash',
            reference: '',
            notes: '',
            bill_id: defaultBillId,
        });
        setShowPaymentModal(true);
    };

    // Handle Submit Payment
    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!activeCustomer) return;
        const amt = Number(paymentForm.amount);
        if (!amt || amt <= 0) {
            alert('Please enter a valid payment amount.');
            return;
        }

        try {
            await API.post('customer-payments/', {
                customer: activeCustomer.id,
                amount: amt,
                payment_method: paymentForm.payment_method,
                reference: paymentForm.reference,
                notes: paymentForm.notes,
                bill_id: paymentForm.bill_id,
            });
            setShowPaymentModal(false);
            fetchCustomers();
            setFeedback({ success: `Recorded payment of Rs. ${formatMoney(amt)} from ${activeCustomer.name}.`, error: '' });

            // If statement was open, refresh statement
            if (showStatementModal) {
                openStatement(activeCustomer);
            }
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to record payment');
        }
    };

    // Open Statement Modal
    const openStatement = async (customer) => {
        setActiveCustomer(customer);
        setShowStatementModal(true);
        setStatementLoading(true);
        try {
            const res = await API.get(`customers/${customer.id}/ledger/`);
            setStatementData(res.data);
            if (res.data?.customer) {
                setActiveCustomer(prev => ({ ...(prev || {}), ...res.data.customer }));
            }
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to load ledger');
        } finally {
            setStatementLoading(false);
        }
    };

    // Download Statement PDF
    const handleDownloadStatementPdf = async () => {
        if (!activeCustomer) return;
        setDownloadingPdf(true);
        try {
            const res = await API.get(`customers/${activeCustomer.id}/statement_pdf/`);
            const binaryString = window.atob(res.data.pdf_64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blobData = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blobData);
            const link = document.createElement('a');
            link.href = url;
            link.download = res.data.filename || `statement_${activeCustomer.name}.pdf`;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 1000);
        } catch (err) {
            alert('Failed to generate PDF statement');
        } finally {
            setDownloadingPdf(false);
        }
    };

    // Share Statement via WhatsApp
    const handleShareWhatsApp = () => {
        if (!activeCustomer || !statementData) return;
        const bal = statementData.current_balance;
        const msg = encodeURIComponent(
            `*ATFA Plastic Industry - Account Statement*\n` +
            `Dear ${activeCustomer.name},\n` +
            `Total Invoiced: Rs. ${formatMoney(statementData.total_billed)}\n` +
            `Total Paid: Rs. ${formatMoney(statementData.total_paid)}\n` +
            `*Current Balance Due: Rs. ${formatMoney(bal)}*\n\n` +
            `Thank you for your business!`
        );
        const cleanPhone = String(activeCustomer.phone || '').replace(/[^0-9]/g, '');
        const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
        window.open(waUrl, '_blank');
    };

    return (
        <Layout>
            <div style={{ padding: '28px 24px', maxWidth: 1380, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span>👥</span> Customer Accounts &amp; Khaata
                        </h1>
                        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
                            Smart Auto-Settling Ledger, partial payments tracking, and live market receivables
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setCustomerForm({ name: '', phone: '', email: '', address: '', opening_balance: 0, credit_limit: 0, notes: '' });
                            setShowAddModal(true);
                        }}
                        style={{
                            background: '#1E6BFF',
                            color: '#F4F6FA',
                            border: 'none',
                            borderRadius: 10,
                            padding: '10px 20px',
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 4px 14px rgba(30, 107, 255, 0.2)',
                        }}
                    >
                        <span>➕</span> Add Customer
                    </button>
                </div>

                {/* Feedback notifications */}
                {feedback.success && (
                    <div style={{ padding: '12px 16px', background: 'rgba(22, 163, 74, 0.15)', border: '1px solid rgba(22, 163, 74, 0.4)', borderRadius: 10, color: '#4ade80', marginBottom: 20, fontSize: 13 }}>
                        ✅ {feedback.success}
                    </div>
                )}
                {feedback.error && (
                    <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 10, color: '#f87171', marginBottom: 20, fontSize: 13 }}>
                        ⚠️ {feedback.error}
                    </div>
                )}

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
                    <div style={{ background: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 12, padding: '18px 20px' }}>
                        <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                            Total Market Receivables
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: stats.totalReceivables > 0 ? '#ef4444' : '#22c55e' }}>
                            Rs. {formatMoney(stats.totalReceivables)}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                            Pending balance from {stats.owingCount} customer{stats.owingCount === 1 ? '' : 's'}
                        </div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 12, padding: '18px 20px' }}>
                        <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                            Total Collections Received
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#1E6BFF' }}>
                            Rs. {formatMoney(stats.totalCollections)}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                            Lifetime incoming cash &amp; bank payments
                        </div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 12, padding: '18px 20px' }}>
                        <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                            Active Accounts
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>
                            {stats.totalCustomers}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                            {stats.totalCustomers - stats.owingCount} completely cleared
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                        <span style={{ fontSize: 16 }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search by customer name, phone, or address..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                background: '#F8FAFC',
                                border: '1px solid #E5EAF2',
                                borderRadius: 8,
                                padding: '8px 12px',
                                color: '#fff',
                                fontSize: 13,
                                outline: 'none',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'owing', label: 'Owing Money (Pending)' },
                            { key: 'cleared', label: 'Cleared (Zero Due)' },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => setFilterTab(t.key)}
                                style={{
                                    background: filterTab === t.key ? 'rgba(223, 177, 53, 0.15)' : '#F8FAFC',
                                    border: `1px solid ${filterTab === t.key ? '#1E6BFF' : '#E5EAF2'}`,
                                    color: filterTab === t.key ? '#1E6BFF' : '#94a3b8',
                                    borderRadius: 8,
                                    padding: '6px 14px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Customer Table */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 12, overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading customer accounts...</div>
                    ) : filteredCustomers.length === 0 ? (
                        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>No customer accounts found</div>
                            <div style={{ fontSize: 13, marginTop: 4 }}>Add your first customer to start tracking wholesale accounts and partial payments.</div>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5EAF2', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        <th style={{ padding: '12px 16px' }}>Customer Name</th>
                                        <th style={{ padding: '12px 16px' }}>Contact / Phone</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Billed</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Paid</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Current Balance</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Unpaid Bills</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map((c) => {
                                        const bal = Number(c.current_balance || 0);
                                        const isOwing = bal > 0;
                                        const isAdvance = bal < 0;

                                        return (
                                            <tr key={c.id} style={{ borderBottom: '1px solid #E5EAF2', transition: 'background 0.15s' }}>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{
                                                            width: 32, height: 32, borderRadius: '50%',
                                                            background: 'rgba(223, 177, 53, 0.15)',
                                                            color: '#1E6BFF',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontWeight: 700, fontSize: 13, border: '1px solid rgba(30, 107, 255, 0.2)'
                                                        }}>
                                                            {c.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ color: '#fff', fontWeight: 600 }}>{c.name}</div>
                                                            {c.address && <div style={{ color: '#64748b', fontSize: 11 }}>{c.address}</div>}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td style={{ padding: '14px 16px', color: '#475569' }}>
                                                    {c.phone ? (
                                                        <a href={`tel:${c.phone}`} style={{ color: '#475569', textDecoration: 'none' }}>
                                                            📞 {c.phone}
                                                        </a>
                                                    ) : '—'}
                                                </td>

                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: '#475569' }}>
                                                    Rs. {formatMoney(c.total_billed)}
                                                </td>

                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: '#22c55e' }}>
                                                    Rs. {formatMoney(c.total_paid)}
                                                </td>

                                                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: 20,
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        background: isOwing ? 'rgba(239, 68, 68, 0.12)' : isAdvance ? 'rgba(59, 130, 246, 0.15)' : 'rgba(22, 163, 74, 0.12)',
                                                        color: isOwing ? '#f87171' : isAdvance ? '#60a5fa' : '#4ade80',
                                                        border: `1px solid ${isOwing ? 'rgba(239, 68, 68, 0.3)' : isAdvance ? 'rgba(59, 130, 246, 0.3)' : 'rgba(22, 163, 74, 0.3)'}`,
                                                    }}>
                                                        {isOwing ? `Rs. ${formatMoney(bal)} Due` : isAdvance ? `Rs. ${formatMoney(Math.abs(bal))} Adv` : 'Cleared ✓'}
                                                    </span>
                                                </td>

                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    {c.unpaid_bills_count > 0 ? (
                                                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>{c.unpaid_bills_count} bill(s)</span>
                                                    ) : (
                                                        <span style={{ color: '#64748b' }}>0</span>
                                                    )}
                                                </td>

                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                        <button
                                                            onClick={() => openPaymentModal(c)}
                                                            title="Record Payment"
                                                            style={{
                                                                background: '#16a34a',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: 6,
                                                                padding: '6px 10px',
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                            }}
                                                        >
                                                            <span>💵</span> Pay
                                                        </button>

                                                        <button
                                                            onClick={() => openStatement(c)}
                                                            title="View Customer Khaata & Ledger"
                                                            style={{
                                                                background: '#F8FAFC',
                                                                border: '1px solid #1E6BFF',
                                                                color: '#1E6BFF',
                                                                borderRadius: 6,
                                                                padding: '6px 10px',
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            📒 Khaata
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setActiveCustomer(c);
                                                                setCustomerForm({
                                                                    name: c.name,
                                                                    phone: c.phone || '',
                                                                    email: c.email || '',
                                                                    address: c.address || '',
                                                                    opening_balance: c.opening_balance || 0,
                                                                    credit_limit: c.credit_limit || 0,
                                                                    notes: c.notes || '',
                                                                });
                                                                setShowEditModal(true);
                                                            }}
                                                            title="Edit Customer"
                                                            style={{
                                                                background: '#F8FAFC',
                                                                border: '1px solid #E5EAF2',
                                                                color: '#475569',
                                                                borderRadius: 6,
                                                                padding: '6px 8px',
                                                                fontSize: 12,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            ✏️
                                                        </button>

                                                        <button
                                                            onClick={() => handleDeleteCustomer(c)}
                                                            title="Delete"
                                                            style={{
                                                                background: '#F8FAFC',
                                                                border: '1px solid #E5EAF2',
                                                                color: '#ef4444',
                                                                borderRadius: 6,
                                                                padding: '6px 8px',
                                                                fontSize: 12,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODAL: Record Payment */}
                {showPaymentModal && activeCustomer && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                        <div style={{ background: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 14, width: '100%', maxWidth: 460, padding: 24, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #E5EAF2', paddingBottom: 12 }}>
                                <div>
                                    <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>💵 Receive Payment</h3>
                                    <div style={{ color: '#1E6BFF', fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                                        {activeCustomer.name} (Current Balance: Rs. {formatMoney(activeCustomer.current_balance)})
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
                                        placeholder="e.g. 50000"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 15, fontWeight: 700 }}
                                    />
                                </div>

                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Payment Method *</label>
                                    <select
                                        value={paymentForm.payment_method}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
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
                                        placeholder="Optional (e.g. Meezan Bank slip #7819)"
                                        value={paymentForm.reference}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                        style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13 }}
                                    />
                                </div>

                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Allocation Strategy</label>
                                    <div style={{ background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: 10, fontSize: 12, color: '#94a3b8' }}>
                                        <div style={{ color: '#4ade80', fontWeight: 600, marginBottom: 3 }}>✓ Smart Auto-Settling (FIFO) Active</div>
                                        This payment will automatically clear {activeCustomer.name}&apos;s oldest unpaid invoices first.
                                    </div>
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Notes / Remarks</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Optional notes"
                                        value={paymentForm.notes}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
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
                                        Confirm &amp; Record Payment
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: Customer Ledger Statement */}
                {showStatementModal && activeCustomer && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                        <div style={{ background: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 14, width: '100%', maxWidth: 880, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }}>
                            {/* Modal Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #E5EAF2' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: '#fff', fontSize: 19, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span>📜</span> Statement of Account (Khaata)
                                    </h3>
                                    <div style={{ color: '#1E6BFF', fontSize: 13, fontWeight: 600, marginTop: 3 }}>
                                        {activeCustomer.name} {activeCustomer.phone && `• ${activeCustomer.phone}`}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <button
                                        onClick={handleShareWhatsApp}
                                        style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <span>💬</span> WhatsApp
                                    </button>

                                    <button
                                        onClick={handleDownloadStatementPdf}
                                        disabled={downloadingPdf}
                                        style={{ background: '#1E6BFF', color: '#F4F6FA', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        {downloadingPdf ? 'Downloading...' : '📄 PDF Statement'}
                                    </button>

                                    <button
                                        onClick={() => setShowStatementModal(false)}
                                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer', marginLeft: 6 }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                                {statementLoading ? (
                                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading ledger statement...</div>
                                ) : !statementData ? (
                                    <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>Unable to load statement.</div>
                                ) : (
                                    <div>
                                        {/* Summary KPI Strip */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                                            <div style={{ background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 10, padding: 14 }}>
                                                <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>TOTAL INVOICED</div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 4 }}>
                                                    Rs. {formatMoney(statementData.total_billed)}
                                                </div>
                                            </div>
                                            <div style={{ background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 10, padding: 14 }}>
                                                <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>TOTAL RECEIVED</div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e', marginTop: 4 }}>
                                                    Rs. {formatMoney(statementData.total_paid)}
                                                </div>
                                            </div>
                                            <div style={{ background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 10, padding: 14 }}>
                                                <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>NET BALANCE DUE</div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: statementData.current_balance > 0 ? '#ef4444' : '#22c55e', marginTop: 4 }}>
                                                    Rs. {formatMoney(statementData.current_balance)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Invoices Status Breakdown */}
                                        <h4 style={{ margin: '0 0 10px', color: '#fff', fontSize: 14 }}>Invoices &amp; Smart Auto-Settlement Status</h4>
                                        <div style={{ background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                                                <thead>
                                                    <tr style={{ background: '#FFFFFF', borderBottom: '1px solid #E5EAF2', color: '#94a3b8', fontSize: 11 }}>
                                                        <th style={{ padding: '8px 12px' }}>Bill ID</th>
                                                        <th style={{ padding: '8px 12px' }}>Date</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Bill Total</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount Paid</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Balance Due</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {statementData.bills.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>No invoices recorded yet.</td>
                                                        </tr>
                                                    ) : (
                                                        statementData.bills.map((b) => (
                                                            <tr key={b.bill_id} style={{ borderBottom: '1px solid #E5EAF2' }}>
                                                                <td style={{ padding: '8px 12px', color: '#1E6BFF', fontWeight: 600 }}>{b.bill_id}</td>
                                                                <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{new Date(b.date).toLocaleDateString()}</td>
                                                                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#fff' }}>Rs. {formatMoney(b.total_amount)}</td>
                                                                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#22c55e' }}>Rs. {formatMoney(b.amount_paid)}</td>
                                                                <td style={{ padding: '8px 12px', textAlign: 'right', color: b.balance_due > 0 ? '#ef4444' : '#64748b', fontWeight: b.balance_due > 0 ? 700 : 400 }}>
                                                                    Rs. {formatMoney(b.balance_due)}
                                                                </td>
                                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                    <span style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: 12,
                                                                        fontSize: 10,
                                                                        fontWeight: 700,
                                                                        background: b.status === 'paid' ? 'rgba(34, 197, 94, 0.15)' : b.status === 'partial' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                        color: b.status === 'paid' ? '#4ade80' : b.status === 'partial' ? '#fbbf24' : '#f87171',
                                                                    }}>
                                                                        {b.status.toUpperCase()}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Full Running Timeline */}
                                        <h4 style={{ margin: '0 0 10px', color: '#fff', fontSize: 14 }}>Running Ledger Timeline</h4>
                                        <div style={{ background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 10, overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                                                <thead>
                                                    <tr style={{ background: '#FFFFFF', borderBottom: '1px solid #E5EAF2', color: '#94a3b8', fontSize: 11 }}>
                                                        <th style={{ padding: '8px 12px' }}>Date</th>
                                                        <th style={{ padding: '8px 12px' }}>Type</th>
                                                        <th style={{ padding: '8px 12px' }}>Reference</th>
                                                        <th style={{ padding: '8px 12px' }}>Description</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Debit (+)</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Credit (-)</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Balance</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {statementData.timeline.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>No timeline transactions yet.</td>
                                                        </tr>
                                                    ) : (
                                                        statementData.timeline.map((item, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #E5EAF2' }}>
                                                                <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{new Date(item.date).toLocaleDateString()}</td>
                                                                <td style={{ padding: '8px 12px' }}>
                                                                    <span style={{
                                                                        padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                                                                        background: item.type === 'INVOICE' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                                                        color: item.type === 'INVOICE' ? '#60a5fa' : '#4ade80',
                                                                    }}>
                                                                        {item.type}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '8px 12px', color: '#1E6BFF' }}>{item.reference}</td>
                                                                <td style={{ padding: '8px 12px', color: '#475569' }}>{item.description}</td>
                                                                <td style={{ padding: '8px 12px', textAlign: 'right', color: item.debit > 0 ? '#ef4444' : '#64748b' }}>
                                                                    {item.debit > 0 ? `Rs. ${formatMoney(item.debit)}` : '—'}
                                                                </td>
                                                                <td style={{ padding: '8px 12px', textAlign: 'right', color: item.credit > 0 ? '#22c55e' : '#64748b' }}>
                                                                    {item.credit > 0 ? `Rs. ${formatMoney(item.credit)}` : '—'}
                                                                </td>
                                                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                                                                    Rs. {formatMoney(item.running_balance)}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: Add / Edit Customer */}
                {(showAddModal || showEditModal) && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                        <div style={{ background: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 14, width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #E5EAF2', paddingBottom: 12 }}>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>
                                    {showAddModal ? '➕ Add New Customer' : '✏️ Edit Customer'}
                                </h3>
                                <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
                            </div>

                            <form onSubmit={showAddModal ? handleAddCustomer : handleEditCustomer}>
                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Customer / Company Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Ali Packages / Mahad Trading"
                                        value={customerForm.name}
                                        onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                                        style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14 }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Phone / WhatsApp</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 03001234567"
                                            value={customerForm.phone}
                                            onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                                            style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13 }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Email</label>
                                        <input
                                            type="email"
                                            placeholder="optional"
                                            value={customerForm.email}
                                            onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                                            style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13 }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Address / Factory Location</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Industrial Area Sector 4, Lahore"
                                        value={customerForm.address}
                                        onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                                        style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13 }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Opening Balance (Rs.)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={customerForm.opening_balance}
                                            onChange={(e) => setCustomerForm({ ...customerForm, opening_balance: e.target.value })}
                                            style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13 }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Credit Limit (Rs.)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0 = unlimited"
                                            value={customerForm.credit_limit}
                                            onChange={(e) => setCustomerForm({ ...customerForm, credit_limit: e.target.value })}
                                            style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13 }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                                        style={{ background: '#F8FAFC', border: '1px solid #E5EAF2', color: '#94a3b8', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{ background: '#1E6BFF', color: '#F4F6FA', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        {showAddModal ? 'Create Customer' : 'Save Changes'}
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
