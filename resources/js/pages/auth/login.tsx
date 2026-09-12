import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { AndalasLogo } from '@/andalas/components/AndalasLogo';
import {
    AndalasAuthShell,
    AuthField,
    AuthSubmitButton,
    PasswordInput,
    authInputClass,
} from '@/andalas/components/AndalasAuthShell';

type Props = {
    status?: string;
    canResetPassword: boolean;
    ssoUrl?: string | null;
};

export default function Login({ status, canResetPassword, ssoUrl }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <>
            <Head title="Masuk Andalas Residen" />
            <AndalasAuthShell status={status}>
                <div className="mb-8 hidden justify-center md:flex">
                    <AndalasLogo size="md" />
                </div>

                <div className="mb-6 text-center">
                    <h1 className="mb-1 font-serif text-2xl text-base-content md:text-3xl">
                        Masuk ke Portal
                    </h1>
                    <p className="text-sm text-muted">
                        Gunakan akun SSO Unand atau kredensial staff.
                    </p>
                </div>

                {/*
                 * The accent colour is spent here, on the one action this page
                 * actually exists for.
                 */}
                <a href={ssoUrl || '/login'} className="btn btn-accent mb-6 w-full">
                    <KeyRound className="size-4" aria-hidden="true" />
                    Login dengan SSO Unand
                </a>

                <div className="divider mb-6 text-xs text-muted">atau login staff</div>

                <Form
                    action="/login"
                    method="post"
                    resetOnSuccess={['password']}
                    className="flex flex-col gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            {(errors.email || errors.password) && (
                                <div role="alert" className="alert alert-error text-sm">
                                    {errors.email || errors.password || 'NIM/email atau password salah.'}
                                </div>
                            )}

                            <AuthField label="NIM / Email" error={errors.email}>
                                <input
                                    type="text"
                                    name="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="NIM atau email kampus"
                                    className={authInputClass}
                                    autoComplete="username"
                                    required
                                    autoFocus
                                />
                            </AuthField>

                            <PasswordInput
                                value={password}
                                onChange={setPassword}
                                error={errors.password}
                            />

                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" name="remember" className="checkbox checkbox-sm" />
                                Ingat saya
                            </label>

                            <AuthSubmitButton processing={processing}>Masuk</AuthSubmitButton>

                            {canResetPassword && (
                                <p className="text-center text-xs">
                                    <a href="/forgot-password" className="link link-primary font-medium">
                                        Lupa password?
                                    </a>
                                </p>
                            )}
                        </>
                    )}
                </Form>
            </AndalasAuthShell>
        </>
    );
}
