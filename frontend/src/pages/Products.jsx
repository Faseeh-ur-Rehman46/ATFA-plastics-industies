import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Base URL for media files
const MEDIA_BASE = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
    : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : 'http://127.0.0.1:8000');

export default function Products() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    
    const navigate = useNavigate();
    const location = useLocation();
    const rowRefs = useRef({});

    // Search & Filter state
    const [materialTab, setMaterialTab] = useState('final_product');
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const [activeFocusId, setActiveFocusId] = useState(null);
    const { can } = useAuth();
    const canCreateProduct = can('products.create');
    const canEditProduct = can('products.update');
    const canDeleteProduct = can('products.delete');
    const canManagePurchases = can('purchases.manage');
    const canManageCategories = can('categories.manage');
    const canManageSuppliers = can('suppliers.manage');
    const showActionButtons = canCreateProduct || canManagePurchases || canManageCategories || canManageSuppliers;
    const showRowActions = canEditProduct || canDeleteProduct;

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            API.get('products/'),
            API.get('categories/'),
        ]).then(([prodRes, catRes]) => {
            setProducts(prodRes.data);
            setCategories(catRes.data);
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        const id = setTimeout(() => {
            fetchData();
        }, 0);
        return () => clearTimeout(id);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const focusProductId = params.get('focusProductId');
        if (!focusProductId || loading) return;

        const prepTimer = setTimeout(() => {
            setSearch('');
            setSelectedCategory('');
            setStockFilter('');
            setActiveFocusId(String(focusProductId));
        }, 0);

        const scrollTimer = setTimeout(() => {
            const el = rowRefs.current[String(focusProductId)];
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 120);

        const clearTimer = setTimeout(() => {
            setActiveFocusId(null);
        }, 3500);

        return () => {
            clearTimeout(prepTimer);
            clearTimeout(scrollTimer);
            clearTimeout(clearTimer);
        };
    }, [location.search, loading]);

    const handleDelete = (id) => {
        setItemToDelete(id);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await API.delete('products/' + itemToDelete + '/');
            fetchData();
            setShowConfirm(false);
            setItemToDelete(null);
        } catch {
            // Keep modal open when delete fails.
        }
    };

    // Get correct image URL — handles both relative and absolute URLs
    const getImageUrl = (image) => {
        if (!image) return null;
        if (image.startsWith('http')) return image;
        return `${MEDIA_BASE}${image}`;
    };

    // Apply filters
    const stockMeta = (product) => {
        const quantity = Number(product?.stock?.quantity ?? 0);
        const threshold = Number(product?.stock?.low_stock_threshold ?? 10);
        const hasStockRecord = Boolean(product?.stock);
        const isLowStock = hasStockRecord ? quantity <= threshold : true;
        return { quantity, threshold, hasStockRecord, isLowStock };
    };

    const filtered = products.filter(p => {
        const matchMaterial = materialTab === 'all' ? true : (p.material_type === materialTab);
        const matchSearch =
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase());
        const matchCategory = selectedCategory ? String(p.category) === selectedCategory : true;
        const matchStock =
            stockFilter === 'low' ? stockMeta(p).isLowStock :
            stockFilter === 'ok'  ? !stockMeta(p).isLowStock : true;
        return matchMaterial && matchSearch && matchCategory && matchStock;
    });

    const clearFilters = () => { setSearch(''); setSelectedCategory(''); setStockFilter(''); setMaterialTab('all'); };
    const hasActiveFilters = search || selectedCategory || stockFilter || materialTab !== 'all';
    const getDisplayPrices = (product) => {
        const salePrice = Number(product?.sale_price ?? 0);
        const fullPrice = Number(product?.full_price ?? 0);
        const basePrice = Number(product?.price ?? 0);
        const chargedPrice = salePrice > 0 ? salePrice : basePrice;
        const hasDiscount = fullPrice > chargedPrice;
        return { chargedPrice, fullPrice, hasDiscount };
    };

    return (
        <Layout>
            <div style={{ padding: '28px 24px' }}>
                {/* Header */}
                <div style={styles.pageHeader}>
                    <div>
                        <h2 style={styles.pageTitle}>Products</h2>
                        <p style={styles.pageSubtitle}>{products.length} total products</p>
                    </div>
                    {showActionButtons && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {canManagePurchases && (
                                <button onClick={() => navigate('/purchases?openModal=purchase')} style={styles.secondaryBtn}>
                                    🛒 Record Purchase
                                </button>
                            )}
                            {canManageCategories && (
                                <button onClick={() => navigate('/categories')} style={styles.secondaryBtn}>
                                    📁 Categories
                                </button>
                            )}
                            {canManageSuppliers && (
                                <button onClick={() => navigate('/suppliers')} style={styles.secondaryBtn}>
                                    🤝 Suppliers
                                </button>
                            )}
                            {canCreateProduct && (
                                <button onClick={() => navigate('/products/add')} style={styles.addBtn}>
                                    + Add Product
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Material Stage Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', borderBottom: '1px solid #E5EAF2', paddingBottom: 12 }}>
                    {[
                        { id: 'final_product', label: '📦 Final Inventory (Grains / Dana)', icon: '✨' },
                        { id: 'ready_raw',     label: '🧼 Ready Washed Flakes (WIP)',       icon: '🧴' },
                        { id: 'raw_material',  label: '🛒 Raw Scrap Material',              icon: '♻️' },
                        { id: 'waste',         label: '🗑️ Waste Storage',                   icon: '🗑️' },
                        { id: 'all',           label: '🌐 All Items',                       icon: '📋' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setMaterialTab(tab.id)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 10,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: materialTab === tab.id ? '1px solid #1E6BFF' : '1px solid #E2E8F0',
                                background: materialTab === tab.id ? '#EEF4FF' : '#FFFFFF',
                                color: materialTab === tab.id ? '#1E6BFF' : '#64748B',
                                boxShadow: materialTab === tab.id ? '0 1px 3px rgba(30,107,255,0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
                                transition: 'all 0.15s',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Filter Bar */}
                <div style={styles.filterBar}>
                    <div style={styles.searchWrapper}>
                        <span style={styles.searchIcon}>🔍</span>
                        <input
                            style={styles.searchInput}
                            placeholder="Search by name or SKU..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && <button onClick={() => setSearch('')} style={styles.clearBtn}>✖</button>}
                    </div>
                    <select style={styles.filterSelect} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </select>
                    <select style={styles.filterSelect} value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
                        <option value="">All Stock Levels</option>
                        <option value="low">⚠️ Low Stock Only</option>
                        <option value="ok">✓ In Stock Only</option>
                    </select>
                    {hasActiveFilters && (
                        <button onClick={clearFilters} style={styles.clearFiltersBtn}>Clear Filters</button>
                    )}
                    <div style={styles.resultCount}>{filtered.length} of {products.length} shown</div>
                </div>

                {/* Table */}
                {loading ? (
                    <div style={styles.emptyBox}><div style={{ color: '#94A3B8' }}>Loading products...</div></div>
                ) : filtered.length === 0 ? (
                    <div style={styles.emptyBox}>
                        <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 16 }}>No products found</div>
                        <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>Try adjusting your search or filters</div>
                        {hasActiveFilters && <button onClick={clearFilters} style={{ ...styles.addBtn, marginTop: 16 }}>Clear Filters</button>}
                    </div>
                ) : (
                    <div style={styles.tableCard}>
                        <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHead}>
                                {['Image', 'Product', 'SKU', 'Category', 'Price', 'Stock', 'Status', ...(showRowActions ? ['Actions'] : [])].map(h => (
                                    <th key={h} style={styles.th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p, i) => {
                                const imgUrl = getImageUrl(p.image);
                                const stock = stockMeta(p);
                                return (
                                    <tr
                                        key={p.id}
                                        ref={(el) => { rowRefs.current[String(p.id)] = el; }}
                                        style={{
                                            ...styles.tableRow,
                                            backgroundColor: activeFocusId === String(p.id)
                                                ? '#EEF4FF'
                                                : (i % 2 === 0 ? '#FFFFFF' : '#FAFCFF'),
                                            boxShadow: activeFocusId === String(p.id) ? 'inset 0 0 0 1px #1E6BFF' : 'none',
                                        }}
                                    >

                                        {/* Image */}
                                        <td style={styles.td}>
                                            {imgUrl ? (
                                                <img
                                                    src={imgUrl}
                                                    alt={p.name}
                                                    style={styles.productImg}
                                                    onError={e => {
                                                        // If image fails to load, show placeholder
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div style={{ ...styles.noImg, display: imgUrl ? 'none' : 'flex' }}>📦</div>
                                        </td>

                                        {/* Name */}
                                        <td style={styles.td}>
                                            <div style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{p.name}</div>
                                            {p.description && (
                                                <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                                                    {p.description.slice(0, 45)}{p.description.length > 45 ? '...' : ''}
                                                </div>
                                            )}
                                        </td>

                                        {/* SKU */}
                                        <td style={styles.td}>
                                            <code style={styles.skuBadge}>{p.sku}</code>
                                        </td>

                                        {/* Category */}
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span style={styles.categoryBadge}>{p.category_name || '—'}</span>
                                                <span style={{
                                                    ...styles.categoryBadge,
                                                    backgroundColor: p.unit === 'ton' ? '#FEF3C7' : '#F1F5F9',
                                                    color: p.unit === 'ton' ? '#B45309' : '#475569',
                                                    border: p.unit === 'ton' ? '1px solid #FDE68A' : '1px solid #E2E8F0',
                                                    fontWeight: 700,
                                                    fontSize: 11,
                                                    padding: '2px 6px',
                                                }}>
                                                    {p.unit === 'ton' ? 'MT' : 'KG'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Price */}
                                        <td style={styles.td}>
                                            {(() => {
                                                const { chargedPrice, fullPrice, hasDiscount } = getDisplayPrices(p);
                                                const unitLabel = p.unit === 'ton' ? 'MT' : 'KG';
                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        {hasDiscount && (
                                                            <span style={{ color: '#94A3B8', fontSize: 12, textDecoration: 'line-through' }}>
                                                                Rs. {fullPrice.toLocaleString()} /{unitLabel}
                                                            </span>
                                                        )}
                                                        <span style={{ fontWeight: 700, color: hasDiscount ? '#059669' : '#0F172A' }}>
                                                            Rs. {chargedPrice.toLocaleString()} <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>/{unitLabel}</span>
                                                        </span>
                                                        {p.unit === 'ton' && chargedPrice > 0 && (
                                                            <span style={{ color: '#64748B', fontSize: 10 }}>
                                                                ≈ Rs. {(chargedPrice / 1000).toFixed(2)} /KG
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>

                                        {/* Stock */}
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                                <span style={{ fontWeight: 700, fontSize: 15, color: stock.isLowStock ? '#EF4444' : '#10B981' }}>
                                                    {stock.quantity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                                </span>
                                                <span style={{ color: '#64748B', fontSize: 12, fontWeight: 600 }}>KG</span>
                                            </div>
                                            <div style={{ color: '#64748B', fontSize: 12, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span>🚛</span>
                                                <span style={{ color: '#1E6BFF', fontWeight: 600 }}>
                                                    {(stock.quantity / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} MT
                                                </span>
                                            </div>
                                            <div style={{ color: '#64748B', fontSize: 11, marginTop: 3 }}>
                                                Alert: ≤ {stock.threshold} KG
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.statusBadge,
                                                backgroundColor: stock.isLowStock ? '#450a0a66' : '#14532d66',
                                                color: stock.isLowStock ? '#fca5a5' : '#86efac',
                                                border: `1px solid ${stock.isLowStock ? '#dc262688' : '#16a34a88'}`,
                                            }}>
                                                {!stock.hasStockRecord ? '⚠️ No Stock Record' : (stock.isLowStock ? '⚠️ Low Stock' : '✓ In Stock')}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        {showRowActions && (
                                            <td style={styles.td}>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    {canEditProduct && (
                                                        <button onClick={() => navigate(`/products/edit/${p.id}`)} style={styles.editBtn}>Edit</button>
                                                    )}
                                                    {canDeleteProduct && (
                                                        <button onClick={() => handleDelete(p.id)} style={styles.deleteBtn}>Delete</button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                        </table>
                    </div>
                )}
            </div>
        <ConfirmModal
                open={showConfirm}
                title="Delete Product"
                message="Are you sure you want to delete this product? This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setShowConfirm(false)}
                confirmText="Delete"
            />
        </Layout>
    );
}

const styles = {
    pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    pageTitle: { margin: 0, fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' },
    pageSubtitle: { margin: '4px 0 0', color: '#64748B', fontSize: 14 },
    addBtn: { backgroundColor: '#1E6BFF', color: '#FFFFFF', border: 'none', padding: '10px 22px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, boxShadow: '0 2px 8px rgba(30,107,255,0.25)' },
    secondaryBtn: { backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' },
    filterBar: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap', backgroundColor: '#FFFFFF', border: '1px solid #E5EAF2', padding: '16px 20px', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.03)' },
    searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 200 },
    searchIcon: { position: 'absolute', left: 12, fontSize: 15, pointerEvents: 'none' },
    searchInput: { width: '100%', padding: '9px 36px 9px 36px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', backgroundColor: '#F8FAFC', color: '#0F172A', boxSizing: 'border-box' },
    clearBtn: { position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 14, padding: 0 },
    filterSelect: { padding: '9px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, backgroundColor: '#F8FAFC', cursor: 'pointer', outline: 'none', color: '#0F172A' },
    clearFiltersBtn: { padding: '9px 16px', borderRadius: 8, border: '1px solid #FECACA', backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 13, cursor: 'pointer', fontWeight: 600 },
    resultCount: { color: '#64748B', fontSize: 13, whiteSpace: 'nowrap', marginLeft: 'auto', fontWeight: 500 },
    emptyBox: { textAlign: 'center', padding: 60, backgroundColor: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 16, boxShadow: '0 2px 8px rgba(15,23,42,0.03)' },
    tableCard: { backgroundColor: '#FFFFFF', borderRadius: 16, border: '1px solid #E5EAF2', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.03)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tableHead: { backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5EAF2' },
    th: { padding: '14px 16px', textAlign: 'left', color: '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' },
    tableRow: { borderBottom: '1px solid #F1F5F9' },
    td: { padding: '14px 16px', verticalAlign: 'middle', color: '#0F172A' },
    productImg: { width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid #E2E8F0', display: 'block' },
    noImg: { width: 48, height: 48, backgroundColor: '#F8FAFC', borderRadius: 8, alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '1px solid #E2E8F0' },
    skuBadge: { backgroundColor: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', border: '1px solid #E2E8F0' },
    categoryBadge: { backgroundColor: '#EEF4FF', color: '#1E6BFF', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid #C7D9FE' },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        minWidth: 108,
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: 0.2,
    },
    editBtn: {
        backgroundColor: '#EEF4FF',
        color: '#1E6BFF',
        border: '1px solid #C7D9FE',
        padding: '6px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
    },
    deleteBtn: {
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        border: '1px solid #FECACA',
        padding: '6px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
    },
};
