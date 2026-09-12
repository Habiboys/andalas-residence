import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { router } from '@inertiajs/react';
import { useAppearance } from '@/hooks/use-appearance';

export type UserRole = 'mahasiswa' | 'fasilitator' | 'staff_admin' | 'superadmin' | 'teknisi' | 'pimpinan';

export interface User {
    id?: string;
    nim: string;
    password?: string;
    nama: string;
    role: UserRole | string;
    raw_role?: string;
    email?: string;
    no_hp?: string;
    prodi?: string;
    angkatan?: string;
    barcode_code?: string;
    status_huni?: string;
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
    const [currentUser, setCurrentUser] = useState<User | null>(initialUser);

    const login = (_nim: string, _password: string): User | null => {
        window.location.href = '/login';
        return null;
    };

    const logout = () => {
        setCurrentUser(null);
        router.post('/logout');
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
 * snapshot, so the first client render matches the server. `ThemeProvider` is
 * kept as a pass-through so existing call sites keep working.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    return <>{children}</>;
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
