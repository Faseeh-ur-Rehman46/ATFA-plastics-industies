import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NexaLogo from '../components/NexaLogo';

function EyeIcon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a21.77 21.77 0 0 1 5.06-6.94" />
            <path d="M9.9 4.24A10.81 10.81 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-3.12 4.17" />
            <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
            <path d="M1 1l22 22" />
        </svg>
    );
}

export default function Login() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(form.username, form.password);
            navigate('/dashboard');
        } catch (err) {
            if (!err.response) setError('Cannot connect to server. Is Django running?');
            else if (err.response.status === 401) {
                setError(err.response?.data?.detail || 'Incorrect username or password.');
                setForm(prev => ({ ...prev, password: '' }));
                setShowPassword(false);
            }
            else setError(`Error: ${JSON.stringify(err.response?.data)}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            {/* Left Brand Panel */}
            <div style={styles.leftPanel}>
                <div style={styles.leftContent}>
                    <div style={{ marginBottom: 28 }}>
                        <NexaLogo size={48} showText={true} isDark={true} />
                    </div>
                    <h1 style={styles.brandTitle}>ATFA Plastic<br />Industry</h1>
                    <p style={styles.brandDesc}>
                        Enterprise Inventory, POS Billing & Warehouse Operations — all in one centralized platform.
                    </p>
                    <div style={styles.featureList}>
                        {[
                            'Real-time inventory & batch tracking',
                            'Automated POS billing & invoice generation',
                            'AI-driven demand forecasting & insights',
                            'Role-based access & audit logging'
                        ].map(f => (
                            <div key={f} style={styles.featureItem}>
                                <div style={styles.featureCheck}>✓</div>
                                <span>{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Sign-in Panel */}
            <div style={styles.rightPanel}>
                <div style={styles.formCard}>
                    <div style={{ marginBottom: 24 }}>
                        <h2 style={styles.formTitle}>Welcome to ATFA Plastic</h2>
                        <p style={styles.formSubtitle}>Sign in to access your ERP workspace</p>
                    </div>

                    {error && (
                        <div style={styles.errorBox}>
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Username or Email</label>
                            <input
                                style={styles.input}
                                type="text"
                                placeholder="e.g. admin"
                                value={form.username}
                                onChange={e => setForm({ ...form, username: e.target.value })}
                                required
                                autoFocus
                            />
                        </div>

                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Password</label>
                            <div style={styles.passwordWrapper}>
                                <input
                                    style={styles.input}
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    style={styles.eyeBtn}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            style={styles.submitBtn}
                            disabled={loading}
                        >
                            {loading ? 'Authenticating...' : 'Sign In to Workspace'}
                        </button>
                    </form>

                    <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
                        Default Admin: <strong style={{ color: '#1E6BFF' }}>admin</strong> / <strong style={{ color: '#1E6BFF' }}>admin123</strong>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#F4F6FA',
    },
    leftPanel: {
        flex: '1 1 50%',
        background: 'linear-gradient(135deg, #1E6BFF 0%, #06B6D4 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 48px',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
    },
    leftContent: {
        maxWidth: 480,
        zIndex: 2,
    },
    brandTitle: {
        fontSize: 38,
        fontWeight: 800,
        lineHeight: 1.2,
        letterSpacing: '-0.5px',
        marginBottom: 16,
    },
    brandDesc: {
        fontSize: 16,
        lineHeight: 1.6,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 36,
    },
    featureList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
    },
    featureItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 14,
        fontWeight: 500,
        color: 'rgba(255, 255, 255, 0.95)',
    },
    featureCheck: {
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 800,
        flexShrink: 0,
    },
    rightPanel: {
        flex: '1 1 50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
    },
    formCard: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: '40px 36px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        border: '1px solid #E5EAF2',
    },
    formTitle: {
        fontSize: 24,
        fontWeight: 800,
        color: '#0F172A',
        letterSpacing: '-0.3px',
        marginBottom: 6,
    },
    formSubtitle: {
        fontSize: 14,
        color: '#64748B',
    },
    errorBox: {
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        color: '#DC2626',
        borderRadius: 10,
        padding: '12px 14px',
        fontSize: 13,
        marginBottom: 20,
        fontWeight: 500,
    },
    fieldGroup: {
        marginBottom: 20,
    },
    label: {
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        color: '#0F172A',
        marginBottom: 8,
    },
    input: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        padding: '11px 14px',
        fontSize: 14,
        color: '#0F172A',
        transition: 'all 0.15s',
        boxSizing: 'border-box',
    },
    passwordWrapper: {
        position: 'relative',
    },
    eyeBtn: {
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        color: '#94A3B8',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtn: {
        width: '100%',
        backgroundColor: '#1E6BFF',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 10,
        padding: '12px 16px',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(30, 107, 255, 0.25)',
        transition: 'all 0.2s',
        marginTop: 6,
    },
};
