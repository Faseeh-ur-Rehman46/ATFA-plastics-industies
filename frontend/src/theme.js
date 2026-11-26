// NexaERP Modern SaaS Design Theme Tokens
// Clean, high-contrast, vivid Royal Blue and Cyan gradient palette

export const theme = {
    // Brand & Primary
    primary: {
        main: '#1E6BFF',
        hover: '#1555D1',
        light: '#EEF4FF',
        subtle: '#E0EDFF',
        dark: '#0F3FAA',
        gradient: 'linear-gradient(135deg, #1E6BFF 0%, #06B6D4 100%)',
        glow: '0 4px 18px rgba(30, 107, 255, 0.25)',
    },

    // Backgrounds & Surfaces
    bg: {
        canvas: '#F4F6FA',         // Soft subtle gray-blue background
        surface: '#FFFFFF',        // Pure white card and container surface
        sidebar: '#FFFFFF',        // Pure white sidebar
        header: '#FFFFFF',         // Pure white top bar
        input: '#F8FAFC',          // Soft input background
        elevated: '#F1F5F9',       // Raised pill containers
    },

    // Borders & Dividers
    border: {
        subtle: '#F1F5F9',
        default: '#E5EAF2',        // Clean subtle border
        hover: '#CBD5E1',
        primary: '#1E6BFF',
        focus: 'rgba(30, 107, 255, 0.25)',
    },

    // Text Colors
    text: {
        primary: '#0F172A',        // High-contrast slate heading
        secondary: '#475569',      // Medium slate body text
        muted: '#94A3B8',          // Placeholder & helper text
        inverse: '#FFFFFF',
        link: '#1E6BFF',
    },

    // Functional Status Colors & Soft Pastel Badges
    status: {
        success: '#059669',
        successBg: '#ECFDF5',
        successBorder: '#A7F3D0',

        danger: '#DC2626',
        dangerBg: '#FEF2F2',
        dangerBorder: '#FECACA',

        warning: '#D97706',
        warningBg: '#FFFBEB',
        warningBorder: '#FDE68A',

        info: '#0284C7',
        infoBg: '#E0F2FE',
        infoBorder: '#BAE6FD',

        purple: '#7C3AED',
        purpleBg: '#F3EEFF',
        purpleBorder: '#DDD6FE',

        cyan: '#0D9488',
        cyanBg: '#E6FAF8',
        cyanBorder: '#99F6E4',

        orange: '#EA580C',
        orangeBg: '#FFF4EC',
        orangeBorder: '#FED7AA',
    },

    // Shadows
    shadow: {
        sm: '0 1px 3px rgba(0, 0, 0, 0.03)',
        card: '0 2px 8px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
        elevated: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        hover: '0 6px 16px rgba(30, 107, 255, 0.12)',
    },

    // Backward-compatibility aliases for existing components
    gold: {
        primary: '#1E6BFF',
        hover: '#1555D1',
        dark: '#0F3FAA',
        text: '#1E6BFF',
        badgeBg: '#EEF4FF',
        badgeBorder: '#C7D9FE',
        badgeText: '#1E6BFF',
        glow: '0 4px 16px rgba(30, 107, 255, 0.25)',
        gradient: 'linear-gradient(135deg, #1E6BFF 0%, #06B6D4 100%)',
    },

    colors: {
        goldPrimary: '#1E6BFF',
        goldHover: '#1555D1',
        goldDark: '#0F3FAA',
        textDark: '#0F172A',
        textLight: '#FFFFFF',
        bgDark: '#F4F6FA',
        cardBg: '#FFFFFF',
        border: '#E5EAF2',
    }
};

export default theme;
