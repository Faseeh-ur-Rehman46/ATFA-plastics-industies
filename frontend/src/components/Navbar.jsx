import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Navbar({ onSearch }) {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const quickAddRef = useRef(null);
    const profileRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (quickAddRef.current && !quickAddRef.current.contains(e.target)) {
                setQuickAddOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Global keyboard shortcut Ctrl+K focus
    const searchInputRef = useRef(null);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const initials = (user?.username || 'Admin')
        .split(' ')
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const displayName = user?.username ? (user.username.charAt(0).toUpperCase() + user.username.slice(1)) : 'ATFA Admin';
    const roleLabel = isAdmin() ? 'Administrator' : 'Staff Member';

    return (
        <header style={styles.header}>
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
                <div style={styles.searchWrapper}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search across ATFA Plastic (e.g., product, invoice, PO, stock...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                    />
                    <div style={styles.kbdBadge}>Ctrl + K</div>
                </div>
            </form>

            {/* Right Actions */}
            <div style={styles.rightSection}>
                {/* Quick Add Button */}
                <div style={{ position: 'relative' }} ref={quickAddRef}>
                    <button
                        onClick={() => setQuickAddOpen(!quickAddOpen)}
                        style={styles.quickAddBtn}
                    >
                        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                        <span>Quick Add</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>

                    {quickAddOpen && (
                        <div style={styles.dropdownMenu}>
                            <Link to="/sales" onClick={() => setQuickAddOpen(false)} style={styles.dropdownItem}>
                                <span style={styles.dropdownIcon}>💰</span>
                                <div>
                                    <div style={styles.dropdownTitle}>New Sale / POS</div>
                                    <div style={styles.dropdownSub}>Checkout & invoice creation</div>
                                </div>
                            </Link>
                            <Link to="/products/add" onClick={() => setQuickAddOpen(false)} style={styles.dropdownItem}>
                                <span style={styles.dropdownIcon}>📦</span>
                                <div>
                                    <div style={styles.dropdownTitle}>Add Product</div>
                                    <div style={styles.dropdownSub}>Catalog new stock item</div>
                                </div>
                            </Link>
                            <Link to="/purchases" onClick={() => setQuickAddOpen(false)} style={styles.dropdownItem}>
                                <span style={styles.dropdownIcon}>🛒</span>
                                <div>
                                    <div style={styles.dropdownTitle}>New Purchase Order</div>
                                    <div style={styles.dropdownSub}>Restock or supplier intake</div>
                                </div>
                            </Link>
                            <Link to="/customers" onClick={() => setQuickAddOpen(false)} style={styles.dropdownItem}>
                                <span style={styles.dropdownIcon}>📒</span>
                                <div>
                                    <div style={styles.dropdownTitle}>Add Customer / Khaata</div>
                                    <div style={styles.dropdownSub}>Create debtor account</div>
                                </div>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <div style={styles.iconButtonWrapper}>
                    <NotificationBell />
                </div>

                {/* Vertical Divider */}
                <div style={styles.divider} />

                {/* User Profile */}
                <div style={{ position: 'relative' }} ref={profileRef}>
                    <div
                        onClick={() => setProfileOpen(!profileOpen)}
                        style={styles.userProfile}
                    >
                        <div style={styles.avatar}>
                            {initials}
                        </div>
                        <div style={styles.userInfo}>
                            <div style={styles.userName}>{displayName}</div>
                            <div style={styles.userRole}>{roleLabel}</div>
                        </div>
                    </div>

                    {profileOpen && (
                        <div style={{ ...styles.dropdownMenu, right: 0, minWidth: 200 }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5EAF2' }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{displayName}</div>
                                <div style={{ fontSize: 12, color: '#64748B' }}>{user?.email || `${user?.username}@atfaplastic.local`}</div>
                            </div>
                            <Link to="/settings" onClick={() => setProfileOpen(false)} style={styles.dropdownItem}>
                                <span style={{ fontSize: 16 }}>⚙️</span>
                                <span style={styles.dropdownTitle}>Settings</span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                style={{
                                    ...styles.dropdownItem,
                                    width: '100%',
                                    background: 'none',
                                    border: 'none',
                                    color: '#DC2626',
                                    cursor: 'pointer'
                                }}
                            >
                                <span style={{ fontSize: 16 }}>🚪</span>
                                <span style={{ ...styles.dropdownTitle, color: '#DC2626' }}>Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

const styles = {
    header: {
        height: 68,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5EAF2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 900,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    },
    searchForm: {
        flex: 1,
        maxWidth: 540,
    },
    searchWrapper: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        padding: '8px 14px',
        gap: 10,
        transition: 'all 0.2s',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        background: 'transparent',
        fontSize: 13,
        color: '#0F172A',
        outline: 'none',
    },
    kbdBadge: {
        fontSize: 11,
        fontWeight: 600,
        color: '#64748B',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 6,
        padding: '2px 7px',
        userSelect: 'none',
    },
    rightSection: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
    },
    quickAddBtn: {
        backgroundColor: '#1E6BFF',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 9,
        padding: '9px 16px',
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(30, 107, 255, 0.25)',
        transition: 'all 0.2s',
    },
    iconButtonWrapper: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        width: 1,
        height: 28,
        backgroundColor: '#E5EAF2',
    },
    userProfile: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: 8,
        transition: 'background 0.2s',
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: '50%',
        backgroundColor: '#DBEAFE',
        color: '#1E6BFF',
        fontWeight: 700,
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userInfo: {
        display: 'flex',
        flexDirection: 'column',
    },
    userName: {
        fontSize: 13,
        fontWeight: 700,
        color: '#0F172A',
        lineHeight: 1.2,
    },
    userRole: {
        fontSize: 11,
        color: '#64748B',
        lineHeight: 1.2,
    },
    dropdownMenu: {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5EAF2',
        borderRadius: 12,
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1)',
        minWidth: 260,
        padding: '6px 0',
        zIndex: 1000,
        animation: 'fadeIn 0.15s ease',
    },
    dropdownItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        textDecoration: 'none',
        color: '#0F172A',
        transition: 'background 0.15s',
    },
    dropdownIcon: {
        fontSize: 18,
        width: 28,
        textAlign: 'center',
    },
    dropdownTitle: {
        fontSize: 13,
        fontWeight: 600,
        color: '#0F172A',
    },
    dropdownSub: {
        fontSize: 11,
        color: '#64748B',
    },
};
