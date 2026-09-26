/**
 * The app ships exactly two daisyUI themes, both defined in resources/css/app.css.
 * They are the only place the palette lives; nothing else should hardcode a colour.
 */
export const THEME_LIGHT = 'andalas';
export const THEME_DARK = 'andalas-dark';

export type ThemeName = typeof THEME_LIGHT | typeof THEME_DARK;

export const themeNameFor = (isDark: boolean): ThemeName =>
    isDark ? THEME_DARK : THEME_LIGHT;

/**
 * daisyUI reads `data-theme`, while Tailwind's `dark:` variant and the
 * server-rendered shell read the `.dark` class. Both switches are set here so a
 * caller cannot flip one and forget the other.
 */
export function applyThemeToDocument(isDark: boolean): void {
    if (typeof document === 'undefined') {
        return;
    }

    const root = document.documentElement;

    root.classList.toggle('dark', isDark);
    root.dataset.theme = themeNameFor(isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
}

/* ── Font scale (Kemudahan) ──────────────────────────────────────────────── */

export const FONT_SCALES = [
    { id: 'normal', label: 'Normal', px: 16 },
    { id: 'large', label: 'Besar', px: 18 },
    { id: 'xlarge', label: 'Lebih besar', px: 20 },
    { id: 'xxlarge', label: 'Sangat besar', px: 24 },
] as const;

export type FontScaleId = (typeof FONT_SCALES)[number]['id'];

export const DEFAULT_FONT_SCALE: FontScaleId = 'normal';

const FONT_SCALE_STORAGE_KEY = 'andalas_font_scale';

export function getFontScale(
    id: string,
): Readonly<(typeof FONT_SCALES)[number]> {
    return FONT_SCALES.find((item) => item.id === id) ?? FONT_SCALES[0];
}

export function readFontScale(): FontScaleId {
    if (typeof window === 'undefined') {
        return DEFAULT_FONT_SCALE;
    }

    const stored = localStorage.getItem(FONT_SCALE_STORAGE_KEY);

    return FONT_SCALES.some((item) => item.id === stored)
        ? (stored as FontScaleId)
        : DEFAULT_FONT_SCALE;
}

/** Mengubah seluruh teks berbasis rem dengan mengganti ukuran dasar html. */
export function applyFontScaleToDocument(id: string): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.style.setProperty(
        '--app-font-size',
        `${getFontScale(id).px}px`,
    );
}

export function persistFontScale(id: FontScaleId): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(FONT_SCALE_STORAGE_KEY, id);
}
