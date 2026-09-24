import { Link } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { AndalasLogo } from '@/andalas/components/AndalasLogo';

type Props = {
    status?: string;
    wide?: boolean;
    children: ReactNode;
};

/*
 * The left panel used to be an Unsplash photograph of an unidentified student.
 * A stock photo of a stranger is a stand-in for an asset nobody approved, so the
 * panel is now the brand itself: the logo and the institution on the deep
 * primary surface. When an official campus photograph exists, it belongs here.
 */
export function AndalasAuthShell({ status, children, wide = false }: Props) {
    return (
        <div className="flex min-h-svh flex-col bg-base-100 md:flex-row">
            <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-content md:flex md:w-5/12 lg:w-2/5 lg:p-12">
                <div className="relative z-10">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-primary-content/80 transition-colors hover:text-primary-content hover:underline"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Kembali ke Beranda
                    </Link>
                </div>

                <div className="relative z-10 flex flex-col items-start gap-4">
                    <AndalasLogo size="lg" />
                    <p className="font-sans text-2xl font-bold leading-snug">
                        Asrama mahasiswa Universitas Andalas
                    </p>
                    <p className="max-w-xs text-sm text-primary-content/80">
                        Satu tempat untuk hunian, pembayaran, absensi, dan pengajuan selama masa
                        tinggal di asrama.
                    </p>
                </div>

                <div className="relative z-10 text-xs text-primary-content/70">
                    © {new Date().getFullYear()} Andalas Residen, Universitas Andalas
                </div>
            </div>

            <div className="flex min-h-svh flex-1 flex-col items-center justify-center px-6 py-10 md:min-h-0">
                <div className="mb-6 flex w-full max-w-md items-center justify-between md:hidden">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Beranda
                    </Link>
                    <AndalasLogo size="sm" variant="icon" />
                </div>

                <div className={wide ? 'w-full max-w-3xl' : 'w-full max-w-md'}>
                    {status && (
                        <div role="status" className="alert alert-success mb-4 text-sm">
                            {status}
                        </div>
                    )}

                    {children}
                </div>
            </div>
        </div>
    );
}

export const authInputClass = 'input w-full';

export const authLabelClass = 'text-sm font-medium text-base-content';

export function AuthField({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <fieldset className="fieldset">
            <legend className="fieldset-legend text-sm font-medium">{label}</legend>
            {children}
            {error && (
                <p role="alert" className="text-xs text-error">
                    {error}
                </p>
            )}
        </fieldset>
    );
}

export function AuthSubmitButton({
    processing,
    children,
}: {
    processing?: boolean;
    children: ReactNode;
}) {
    return (
        <button type="submit" disabled={processing} className="btn btn-primary w-full">
            {processing && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
            {processing ? 'Memproses…' : children}
        </button>
    );
}

export function PasswordInput({
    value,
    onChange,
    error,
    name = 'password',
}: {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    name?: string;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <AuthField label="Password" error={error}>
            <div className="relative">
                <input
                    type={visible ? 'text' : 'password'}
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Masukkan password"
                    className={`${authInputClass} pr-11`}
                    autoComplete="current-password"
                    required
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    className="btn btn-ghost btn-sm absolute top-1/2 right-1 -translate-y-1/2"
                    aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
                    aria-pressed={visible}
                >
                    {visible ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                        <Eye className="size-4" aria-hidden="true" />
                    )}
                </button>
            </div>
        </AuthField>
    );
}
