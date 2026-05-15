export interface Customization {
  primaryColor?: string;
  primaryLight?: string;
  textColor?: string;
  textMuted?: string;
  bgColor?: string;
  cardBg?: string;
  borderColor?: string;
  footerBg?: string;
  footerText?: string;
  fontFamily?: string;
  borderRadius?: string;
  buttonStyle?: string;
  cardShadow?: string;
  headerStyle?: string;
  heroOverlay?: string;
  spacing?: string;
}

const defaults: Required<Customization> = {
  primaryColor: '#1a4d2e',
  primaryLight: '#e8f5e9',
  textColor: '#1a1a1a',
  textMuted: '#666666',
  bgColor: '#ffffff',
  cardBg: '#ffffff',
  borderColor: '#e5e5e5',
  footerBg: '#1a4d2e',
  footerText: '#ffffff',
  fontFamily: 'inter',
  borderRadius: 'sm',
  buttonStyle: 'filled',
  cardShadow: 'sm',
  headerStyle: 'light',
  heroOverlay: 'none',
  spacing: 'normal',
};

const radiusMap: Record<string, string> = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '16px',
  xl: '24px',
};

const shadowMap: Record<string, string> = {
  none: 'none',
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.08)',
  lg: '0 10px 25px rgba(0,0,0,0.1)',
};

const fontMap: Record<string, string> = {
  inter: "Inter, system-ui, -apple-system, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  roboto: "Roboto, system-ui, sans-serif",
  poppins: "Poppins, system-ui, sans-serif",
};

const spacingMap: Record<string, string> = {
  compact: 'py-10 md:py-12',
  normal: 'py-14 md:py-20',
  spacious: 'py-20 md:py-28',
};

export function getTokens(c: Customization = {}): Required<Customization> & {
  radiusPx: string;
  shadowCss: string;
  fontCss: string;
  spacingClass: string;
} {
  const merged = { ...defaults, ...c };
  return {
    ...merged,
    radiusPx: radiusMap[merged.borderRadius] || radiusMap.sm,
    shadowCss: shadowMap[merged.cardShadow] || shadowMap.sm,
    fontCss: fontMap[merged.fontFamily] || fontMap.inter,
    spacingClass: spacingMap[merged.spacing] || spacingMap.normal,
  };
}

export function cssVars(c: Customization = {}): string {
  const t = getTokens(c);
  return `
    --brio-primary: ${t.primaryColor};
    --brio-primary-light: ${t.primaryLight};
    --brio-text: ${t.textColor};
    --brio-muted: ${t.textMuted};
    --brio-bg: ${t.bgColor};
    --brio-card-bg: ${t.cardBg};
    --brio-border: ${t.borderColor};
    --brio-footer-bg: ${t.footerBg};
    --brio-footer-text: ${t.footerText};
    --brio-radius: ${t.radiusPx};
    --brio-shadow: ${t.shadowCss};
    --brio-font: ${t.fontCss};
  `.trim();
}

export function btnClasses(t: ReturnType<typeof getTokens>): string {
  const base = 'inline-block px-6 py-2.5 text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]';
  if (t.buttonStyle === 'rounded') {
    return `${base} rounded-full text-white`;
  }
  if (t.buttonStyle === 'outline') {
    return `${base} border-2 bg-transparent hover:bg-opacity-5`;
  }
  return `${base} text-white`;
}

export function btnStyle(t: ReturnType<typeof getTokens>): string {
  if (t.buttonStyle === 'outline') {
    return `border-color: ${t.primaryColor}; color: ${t.primaryColor};`;
  }
  return `background-color: ${t.primaryColor};`;
}
