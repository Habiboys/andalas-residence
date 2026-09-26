import {
    createContext,
    useCallback,
    useContext,
    useState,
    type ReactNode,
} from 'react';
import { router } from '@inertiajs/react';
import { useAppearance } from '@/hooks/use-appearance';
import { login as loginRoute, logout as logoutRoute } from '@/routes';
import {
    FONT_SCALES,
    applyFontScaleToDocument,
    persistFontScale,
    readFontScale,
    type FontScaleId,
} from '@/lib/theme';

applyFontScaleToDocument(readFontScale());

export type UserRole =
    | 'mahasiswa'
    | 'orang_tua'
    | 'fasilitator'
    | 'go'
    | 'admin_layanan'
    | 'admin_aset'
    | 'staff_admin'
    | 'superadmin'
    | 'teknisi'
    | 'pimpinan';

export interface User {
    id?: string;
    nim: string;
    password?: string;
    nama: string;
    role: UserRole;
    raw_role?: string;
    email?: string;
    no_hp?: string;
    prodi?: string;
    angkatan?: string;
    student_stage?: string;
    needs_service_selection?: boolean;
    barcode_code?: string;
    status_huni?: string;
    attendance_eligible?: boolean;
    foto_profil?: string;
}

interface AuthContextType {
    currentUser: User | null;
    login: (nim: string, password: string) => User | null;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
    children,
    initialUser = null,
}: {
    children: ReactNode;
    initialUser?: User | null;
}) {
    const currentUser = initialUser;

    const login = (_nim: string, _password: string): User | null => {
        router.visit(loginRoute.url());
        return null;
    };

    const logout = () => {
        router.post(logoutRoute.url());
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

interface ThemeContextType {
    darkMode: boolean;
    toggleDarkMode: () => void;
}

/*
 * There used to be a second theme store here, backed by its own
 * `andalas-theme` localStorage key, while the server read the `appearance`
 * cookie and `hooks/use-appearance` read yet another key. Three answers to one
 * question, and they disagreed the moment a user who picked dark reloaded a
 * page: the server painted light, the client painted dark, and React reported a
 * hydration mismatch.
 *
 * There is now one store. `useAppearance` already persists to both the cookie
 * the server reads and localStorage, and it hands React a stable server
 * snapshot, so the first client render matches the server. `ThemeProvider` only
 * owns the Kemudahan font scale; the appearance store manages colours.
 */
interface AccessibilityContextType {
    fontScale: FontScaleId;
    setFontScale: (id: FontScaleId) => void;
    stepFontScale: (direction: 1 | -1) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(
    null,
);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [fontScale, setFontScaleState] = useState<FontScaleId>(readFontScale);

    const setFontScale = useCallback((id: FontScaleId) => {
        setFontScaleState(id);
        persistFontScale(id);
        applyFontScaleToDocument(id);
    }, []);

    const stepFontScale = useCallback((direction: 1 | -1) => {
        setFontScaleState((current) => {
            const index = FONT_SCALES.findIndex((item) => item.id === current);
            const next = FONT_SCALES[index + direction];

            if (!next) {
                return current;
            }

            persistFontScale(next.id);
            applyFontScaleToDocument(next.id);
            return next.id;
        });
    }, []);

    return (
        <AccessibilityContext.Provider
            value={{ fontScale, setFontScale, stepFontScale }}
        >
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility(): AccessibilityContextType {
    const ctx = useContext(AccessibilityContext);
    if (!ctx)
        throw new Error('useAccessibility must be used within ThemeProvider');
    return ctx;
}

export function useTheme(): ThemeContextType {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const darkMode = resolvedAppearance === 'dark';

    const toggleDarkMode = useCallback(
        () => updateAppearance(darkMode ? 'light' : 'dark'),
        [darkMode, updateAppearance],
    );

    return { darkMode, toggleDarkMode };
}
