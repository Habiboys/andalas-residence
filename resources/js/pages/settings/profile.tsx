import { Form, Head, Link, usePage } from '@inertiajs/react';
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
        <div className="w-full">
            <Head title="Profil Saya" />
            <h1 className="sr-only">Profil Saya</h1>

            <SettingsNav />

            <div className="grid items-start gap-4 xl:grid-cols-3">
                <Card className="space-y-4 p-4 md:p-5 xl:col-span-2">
                    <Heading
                        variant="small"
                        title="Ringkasan akun"
                        description="Identitas, kategori, dan kondisi akun Anda."
                    />
                    <UserProfileDetails summary={profileSummary} />
                </Card>

                <div className="space-y-4">
                    <Card className="space-y-4 p-4 md:p-5">
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
                            className="space-y-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-1.5">
                                        <label className="label" htmlFor="name">
                                            Nama lengkap
                                        </label>

                                        <input
                                            id="name"
                                            className="input input-bordered w-full"
                                            defaultValue={auth.user.name}
                                            name="name"
                                            required
                                            autoComplete="name"
                                            placeholder="Nama lengkap"
                                        />

                                        <InputError
                                            message={errors.name}
                                        />
                                    </div>

                                    <div className="grid gap-1.5">
                                        <label className="label" htmlFor="email">
                                            Email
                                        </label>

                                        <input
                                            id="email"
                                            type="email"
                                            className="input input-bordered w-full"
                                            defaultValue={auth.user.email}
                                            name="email"
                                            required
                                            autoComplete="username"
                                            placeholder="Email"
                                        />

                                        <InputError
                                            message={errors.email}
                                        />
                                    </div>

                                    {mustVerifyEmail &&
                                        auth.user.email_verified_at ===
                                            null && (
                                            <p className="text-base-content/60 text-sm">
                                                Email Anda belum
                                                diverifikasi.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="link"
                                                >
                                                    Kirim ulang email
                                                    verifikasi.
                                                </Link>
                                            </p>
                                        )}

                                    {status ===
                                        'verification-link-sent' && (
                                        <p className="text-success text-sm font-medium">
                                            Tautan verifikasi baru telah
                                            dikirim ke email Anda.
                                        </p>
                                    )}

                                    <button
                                        className="btn btn-primary btn-sm self-start"
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        Simpan perubahan
                                    </button>
                                </>
                            )}
                        </Form>
                    </Card>

                    <Card className="p-4 md:p-5">
                        <DeleteUser />
                    </Card>
                </div>
            </div>
        </div>
    );
}
