import { Head, Link, useForm, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import type { Auth } from '@/types';
import { send } from '@/routes/verification';
import AcademicFields, {
    type AcademicOptions,
} from '@/andalas/components/AcademicFields';
import UserProfileDetails, {
    type ProfileSummary,
} from '@/andalas/components/UserProfileDetails';
import SettingsNav from '@/andalas/components/SettingsNav';
import { Card } from '@/andalas/components/ui';

type PageProps = {
    auth: Auth;
};

type EditableProfile = {
    name?: string;
    email?: string;
    no_hp?: string;
    gender?: string;
    email_pribadi?: string;
    nik?: string;
    faculty_id?: string;
    departemen_id?: string;
    prodi_id?: string;
    province_id?: string;
    city_id?: string;
    alamat?: string;
};

type LocationOptions = {
    provinces?: Array<{ id: string; name: string }>;
    cities?: Array<{ id: string; name: string; province_id: string }>;
};

export default function Profile({
    mustVerifyEmail,
    status,
    profileSummary,
    hasStudentProfile = false,
    academicLocked = false,
    editableProfile,
    academicOptions,
    locationOptions,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    profileSummary: ProfileSummary;
    hasStudentProfile?: boolean;
    academicLocked?: boolean;
    editableProfile?: EditableProfile;
    academicOptions?: AcademicOptions | null;
    locationOptions?: LocationOptions | null;
}) {
    const { auth } = usePage<PageProps>().props;
    const form = useForm({
        name: editableProfile?.name ?? auth.user.name ?? '',
        email: editableProfile?.email ?? auth.user.email ?? '',
        no_hp: editableProfile?.no_hp ?? '',
        gender: editableProfile?.gender ?? '',
        email_pribadi: editableProfile?.email_pribadi ?? '',
        nik: editableProfile?.nik ?? '',
        faculty_id: editableProfile?.faculty_id ?? '',
        departemen_id: editableProfile?.departemen_id ?? '',
        prodi_id: editableProfile?.prodi_id ?? '',
        province_id: editableProfile?.province_id ?? '',
        city_id: editableProfile?.city_id ?? '',
        alamat: editableProfile?.alamat ?? '',
    });

    const filteredCities = (locationOptions?.cities ?? []).filter(
        (city) =>
            !form.data.province_id ||
            city.province_id === form.data.province_id,
    );

    return (
        <div className="w-full">
            <Head title="Profil Saya" />
            <h1 className="sr-only">Profil Saya</h1>

            <SettingsNav />

            <div className="grid items-start gap-4 xl:grid-cols-5">
                <Card className="space-y-4 p-4 md:p-5 xl:col-span-3">
                    <Heading
                        variant="small"
                        title="Ringkasan akun"
                        description="Identitas, kategori, dan kondisi akun Anda."
                    />
                    <UserProfileDetails summary={profileSummary} />
                </Card>

                <div className="space-y-4 xl:col-span-2">
                    <Card className="space-y-4 p-4 md:p-5">
                        <Heading
                            variant="small"
                            title="Edit data profil"
                            description="Perbarui data yang dapat diedit pada akun Anda. NIM/NIP, peran akses, dan kategori akun dikelola sistem/admin."
                        />

                        {hasStudentProfile && academicLocked && (
                            <p
                                role="status"
                                className="alert alert-info py-2 text-xs"
                            >
                                Jenis kelamin dan program studi dikunci selama
                                pendaftaran atau hunian aktif berjalan. Hubungi
                                pengelola untuk koreksi.
                            </p>
                        )}

                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                form.patch(ProfileController.update.url(), {
                                    preserveScroll: true,
                                });
                            }}
                            className="space-y-4"
                        >
                            <div className="grid gap-1.5">
                                <label className="label" htmlFor="name">
                                    Nama lengkap
                                </label>

                                <input
                                    id="name"
                                    className="input w-full"
                                    value={form.data.name}
                                    onChange={(e) =>
                                        form.setData('name', e.target.value)
                                    }
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Nama lengkap"
                                />

                                <InputError message={form.errors.name} />
                            </div>

                            <div className="grid gap-1.5">
                                <label className="label" htmlFor="email">
                                    Email
                                </label>

                                <input
                                    id="email"
                                    type="email"
                                    className="input w-full"
                                    value={form.data.email}
                                    onChange={(e) =>
                                        form.setData('email', e.target.value)
                                    }
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="Email"
                                />

                                <InputError message={form.errors.email} />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <label className="label" htmlFor="no_hp">
                                        Nomor telepon
                                    </label>
                                    <input
                                        id="no_hp"
                                        className="input w-full"
                                        value={form.data.no_hp}
                                        onChange={(e) =>
                                            form.setData(
                                                'no_hp',
                                                e.target.value,
                                            )
                                        }
                                        name="no_hp"
                                        placeholder="Contoh: 081234567890"
                                    />
                                    <InputError message={form.errors.no_hp} />
                                </div>

                                <div className="grid gap-1.5">
                                    <label className="label" htmlFor="gender">
                                        Jenis kelamin
                                    </label>
                                    <select
                                        id="gender"
                                        name="gender"
                                        className="select select-bordered w-full"
                                        disabled={academicLocked}
                                        value={form.data.gender}
                                        onChange={(e) =>
                                            form.setData(
                                                'gender',
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            Pilih jenis kelamin
                                        </option>
                                        <option value="laki_laki">
                                            Laki-laki
                                        </option>
                                        <option value="perempuan">
                                            Perempuan
                                        </option>
                                    </select>
                                    <InputError message={form.errors.gender} />
                                </div>
                            </div>

                            {hasStudentProfile && (
                                <div className="border-base-200 space-y-4 border-t pt-4">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="grid gap-1.5">
                                            <label
                                                className="label"
                                                htmlFor="email_pribadi"
                                            >
                                                Email pribadi
                                            </label>
                                            <input
                                                id="email_pribadi"
                                                type="email"
                                                className="input w-full"
                                                value={form.data.email_pribadi}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'email_pribadi',
                                                        e.target.value,
                                                    )
                                                }
                                                name="email_pribadi"
                                                placeholder="Email pribadi aktif"
                                            />
                                            <InputError
                                                message={
                                                    form.errors.email_pribadi
                                                }
                                            />
                                        </div>

                                        <div className="grid gap-1.5">
                                            <label
                                                className="label"
                                                htmlFor="nik"
                                            >
                                                NIK (16 digit)
                                            </label>
                                            <input
                                                id="nik"
                                                className="input w-full"
                                                value={form.data.nik}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'nik',
                                                        e.target.value,
                                                    )
                                                }
                                                name="nik"
                                                maxLength={16}
                                                placeholder="16 digit NIK"
                                            />
                                            <InputError
                                                message={form.errors.nik}
                                            />
                                        </div>
                                    </div>

                                    {academicOptions && (
                                        <div className="grid gap-3">
                                            <AcademicFields
                                                {...academicOptions}
                                                disabled={academicLocked}
                                                required={false}
                                                value={{
                                                    faculty_id:
                                                        form.data.faculty_id,
                                                    departemen_id:
                                                        form.data.departemen_id,
                                                    prodi_id:
                                                        form.data.prodi_id,
                                                }}
                                                errors={{
                                                    prodi_id:
                                                        form.errors.prodi_id,
                                                }}
                                                onChange={(selection) =>
                                                    form.setData({
                                                        ...form.data,
                                                        ...selection,
                                                    })
                                                }
                                            />
                                        </div>
                                    )}

                                    {locationOptions && (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="grid gap-1.5">
                                                <label
                                                    className="label"
                                                    htmlFor="province_id"
                                                >
                                                    Provinsi asal
                                                </label>
                                                <select
                                                    id="province_id"
                                                    className="select select-bordered w-full"
                                                    value={
                                                        form.data.province_id
                                                    }
                                                    onChange={(e) =>
                                                        form.setData({
                                                            ...form.data,
                                                            province_id:
                                                                e.target.value,
                                                            city_id: '',
                                                        })
                                                    }
                                                >
                                                    <option value="">
                                                        Pilih provinsi
                                                    </option>
                                                    {(
                                                        locationOptions.provinces ??
                                                        []
                                                    ).map((prov) => (
                                                        <option
                                                            key={prov.id}
                                                            value={prov.id}
                                                        >
                                                            {prov.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid gap-1.5">
                                                <label
                                                    className="label"
                                                    htmlFor="city_id"
                                                >
                                                    Kota / kabupaten
                                                </label>
                                                <select
                                                    id="city_id"
                                                    name="city_id"
                                                    className="select select-bordered w-full"
                                                    disabled={
                                                        !form.data.province_id
                                                    }
                                                    value={form.data.city_id}
                                                    onChange={(e) =>
                                                        form.setData(
                                                            'city_id',
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="">
                                                        Pilih kota / kabupaten
                                                    </option>
                                                    {filteredCities.map(
                                                        (city) => (
                                                            <option
                                                                key={city.id}
                                                                value={city.id}
                                                            >
                                                                {city.name}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                                <InputError
                                                    message={
                                                        form.errors.city_id
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid gap-1.5">
                                        <label
                                            className="label"
                                            htmlFor="alamat"
                                        >
                                            Alamat lengkap
                                        </label>
                                        <textarea
                                            id="alamat"
                                            name="alamat"
                                            rows={3}
                                            className="textarea textarea-bordered w-full"
                                            value={form.data.alamat}
                                            onChange={(e) =>
                                                form.setData(
                                                    'alamat',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Alamat asal lengkap"
                                        />
                                        <InputError
                                            message={form.errors.alamat}
                                        />
                                    </div>
                                </div>
                            )}

                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <p className="text-base-content/60 text-sm">
                                        Email Anda belum diverifikasi.{' '}
                                        <Link
                                            href={send()}
                                            method="post"
                                            as="button"
                                            className="link"
                                        >
                                            Kirim ulang email verifikasi.
                                        </Link>
                                    </p>
                                )}

                            {status === 'verification-link-sent' && (
                                <p className="text-success text-sm font-medium">
                                    Tautan verifikasi baru telah dikirim ke
                                    email Anda.
                                </p>
                            )}

                            <button
                                className="btn btn-primary btn-sm self-start"
                                disabled={form.processing}
                                data-test="update-profile-button"
                            >
                                Simpan perubahan
                            </button>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
}
