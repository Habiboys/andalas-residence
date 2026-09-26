import { Form, Head, usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import type { Auth } from '@/types';
import { send } from '@/routes/verification';
import UserProfileDetails, {
    type ProfileSummary,
} from '@/andalas/components/UserProfileDetails';
import SettingsNav from '@/andalas/components/SettingsNav';
import { Card } from '@/andalas/components/ui';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
    profileSummary,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    profileSummary: ProfileSummary;
}) {
    const { auth } = usePage<PageProps>().props;

    return (
        <div className="mx-auto w-full max-w-3xl">
            <Head title="Profil Saya" />
            <h1 className="sr-only">Profil Saya</h1>

            <SettingsNav />

            <div className="space-y-4">
                <Card className="space-y-4 p-5">
                    <Heading
                        variant="small"
                        title="Ringkasan akun"
                        description="Identitas, kategori, dan kondisi akun Anda."
                    />
                    <UserProfileDetails summary={profileSummary} />
                </Card>

                <Card className="space-y-6 p-5">
                    <Heading
                        variant="small"
                        title="Ubah nama dan email"
                        description="Untuk koreksi identitas, data akademik, atau kategori akun, hubungi admin layanan."
                    />

                    <Form
                        action={ProfileController.update.url()}
                        method="patch"
                        options={{
                            preserveScroll: true,
                        }}
                        className="space-y-6"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <label className="label" htmlFor="name">
                                        Nama lengkap
                                    </label>

                                    <input
                                        id="name"
                                        className="input input-bordered mt-1 w-full"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Nama lengkap"
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.name}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <label className="label" htmlFor="email">
                                        Email
                                    </label>

                                    <input
                                        id="email"
                                        type="email"
                                        className="input input-bordered mt-1 w-full"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="Email"
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.email}
                                    />
                                </div>

                                {mustVerifyEmail &&
                                    auth.user.email_verified_at === null && (
                                        <div>
                                            <p className="text-muted-foreground -mt-4 text-sm">
                                                Email Anda belum diverifikasi.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                >
                                                    Kirim ulang email
                                                    verifikasi.
                                                </Link>
                                            </p>

                                            {status ===
                                                'verification-link-sent' && (
                                                <div className="text-success mt-2 text-sm font-medium">
                                                    Tautan verifikasi baru telah
                                                    dikirim ke email Anda.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                <div className="flex items-center gap-4">
                                    <button
                                        className="btn btn-primary"
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        Simpan perubahan
                                    </button>
                                </div>
                            </>
                        )}
                    </Form>
                </Card>

                <Card className="p-5">
                    <DeleteUser />
                </Card>
            </div>
        </div>
    );
}
