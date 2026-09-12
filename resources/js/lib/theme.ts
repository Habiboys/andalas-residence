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
