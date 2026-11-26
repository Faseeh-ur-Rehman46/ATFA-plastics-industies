import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import API from '../api/axios';

export default function WasteManagement() {
    const [data, setData] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchReport = async (monthKey) => {
        try {
            setLoading(true);
            const params = monthKey ? { month: monthKey } : {};
            const res = await API.get('waste/summary/', { params });
            setData(res.data);
            if (!selectedMonth && res.data?.selected_month) {
                setSelectedMonth(res.data.selected_month);
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load monthly waste report.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport('');
    }, []);

    const handleMonthChange = (e) => {
        const val = e.target.value;
        setSelectedMonth(val);
        fetchReport(val);
    };

    const totalPurchased = data?.total_purchased_month || 0;
    const totalFinal = data?.total_final_product_month || 0;
    const monthlyWaste = data?.monthly_waste || 0;
    const wastePercent = data?.waste_percent || 0;
    const history = data?.monthly_history || [];

    return (
        <Layout>
            <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f43f5e', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span>🗑️</span> Waste & Monthly Loss Reconciliation
                        </h1>
                        <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
                            End of month waste calculation: <strong>Total Scrap Purchases − Total Final Product = Waste Material</strong>
                        </p>
                    </div>

                    {/* Month Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, color: '#94a3b8' }}>Select Month:</span>
                        <select
                            style={{ padding: '8px 14px', background: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600 }}
                            value={selectedMonth}
                            onChange={handleMonthChange}
                        >
                            {history.map(h => (
                                <option key={h.month_key} value={h.month_key}>
                                    {h.month_label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
                        ✖ {error}
                    </div>
                )}

                {/* 3 Big Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 30 }}>
                    
                    {/* Card 1: Total Scrap Purchased */}
                    <div style={{ background: '#1e293b', border: '1px solid #E2E8F0', borderRadius: 16, padding: 22, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                            1. Total Scrap Purchased ({data?.selected_month_label})
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '10px 0 6px' }}>
                            {totalPurchased.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8' }}>KG</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                            Gross raw scrap bought from suppliers in the Purchase option
                        </div>
                    </div>

                    {/* Card 2: Total Final Product */}
                    <div style={{ background: '#1e293b', border: '1px solid #E2E8F0', borderRadius: 16, padding: 22, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                            2. Total Final Product ({data?.selected_month_label})
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981', margin: '10px 0 6px' }}>
                            {totalFinal.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8' }}>KG</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                            Finished plastic grains (Dana) sold / dispatched this month
                        </div>
                    </div>

                    {/* Card 3: Monthly Waste */}
                    <div style={{ background: '#1e293b', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: 16, padding: 22, boxShadow: '0 4px 16px rgba(244, 63, 94, 0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 12, color: '#fda4af', fontWeight: 700, textTransform: 'uppercase' }}>
                                3. Monthly Waste (Total Purchased − Final)
                            </div>
                            <span style={{ fontSize: 11, background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                                {wastePercent}% Loss
                            </span>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#fb7185', margin: '10px 0 6px' }}>
                            {monthlyWaste.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#fda4af' }}>KG</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#fda4af' }}>
                            Calculated process loss: Dirt, sludge, labels and shrinkage
                        </div>
                    </div>

                </div>

                {/* Monthly History Table */}
                <div style={{ background: '#1e293b', border: '1px solid #E2E8F0', borderRadius: 16, padding: 24, marginBottom: 30, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
                            Monthly Waste & Loss Summary
                        </h2>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                            Calculated at the end of each month
                        </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' }}>
                                    <th style={{ padding: '12px 14px' }}>Month</th>
                                    <th style={{ padding: '12px 14px' }}>Total Scrap Purchased (KG)</th>
                                    <th style={{ padding: '12px 14px' }}>Total Final Product (KG)</th>
                                    <th style={{ padding: '12px 14px' }}>Waste Material (KG)</th>
                                    <th style={{ padding: '12px 14px' }}>Loss %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(h => (
                                    <tr key={h.month_key} style={{ borderBottom: '1px solid #E2E8F0', background: h.month_key === selectedMonth ? 'rgba(59, 130, 246, 0.08)' : 'transparent' }}>
                                        <td style={{ padding: '14px', color: '#fff', fontWeight: 600 }}>
                                            {h.month_label}
                                        </td>
                                        <td style={{ padding: '14px', color: '#f59e0b', fontWeight: 600 }}>
                                            {h.purchased_kg.toLocaleString()} KG
                                        </td>
                                        <td style={{ padding: '14px', color: '#10b981', fontWeight: 600 }}>
                                            {h.final_kg.toLocaleString()} KG
                                        </td>
                                        <td style={{ padding: '14px', color: '#fb7185', fontWeight: 800 }}>
                                            {h.waste_kg.toLocaleString()} KG
                                        </td>
                                        <td style={{ padding: '14px', color: '#fff' }}>
                                            {h.loss_percent}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Details Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
                    
                    {/* Purchases Breakdown */}
                    <div style={{ background: '#1e293b', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', margin: '0 0 12px' }}>
                            Scrap Purchases in {data?.selected_month_label}
                        </h3>
                        {data?.purchases_breakdown?.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontSize: 12, padding: '16px 0' }}>No purchases logged in this month.</div>
                        ) : (
                            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                                {data?.purchases_breakdown?.map(p => (
                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E8F0', fontSize: 12 }}>
                                        <div>
                                            <div style={{ color: '#fff', fontWeight: 600 }}>{p.product_name}</div>
                                            <div style={{ color: '#94a3b8', fontSize: 11 }}>{p.date}</div>
                                        </div>
                                        <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>
                                            {p.quantity.toLocaleString()} KG
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Final Sales Breakdown */}
                    <div style={{ background: '#1e293b', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#10b981', margin: '0 0 12px' }}>
                            Final Product Dispatched in {data?.selected_month_label}
                        </h3>
                        {data?.final_sales_breakdown?.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontSize: 12, padding: '16px 0' }}>No sales/dispatches logged in this month.</div>
                        ) : (
                            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                                {data?.final_sales_breakdown?.map(s => (
                                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E8F0', fontSize: 12 }}>
                                        <div>
                                            <div style={{ color: '#fff', fontWeight: 600 }}>{s.product_name}</div>
                                            <div style={{ color: '#94a3b8', fontSize: 11 }}>{s.customer_name} • {s.date}</div>
                                        </div>
                                        <div style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>
                                            {s.quantity.toLocaleString()} KG
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </Layout>
    );
}
