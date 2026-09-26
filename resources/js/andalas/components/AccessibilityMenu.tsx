import { Accessibility, Minus, Moon, Plus, Sun } from 'lucide-react';
import { FONT_SCALES, getFontScale } from '@/lib/theme';
import { useAccessibility, useTheme } from '../context/AppContext';

/*
 * Menu kemudahan ala MyUNAND: pilih terang/gelap dan perbesar ukuran huruf.
 * Skala huruf disimpan ke html (`--app-font-size`), jadi seluruh teks berbasis
 * rem ikut membesar tanpa mengganti satu pun size class.
 */
export function AccessibilityMenu() {
    const { darkMode, toggleDarkMode } = useTheme();
    const { fontScale, setFontScale, stepFontScale } = useAccessibility();

    const current = getFontScale(fontScale);
    const index = FONT_SCALES.findIndex((item) => item.id === current.id);
    const atMin = index <= 0;
    const atMax = index >= FONT_SCALES.length - 1;

    return (
        <div className="dropdown dropdown-end">
            <button
                type="button"
                tabIndex={0}
                className="btn btn-ghost btn-sm gap-1.5 px-2.5"
                aria-label="Kemudahan tampilan"
                title="Kemudahan tampilan"
            >
                <Accessibility
                    className="text-primary size-4"
                    aria-hidden="true"
                />
            </button>

            <div
                tabIndex={0}
                className="dropdown-content rounded-box border-base-300 bg-base-100 z-50 mt-2 w-72 border p-3 shadow-xl"
            >
                <p className="text-base-content/60 mb-3 text-xs font-medium tracking-wide uppercase">
                    Kemudahan tampilan
                </p>

                <p className="mb-1.5 text-sm font-medium">Mode tampilan</p>
                <div className="mb-4 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        className={`btn btn-sm gap-1.5 ${darkMode ? 'btn-ghost' : 'btn-primary'}`}
                        onClick={() => darkMode && toggleDarkMode()}
                    >
                        <Sun className="size-3.5" aria-hidden="true" />
                        Terang
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm gap-1.5 ${darkMode ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => !darkMode && toggleDarkMode()}
                    >
                        <Moon className="size-3.5" aria-hidden="true" />
                        Gelap
                    </button>
                </div>

                <p className="mb-1.5 text-sm font-medium">Ukuran huruf</p>
                <p className="text-base-content/60 mb-2 text-xs">
                    Perbesar teks jika tulisan terasa kecil.
                </p>
                <div className="mb-2 flex items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-square"
                        onClick={() => stepFontScale(-1)}
                        disabled={atMin}
                        aria-label="Kecilkan huruf"
                    >
                        <Minus className="size-3.5" aria-hidden="true" />
                    </button>
                    <span className="flex-1 text-center text-sm font-medium">
                        {current.label}
                    </span>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-square"
                        onClick={() => stepFontScale(1)}
                        disabled={atMax}
                        aria-label="Perbesar huruf"
                    >
                        <Plus className="size-3.5" aria-hidden="true" />
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                    {FONT_SCALES.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`btn btn-xs ${item.id === current.id ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setFontScale(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
