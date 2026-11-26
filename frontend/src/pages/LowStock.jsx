import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import API from '../api/axios';

export default function LowStock() {
    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchLowStock = () => {
        setLoading(true);
        API.get('low-stock/')
            .then(r => setItems(r.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const id = setTimeout(() => {
            fetchLowStock();
        }, 0);
        return () => clearTimeout(id);
    }, []);

    const urgency = (qty, threshold) => {
        if (qty === 0)                    return { label: 'OUT OF STOCK', color: '#ef4444', bg: '#ef444420' };
        if (qty <= threshold * 0.5)       return { label: 'CRITICAL',    color: '#f97316', bg: '#f9731620' };
        return                                   { label: 'LOW',         color: '#eab308', bg: '#eab30820' };
    };

    return (
        <Layout>
            <div style={{ padding: '28px 24px' }}>
                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                    <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#fff' }}>
                        Low Stock Alerts
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
                        Products at or below their restock threshold
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/settings')}
                        style={{
                            marginTop: 10, background: '#F8FAFC', color: '#475569', border: '1px solid #E5EAF2',
                            borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                        }}
                    >
                        Open App Settings
                    </button>
                </div>

                {/* Summary */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Total Low',    value: items.length,                              color: '#1E6BFF' },
                        { label: 'Critical',     value: items.filter(i => i.quantity > 0 && i.quantity <= i.threshold * 0.5).length, color: '#f97316' },
                        { label: 'Out of Stock', value: items.filter(i => i.quantity === 0).length, color: '#ef4444' },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: '#FFFFFF', border: `1px solid ${s.color}33`,
                            borderRadius: 12, padding: '14px 20px', minWidth: 130,
                        }}>
                            <div style={{ color: s.color, fontSize: 26, fontWeight: 700 }}>{s.value}</div>
                            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div style={{
                    background: '#FFFFFF', border: '1px solid #E5EAF2',
                    borderRadius: 14, overflow: 'hidden',
                }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
                    ) : items.length === 0 ? (
                        <div style={{ padding: 48, textAlign: 'center' }}>
                            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                            <div style={{ color: '#4ade80', fontWeight: 600, fontSize: 16 }}>All products are well-stocked!</div>
                            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>No products are below their threshold.</div>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#F8FAFC' }}>
                                    {['Product', 'SKU', 'Category', 'Supplier', 'Current Stock', 'Threshold', 'Status', 'Action'].map(h => (
                                        <th key={h} style={{
                                            padding: '12px 16px', textAlign: 'left',
                                            color: '#64748b', fontSize: 11, fontWeight: 700,
                                            letterSpacing: 1, textTransform: 'uppercase',
                                            borderBottom: '1px solid #E5EAF2',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => {
                                    const u = urgency(item.quantity, item.threshold);
                                    return (
                                        <tr key={item.id} style={{
                                            background: idx % 2 === 0 ? 'transparent' : '#ffffff04',
                                            borderBottom: '1px solid #E5EAF2',
                                        }}>
                                            <td style={{ padding: '13px 16px', color: '#fff', fontWeight: 600, fontSize: 14 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/products?focusProductId=${item.id}`)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: 0,
                                                        margin: 0,
                                                        color: '#1E6BFF',
                                                        cursor: 'pointer',
                                                        fontWeight: 700,
                                                        fontSize: 14,
                                                        textDecoration: 'underline',
                                                        textUnderlineOffset: 2,
                                                    }}
                                                >
                                                    {item.name}
                                                </button>
                                            </td>
                                            <td style={{ padding: '13px 16px', color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>
                                                {item.sku}
                                            </td>
                                            <td style={{ padding: '13px 16px', color: '#94a3b8', fontSize: 13 }}>
                                                {item.category || '—'}
                                            </td>
                                            <td style={{ padding: '13px 16px', color: '#94a3b8', fontSize: 13 }}>
                                                <div>{item.supplier || '—'}</div>
                                                {item.supplier_email && (
                                                    <div style={{ fontSize: 11, color: '#64748b' }}>{item.supplier_email}</div>
                                                )}
                                            </td>
                                            <td style={{ padding: '13px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                                    <span style={{ fontWeight: 700, fontSize: 18, color: u.color }}>
                                                        {Number(item.quantity).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                                    </span>
                                                    <span style={{ color: '#475569', fontSize: 12, fontWeight: 600 }}>KG</span>
                                                </div>
                                                <div style={{ color: '#1E6BFF', fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                                                    🚛 {(Number(item.quantity) / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} MT
                                                </div>
                                            </td>
                                            <td style={{ padding: '13px 16px' }}>
                                                <div style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>
                                                    {Number(item.threshold).toLocaleString()} KG
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                                                    {(Number(item.threshold) / 1000).toFixed(3)} MT
                                                </div>
                                            </td>
                                            <td style={{ padding: '13px 16px' }}>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 20,
                                                    fontSize: 10, fontWeight: 700,
                                                    color: u.color, background: u.bg,
                                                    letterSpacing: 0.5,
                                                }}>{u.label}</span>
                                            </td>
                                            <td style={{ padding: '13px 16px' }}>
                                                <button
                                                    onClick={() => navigate(`/products/edit/${item.id}`)}
                                                    style={{
                                                        background: '#EEF4FF', border: '1px solid #1E6BFF',
                                                        color: '#1E6BFF', borderRadius: 8,
                                                        padding: '5px 12px', fontSize: 12,
                                                        cursor: 'pointer', fontWeight: 600,
                                                    }}>
                                                    Restock
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </Layout>
    );
}
