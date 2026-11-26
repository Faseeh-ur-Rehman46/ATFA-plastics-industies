import { useEffect } from 'react';
import useBreakpoint from '../hooks/useBreakpoint';

export default function FormModal({ open, title, onClose, error, maxWidth = 560, children, footer }) {
    const { isMobile, isTablet } = useBreakpoint();

    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    const computedMaxWidth = isMobile ? Math.min(420, maxWidth) : (isTablet ? Math.min(520, maxWidth) : maxWidth);

    return (
        <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={{ ...styles.modal, maxWidth: computedMaxWidth, padding: isMobile ? 16 : 24 }}>
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>{title}</h3>
                    <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Close modal">
                        ✕
                    </button>
                </div>
                {error && <div style={styles.modalError}>⚠️ {error}</div>}
                {children}
                {footer}
            </div>
        </div>
    );
}

const styles = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16, backdropFilter: 'blur(3px)' },
    modal: { background: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 16, width: '100%', maxHeight: 'min(88vh, 760px)', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.12)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { margin: 0, color: '#0F172A', fontSize: 18, fontWeight: 700 },
    closeBtn: { background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', lineHeight: 1, minWidth: 36, minHeight: 36 },
    modalError: { background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 },
};
