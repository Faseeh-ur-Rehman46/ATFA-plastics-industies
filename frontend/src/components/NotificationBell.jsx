import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useNotifications from '../hooks/useNotifications';
import useBreakpoint from '../hooks/useBreakpoint';

export default function NotificationBell() {
    const { notifications, unreadCount, markRead, markAllRead, deleteNotification, clearAll } = useNotifications();
    const [open, setOpen] = useState(false);
    const ref  = useRef(null);
    const navigate = useNavigate();
    const { isMobile, isTablet } = useBreakpoint();

    // Close panel when clicking outside
    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleNotifClick = (n) => {
        if (!n.is_read) markRead(n.id);
        if (n.product) navigate('/low-stock');
        setOpen(false);
    };

    const formatTime = (dateStr) => new Date(dateStr).toLocaleString();

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* Bell button */}
            <button
                onClick={() => setOpen(o => !o)}
                title="Notifications"
                style={{
                    background: open ? '#EEF4FF' : '#F8FAFC',
                    border: '1px solid ' + (open ? '#1E6BFF' : '#E2E8F0'),
                    borderRadius: 10,
                    cursor: 'pointer',
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'all 0.15s',
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={open ? '#1E6BFF' : '#64748B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        backgroundColor: '#EF4444',
                        border: '2px solid #FFFFFF',
                    }} />
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div style={{
                    position: isMobile ? 'fixed' : 'absolute',
                    top: isMobile ? 62 : 48,
                    right: 0,
                    width: isMobile ? 'min(94vw, 360px)' : (isTablet ? 340 : 360),
                    maxHeight: isMobile ? '70vh' : 'min(70vh, 460px)',
                    overflowY: 'auto',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5EAF2',
                    borderRadius: 14,
                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
                    zIndex: 4000,
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        borderBottom: '1px solid #E5EAF2',
                        position: 'sticky',
                        top: 0,
                        backgroundColor: '#FFFFFF',
                        zIndex: 1,
                    }}>
                        <span style={{ color: '#0F172A', fontWeight: 700, fontSize: 14 }}>
                            Notifications {unreadCount > 0 && (
                                <span style={{ color: '#EF4444', fontSize: 12 }}>({unreadCount} new)</span>
                            )}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#1E6BFF',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}>
                                    Mark all read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={clearAll} style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94A3B8',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                }}
                                title="Clear all notifications"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    {notifications.length === 0 ? (
                        <div style={{ padding: 28, textAlign: 'center', color: '#94A3B8' }}>
                            <div style={{ fontSize: 26, marginBottom: 8 }}>🔕</div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>No notifications yet</div>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div
                                key={n.id}
                                onClick={() => handleNotifClick(n)}
                                style={{
                                    padding: '12px 18px',
                                    borderBottom: '1px solid #F1F5F9',
                                    cursor: 'pointer',
                                    backgroundColor: n.is_read ? '#FFFFFF' : '#EEF4FF',
                                    display: 'flex',
                                    gap: 12,
                                    alignItems: 'flex-start',
                                    position: 'relative',
                                    transition: 'background 0.15s',
                                }}
                            >
                                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                                    {n.is_read ? '📭' : '📬'}
                                </span>
                                <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
                                    <div style={{
                                        color: '#0F172A',
                                        fontSize: 13,
                                        fontWeight: n.is_read ? 500 : 700,
                                        marginBottom: 3,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {n.title}
                                    </div>
                                    <div style={{
                                        color: '#64748B',
                                        fontSize: 12,
                                        lineHeight: 1.4,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}>
                                        {n.message}
                                    </div>
                                    <div style={{ color: '#94A3B8', fontSize: 10, marginTop: 4 }}>
                                        {formatTime(n.created_at)}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(n.id);
                                    }}
                                    title="Dismiss"
                                    style={{
                                        position: 'absolute',
                                        top: 10,
                                        right: 12,
                                        background: 'none',
                                        border: 'none',
                                        color: '#94A3B8',
                                        cursor: 'pointer',
                                        fontSize: 12,
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    )}

                    {/* Footer link */}
                    {notifications.length > 0 && (
                        <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: '1px solid #E5EAF2' }}>
                            <button onClick={() => { navigate('/low-stock'); setOpen(false); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#1E6BFF',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                }}>
                                View Low Stock Report →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
