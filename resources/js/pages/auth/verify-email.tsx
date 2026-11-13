import { Form, Head, Link } from '@inertiajs/react';
import {
    AndalasAuthShell,
    AuthSubmitButton,
} from '@/andalas/components/AndalasAuthShell';
import { AndalasLogo } from '@/andalas/components/AndalasLogo';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    const statusMessage =
        status === 'verification-link-sent'
            ? 'Tautan verifikasi baru telah dikirim ke alamat email Anda.'
            : undefined;

    return (
        <>
            <Head title="Verifikasi Email" />
            <AndalasAuthShell status={statusMessage}>
                <div className="mb-8 hidden justify-center md:flex">
                    <AndalasLogo size="md" />
                </div>

                <div className="mb-6 text-center">
                    <h1 className="text-base-content mb-1 font-sans text-2xl font-bold md:text-3xl">
                        Verifikasi Alamat Email
                    </h1>
                    <p className="text-muted text-sm">
                        Silakan periksa kotak masuk Anda dan klik tautan
                        verifikasi yang telah kami kirimkan.
                    </p>
                </div>

                <Form
                    action={send.url()}
                    method="post"
                    className="flex flex-col gap-4"
                >
                    {({ processing }) => (
                        <AuthSubmitButton processing={processing}>
                            Kirim Ulang Email Verifikasi
                        </AuthSubmitButton>
                    )}
                </Form>

                <div className="mt-6 text-center">
                    <Link
                        href={logout()}
                        method="post"
                        as="button"
                        className="btn btn-ghost btn-sm text-base-content/70"
                    >
                        Keluar dari akun
                    </Link>
                </div>
            </AndalasAuthShell>
        </>
    );
}
