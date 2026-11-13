import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import {
    AndalasAuthShell,
    AuthField,
    AuthSubmitButton,
    PasswordInput,
    authInputClass,
} from '@/andalas/components/AndalasAuthShell';
import { AndalasLogo } from '@/andalas/components/AndalasLogo';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
    passwordRules?: string;
};

export default function ResetPassword({ token, email }: Props) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    return (
        <>
            <Head title="Atur Ulang Kata Sandi" />
            <AndalasAuthShell>
                <div className="mb-8 hidden justify-center md:flex">
                    <AndalasLogo size="md" />
                </div>

                <div className="mb-6 text-center">
                    <h1 className="text-base-content mb-1 font-sans text-2xl font-bold md:text-3xl">
                        Atur Ulang Kata Sandi
                    </h1>
                    <p className="text-muted text-sm">
                        Masukkan kata sandi baru untuk akun Anda di bawah ini.
                    </p>
                </div>

                <Form
                    action={update.url()}
                    method="post"
                    transform={(data) => ({ ...data, token, email })}
                    resetOnSuccess={['password', 'password_confirmation']}
                    className="flex flex-col gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <AuthField label="Email" error={errors.email}>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    value={email}
                                    className={authInputClass}
                                    readOnly
                                />
                            </AuthField>

                            <PasswordInput
                                id="password"
                                name="password"
                                label="Kata sandi baru"
                                value={password}
                                onChange={setPassword}
                                error={errors.password}
                                autoComplete="new-password"
                            />

                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                label="Konfirmasi kata sandi baru"
                                value={confirmPassword}
                                onChange={setConfirmPassword}
                                error={errors.password_confirmation}
                                autoComplete="new-password"
                            />

                            <AuthSubmitButton
                                processing={processing}
                                data-test="reset-password-button"
                            >
                                Simpan Kata Sandi Baru
                            </AuthSubmitButton>
                        </>
                    )}
                </Form>
            </AndalasAuthShell>
        </>
    );
}
