import { Form, Head, Link } from '@inertiajs/react';
import {
    AndalasAuthShell,
    AuthField,
    AuthSubmitButton,
    authInputClass,
} from '@/andalas/components/AndalasAuthShell';
import { AndalasLogo } from '@/andalas/components/AndalasLogo';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Lupa Kata Sandi" />
            <AndalasAuthShell status={status}>
                <div className="mb-8 hidden justify-center md:flex">
                    <AndalasLogo size="md" />
                </div>

                <div className="mb-6 text-center">
                    <h1 className="text-base-content mb-1 font-sans text-2xl font-bold md:text-3xl">
                        Lupa Kata Sandi
                    </h1>
                    <p className="text-muted text-sm">
                        Masukkan alamat email akun Anda untuk menerima tautan
                        pemulihan kata sandi.
                    </p>
                </div>

                <Form
                    action={email.url()}
                    method="post"
                    className="flex flex-col gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <AuthField
                                label="Alamat email"
                                error={errors.email}
                            >
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    autoFocus
                                    required
                                    placeholder="nama@unand.ac.id"
                                    className={authInputClass}
                                />
                            </AuthField>

                            <AuthSubmitButton
                                processing={processing}
                                idle="Kirim Tautan Reset"
                                busy="Mengirim..."
                                data-test="email-password-reset-link-button"
                            />
                        </>
                    )}
                </Form>

                <p className="text-muted mt-6 text-center text-sm">
                    Ingat kata sandi Anda?{' '}
                    <Link
                        href={login()}
                        className="text-primary font-medium hover:underline"
                    >
                        Kembali ke halaman masuk
                    </Link>
                </p>
            </AndalasAuthShell>
        </>
    );
}
