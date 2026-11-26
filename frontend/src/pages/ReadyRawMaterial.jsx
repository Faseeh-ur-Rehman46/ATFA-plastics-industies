import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function ReadyRawMaterial() {
    const { can, isAdmin } = useAuth();
    const [readyMaterials, setReadyMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Modal state for adding a new ready raw material
    const [showAddModal, setShowAddModal] = useState(false);
    const [formName, setFormName] = useState('');
    const [formWeight, setFormWeight] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Modal state for adding stock to an existing material
    const [showStockModal, setShowStockModal] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [addKg, setAddKg] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await API.get('products/', { params: { material_type: 'ready_raw' } });
            setReadyMaterials(res.data?.results || res.data || []);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load ready raw materials.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const totalReadyStock = readyMaterials.reduce((sum, p) => sum + Number(p.stock?.quantity || 0), 0);

    const handleCreateMaterial = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        const trimmedName = formName.trim();
        if (!trimmedName) {
            setError('Please enter a color / material name.');
            return;
        }

        const qty = Number(formWeight) || 0;

        setSubmitting(true);
        try {
            // Find or get category
            const catRes = await API.get('categories/');
            const cats = catRes.data?.results || catRes.data || [];
            let flakeCat = cats.find(c => c.name.toLowerCase().includes('washed') || c.name.toLowerCase().includes('flake') || c.name.toLowerCase().includes('ready'));

            const prefix = "".concat(trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'FLK');
            const randomCode = Math.floor(1000 + Math.random() * 9000);
            const sku = `${prefix}-${randomCode}`;

            const res = await API.post('products/', {
                name: trimmedName,
                sku: sku,
                material_type: 'ready_raw',
                unit: 'kg',
                category: flakeCat ? flakeCat.id : null,
                price: '0.00',
                sale_price: '0.00',
                description: formDescription.trim(),
            });

            // If initial weight entered, update stock
            if (qty > 0 && res.data?.id) {
                await API.post('ready-raw/batches/', {
                    outputs: [{ product: res.data.id, quantity: qty }],
                    raw_quantity: qty,
                    notes: `Initial stock for ${trimmedName}`,
                });
            }

            setMessage(`Ready Raw Material "${trimmedName}" saved successfully!`);
            setShowAddModal(false);
            setFormName('');
            setFormWeight('');
            setFormDescription('');
            fetchData();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save ready raw material.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddStock = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        const qty = Number(addKg);
        if (qty <= 0) {
            setError('Please enter a valid weight in KG.');
            return;
        }

        setSubmitting(true);
        try {
            await API.post('ready-raw/batches/', {
                outputs: [{ product: selectedMaterial.id, quantity: qty }],
                raw_quantity: qty,
                notes: `Added ${qty} kg to ${selectedMaterial.name}`,
            });

            setMessage(`Added ${qty} KG to "${selectedMaterial.name}"!`);
            setShowStockModal(false);
            setAddKg('');
            setSelectedMaterial(null);
            fetchData();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to add stock.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
        try {
            await API.delete(`products/${id}/`);
            setMessage(`"${name}" deleted.`);
            fetchData();
        } catch (err) {
            setError('Failed to delete item.');
        }
    };

    return (
        <Layout>
            <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span>🧼</span> Ready Raw Material
                        </h1>
                        <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
                            Stored clean washed regrind materials with color, weight in KG, and description
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ background: '#1e293b', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: 10, fontSize: 13, color: '#94a3b8' }}>
                            Total Ready Material: <strong style={{ color: '#10b981', fontSize: 15 }}>{totalReadyStock.toLocaleString()} KG</strong>
                        </div>
                        <button
                            onClick={() => { setShowAddModal(true); setError(''); }}
                            style={{ background: '#0284c7', color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)' }}
                        >
                            + Add Ready Raw Material
                        </button>
                    </div>
                </div>

                {message && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
                        ✔ {message}
                    </div>
                )}
                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
                        ✖ {error}
                    </div>
                )}

                {/* Table Card */}
                <div style={{ background: '#1e293b', border: '1px solid #E2E8F0', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
                            Washed Raw Materials Stock
                        </h2>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                            {readyMaterials.length} Colors / Items
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>
                            Loading ready raw materials...
                        </div>
                    ) : readyMaterials.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>🧼</div>
                            <div style={{ fontWeight: 600, color: '#fff' }}>No Ready Raw Materials Yet</div>
                            <p style={{ fontSize: 12, marginTop: 4 }}>Click "+ Add Ready Raw Material" above to store your washed flakes by color.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' }}>
                                        <th style={{ padding: '12px 14px' }}>Color / Material Name</th>
                                        <th style={{ padding: '12px 14px' }}>SKU Code</th>
                                        <th style={{ padding: '12px 14px' }}>Stock Weight (KG)</th>
                                        <th style={{ padding: '12px 14px' }}>Description</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {readyMaterials.map(m => {
                                        const qty = Number(m.stock?.quantity || 0);

                                        return (
                                            <tr key={m.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                                <td style={{ padding: '14px', color: '#fff', fontWeight: 600, fontSize: 14 }}>
                                                    {m.name}
                                                </td>
                                                <td style={{ padding: '14px', color: '#38bdf8', fontSize: 12 }}>
                                                    {m.sku}
                                                </td>
                                                <td style={{ padding: '14px', color: '#10b981', fontWeight: 800, fontSize: 15 }}>
                                                    {qty.toLocaleString()} KG
                                                </td>
                                                <td style={{ padding: '14px', color: '#94a3b8', fontSize: 12, maxWidth: 280 }}>
                                                    {m.description || '—'}
                                                </td>
                                                <td style={{ padding: '14px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => { setSelectedMaterial(m); setAddKg(''); setShowStockModal(true); }}
                                                            style={{ background: '#10b98122', border: '1px solid #10b98155', color: '#10b981', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}
                                                        >
                                                            + Add Weight
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(m.id, m.name)}
                                                            style={{ background: '#ef444422', border: '1px solid #ef444455', color: '#ef4444', fontSize: 11, padding: '5px 8px', borderRadius: 6, cursor: 'pointer' }}
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

                {/* MODAL: ADD NEW READY RAW MATERIAL */}
                {showAddModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
                        <div style={{ background: '#1e293b', border: '1px solid #E2E8F0', borderRadius: 16, maxWidth: 480, width: '100%', padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
                                + Add Ready Raw Material
                            </h2>
                            <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 18px' }}>
                                Store a new washed regrind item with its color, weight, and description.
                            </p>

                            <form onSubmit={handleCreateMaterial}>
                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: 'block', color: '#475569', fontSize: 13, marginBottom: 6 }}>
                                        Material / Color Name *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Natural Clear Flakes, Milky White, Blue Drum Flakes"
                                        required
                                        style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #475569', borderRadius: 8, color: '#fff', fontSize: 13 }}
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                    />
                                </div>

                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: 'block', color: '#475569', fontSize: 13, marginBottom: 6 }}>
                                        Initial Weight in Stock (KG)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="e.g. 500"
                                        style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #475569', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700 }}
                                        value={formWeight}
                                        onChange={e => setFormWeight(e.target.value)}
                                    />
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ display: 'block', color: '#475569', fontSize: 13, marginBottom: 6 }}>
                                        Description / Notes
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="e.g. Clean washed bottle regrind, transparent grade A"
                                        style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #475569', borderRadius: 8, color: '#fff', fontSize: 12 }}
                                        value={formDescription}
                                        onChange={e => setFormDescription(e.target.value)}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        style={{ padding: '10px 18px', background: '#E2E8F0', color: '#475569', borderRadius: 8, border: 'none', fontSize: 13, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        style={{ padding: '10px 20px', background: '#0284c7', color: '#fff', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}
                                    >
                                        {submitting ? 'Saving...' : 'Save Material'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: ADD WEIGHT TO EXISTING READY MATERIAL */}
                {showStockModal && selectedMaterial && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
                        <div style={{ background: '#1e293b', border: '1px solid #E2E8F0', borderRadius: 16, maxWidth: 420, width: '100%', padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
                                + Add Stock Weight
                            </h2>
                            <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 16px' }}>
                                Adding washed kilograms to <strong style={{ color: '#fff' }}>{selectedMaterial.name}</strong>
                            </p>

                            <form onSubmit={handleAddStock}>
                                <div style={{ marginBottom: 18 }}>
                                    <label style={{ display: 'block', color: '#475569', fontSize: 13, marginBottom: 6 }}>
                                        Weight Added (KG) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        required
                                        placeholder="e.g. 250"
                                        style={{ width: '100%', padding: '12px 14px', background: '#0f172a', border: '1px solid #10b981', borderRadius: 8, color: '#fff', fontSize: 16, fontWeight: 700 }}
                                        value={addKg}
                                        onChange={e => setAddKg(e.target.value)}
                                    />
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                        Current Stock: {Number(selectedMaterial.stock?.quantity || 0).toLocaleString()} KG
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowStockModal(false)}
                                        style={{ padding: '10px 18px', background: '#E2E8F0', color: '#475569', borderRadius: 8, border: 'none', fontSize: 13, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        style={{ padding: '10px 20px', background: '#10b981', color: '#fff', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}
                                    >
                                        {submitting ? 'Adding...' : 'Add Weight'}
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
