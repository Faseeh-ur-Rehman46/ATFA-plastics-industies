import logoThemeLight from '../assets/logo_theme_light.png';
import logoThemeDark from '../assets/logo_theme_dark.png';

export default function NexaLogo({
    size = 36,
    showText = true,
    textColor = '#0F172A',
    isDark = false
}) {
    const logoSrc = isDark ? logoThemeDark : logoThemeLight;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img
                src={logoSrc}
                alt="ATFA Plastic Industry"
                style={{
                    width: size,
                    height: size,
                    borderRadius: 9,
                    objectFit: 'cover',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid #C7D9FE',
                    boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.35)' : '0 2px 8px rgba(30, 107, 255, 0.15)',
                    flexShrink: 0,
                }}
            />
            {showText && (
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{
                            fontSize: 17,
                            fontWeight: 800,
                            color: isDark ? '#FFFFFF' : textColor,
                            letterSpacing: '0.2px',
                            fontFamily: "'Inter', -apple-system, sans-serif"
                        }}>
                            ATFA
                        </span>
                        <span style={{
                            fontSize: 17,
                            fontWeight: 800,
                            color: isDark ? '#93C5FD' : '#1E6BFF',
                            letterSpacing: '-0.2px',
                            fontFamily: "'Inter', -apple-system, sans-serif"
                        }}>
                            PLASTIC
                        </span>
                    </div>
                    <span style={{
                        fontSize: 9.5,
                        fontWeight: 600,
                        letterSpacing: '0.6px',
                        textTransform: 'uppercase',
                        color: isDark ? 'rgba(255, 255, 255, 0.75)' : '#1E6BFF',
                        marginTop: 2,
                    }}>
                        Industry & POS
                    </span>
                </div>
            )}
        </div>
    );
}
