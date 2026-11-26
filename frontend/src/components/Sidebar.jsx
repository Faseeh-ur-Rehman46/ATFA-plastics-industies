import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useBreakpoint from "../hooks/useBreakpoint";
import NexaLogo from "./NexaLogo";

const SIDEBAR_SCROLL_KEY = "sidebar-scroll-top";

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isMobile, isTablet } = useBreakpoint();
    const { user, logout, isAdmin, isSuperUser, can, canManageUsers } = useAuth();
    const scrollAreaRef = useRef(null);
    const [openSubmenu, setOpenSubmenu] = useState(null);

    // Chevron SVG
    const Chevron = ({ open }) => (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
                marginLeft: 'auto',
                transition: 'transform 0.2s ease',
                transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                opacity: 0.6,
            }}
        >
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );

    // Primary items mapped to the screenshot
    const navItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            ),
            path: '/dashboard',
        },
        ...(canManageUsers() ? [{
            id: 'hr',
            label: 'HR',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ),
            path: '/users',
            subItems: [
                { label: 'Staff & Roles', path: '/users' },
                { label: 'Activity Logs', path: '/audit-log' },
            ]
        }] : []),
        {
            id: 'finance',
            label: 'Finance',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
            ),
            path: '/customers',
            subItems: [
                { label: 'Khaata (Ledger)', path: '/customers' },
                ...(isSuperUser() ? [{ label: 'Profit Analytics', path: '/profits' }] : []),
                ...(can('vouchers.manage') ? [{ label: 'Discount Vouchers', path: '/vouchers' }] : []),
            ]
        },
        {
            id: 'inventory',
            label: 'Inventory',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
            ),
            path: '/products',
            subItems: [
                { label: 'Catalog & Stock', path: '/products' },
                { label: 'Categories', path: '/categories' },
                { label: 'Ready Raw Material', path: '/ready-raw' },
                { label: 'Waste Management', path: '/waste' },
                { label: 'Low Stock Alert', path: '/low-stock' },
            ]
        },
        {
            id: 'sales',
            label: 'Sales',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="20" x2="12" y2="10" />
                    <line x1="18" y1="20" x2="18" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="16" />
                </svg>
            ),
            path: '/sales',
            subItems: [
                { label: 'POS Terminal', path: '/sales' },
                { label: 'Sales History', path: '/sales-history' },
            ]
        },
        ...(can('purchases.manage') ? [{
            id: 'procurement',
            label: 'Procurement',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
            ),
            path: '/purchases',
            subItems: [
                { label: 'Purchase Orders', path: '/purchases' },
                { label: 'Suppliers', path: '/suppliers' },
            ]
        }] : []),
        ...(can('audit.view') ? [{
            id: 'attendance',
            label: 'Attendance',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
            ),
            path: '/audit-log',
        }] : []),
        ...(can('forecast.view') ? [{
            id: 'reports',
            label: 'Reports',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
            ),
            path: '/demand-forecast',
        }] : []),
        {
            id: 'settings',
            label: 'Settings',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            ),
            path: '/settings',
        },
    ];

    const isActive = (path, subItems) => {
        if (location.pathname === path) return true;
        if (subItems && subItems.some(sub => location.pathname === sub.path)) return true;
        if (path === '/customers' && ['/khata', '/khaata', '/ledger'].includes(location.pathname)) return true;
        return false;
    };

    useEffect(() => {
        if (isMobile || isTablet) return;
        const scrollArea = scrollAreaRef.current;
        if (!scrollArea) return;
        const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
        if (saved !== null) {
            scrollArea.scrollTop = Number(saved) || 0;
        }
    }, [isMobile, isTablet, location.pathname]);

    const handleScroll = () => {
        if (isMobile || isTablet) return;
        const scrollArea = scrollAreaRef.current;
        if (!scrollArea) return;
        sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(scrollArea.scrollTop));
    };

    // ── MOBILE TAB BAR ────────────────────────────────────────────────────────
    if (isMobile) {
        return (
            <div style={{
                position: "fixed", bottom: 0, left: 0, right: 0, height: 60,
                background: "#FFFFFF", display: "flex", alignItems: "center",
                justifyContent: "space-around", zIndex: 1000,
                borderTop: "1px solid #E5EAF2", boxShadow: "0 -2px 10px rgba(0,0,0,0.03)"
            }}>
                {navItems.slice(0, 5).map((item) => {
                    const active = isActive(item.path, item.subItems);
                    return (
                        <Link key={item.id} to={item.path} style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            gap: 3, textDecoration: "none", padding: "6px 12px",
                            color: active ? "#1E6BFF" : "#64748B",
                        }}>
                            <span style={{ fontSize: 18 }}>{item.icon}</span>
                            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        );
    }

    // ── TABLET COLLAPSED SIDEBAR ──────────────────────────────────────────────
    if (isTablet) {
        return (
            <div style={{
                position: "fixed", top: 0, left: 0, bottom: 0, width: 72,
                background: "#FFFFFF", display: "flex", flexDirection: "column",
                alignItems: "center", paddingTop: 18, zIndex: 1000,
                borderRight: "1px solid #E5EAF2"
            }}>
                <div style={{ marginBottom: 24 }}>
                    <NexaLogo size={32} showText={false} />
                </div>
                {navItems.map((item) => {
                    const active = isActive(item.path, item.subItems);
                    return (
                        <Link key={item.id} to={item.path} title={item.label} style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            width: 44, height: 44, borderRadius: 10, marginBottom: 8,
                            background: active ? "#EEF4FF" : "transparent",
                            color: active ? "#1E6BFF" : "#64748B",
                            textDecoration: "none", transition: "all 0.15s"
                        }}>
                            {item.icon}
                        </Link>
                    );
                })}
            </div>
        );
    }

    // ── DESKTOP FULL SIDEBAR ──────────────────────────────────────────────────
    return (
        <aside style={styles.sidebar}>
            {/* Top Brand Logo */}
            <div style={styles.brandHeader}>
                <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                    <NexaLogo size={34} showText={true} />
                </Link>
            </div>

            {/* Scrollable Navigation List */}
            <div
                ref={scrollAreaRef}
                onScroll={handleScroll}
                style={styles.navScrollArea}
            >
                <div style={{ padding: "16px 14px" }}>
                    {navItems.map((item) => {
                        const active = isActive(item.path, item.subItems);
                        const hasSub = item.subItems && item.subItems.length > 0;
                        const isSubmenuOpen = openSubmenu === item.id;

                        return (
                            <div key={item.id} style={{ marginBottom: 4 }}>
                                <div
                                    onClick={() => {
                                        if (hasSub) {
                                            setOpenSubmenu(isSubmenuOpen ? null : item.id);
                                        } else {
                                            navigate(item.path);
                                        }
                                    }}
                                    style={{
                                        ...styles.navItem,
                                        backgroundColor: active ? '#EEF4FF' : 'transparent',
                                        color: active ? '#1E6BFF' : '#475569',
                                        fontWeight: active ? 600 : 500,
                                    }}
                                >
                                    <span style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: active ? '#1E6BFF' : '#64748B',
                                        fontSize: 18
                                    }}>
                                        {item.icon}
                                    </span>
                                    <span style={{ fontSize: 14 }}>{item.label}</span>
                                    {hasSub && <Chevron open={isSubmenuOpen} />}
                                </div>

                                {/* Submenu */}
                                {hasSub && isSubmenuOpen && (
                                    <div style={styles.submenu}>
                                        {item.subItems.map((sub) => {
                                            const subActive = location.pathname === sub.path;
                                            return (
                                                <Link
                                                    key={sub.path}
                                                    to={sub.path}
                                                    style={{
                                                        ...styles.submenuItem,
                                                        color: subActive ? '#1E6BFF' : '#64748B',
                                                        fontWeight: subActive ? 700 : 500,
                                                        backgroundColor: subActive ? '#EEF4FF88' : 'transparent',
                                                    }}
                                                >
                                                    <span style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: '50%',
                                                        backgroundColor: subActive ? '#1E6BFF' : '#CBD5E1',
                                                        marginRight: 10
                                                    }} />
                                                    {sub.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Promo Gradient Card */}
            <div style={styles.promoContainer}>
                <div style={styles.promoCard}>
                    <div style={styles.promoIconBadge}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10" />
                            <line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                    </div>
                    <div style={styles.promoTitle}>ATFA Plastic</div>
                    <div style={styles.promoText}>
                        Enterprise Inventory & POS Management System.
                    </div>
                </div>
            </div>
        </aside>
    );
}

const styles = {
    sidebar: {
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 240,
        backgroundColor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        borderRight: "1px solid #E5EAF2",
    },
    brandHeader: {
        height: 68,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        borderBottom: "1px solid #E5EAF2",
    },
    navScrollArea: {
        flex: 1,
        overflowY: "auto",
        scrollbarWidth: "none",
    },
    navItem: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 0.15s ease",
        userSelect: "none",
    },
    submenu: {
        paddingLeft: 28,
        paddingTop: 4,
        paddingBottom: 4,
        display: "flex",
        flexDirection: "column",
        gap: 2,
    },
    submenuItem: {
        display: "flex",
        alignItems: "center",
        padding: "7px 12px",
        borderRadius: 8,
        fontSize: 13,
        textDecoration: "none",
        transition: "all 0.15s",
    },
    promoContainer: {
        padding: "16px 14px 20px",
    },
    promoCard: {
        background: "linear-gradient(135deg, #1E6BFF 0%, #06B6D4 100%)",
        borderRadius: 16,
        padding: "18px 16px",
        color: "#FFFFFF",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 8px 20px rgba(30, 107, 255, 0.25)",
    },
    promoIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    promoTitle: {
        fontSize: 15,
        fontWeight: 800,
        color: "#FFFFFF",
        letterSpacing: "-0.2px",
        marginBottom: 4,
    },
    promoText: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.9)",
        lineHeight: 1.35,
    },
};
