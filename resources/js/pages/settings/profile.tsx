import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Pencil, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import type { AcademicOptions } from '@/andalas/components/AcademicFields';
import SettingsNav from '@/andalas/components/SettingsNav';
import { Card } from '@/andalas/components/ui';
import UserProfileDetails, {
    type ProfileSummary,
} from '@/andalas/components/UserProfileDetails';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

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

const EDIT_ROW_CLASS =
    'grid min-w-0 gap-1.5 py-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-start sm:gap-4';

function ProfileFieldRow({
    label,
    htmlFor,
    error,
    children,
}: {
    label: string;
    htmlFor?: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className={EDIT_ROW_CLASS}>
            <label
                htmlFor={htmlFor}
                className="text-base-content/70 pt-2 text-sm leading-relaxed font-medium"
            >
                {label}
            </label>
            <div className="min-w-0 space-y-1">
                {children}
                <InputError message={error} />
            </div>
        </div>
    );
}

function ReadonlyRow({
    label,
    value,
}: {
    label: string;
    value?: string | null;
}) {
    return (
        <div className={EDIT_ROW_CLASS}>
            <dt className="text-base-content/60 text-sm leading-relaxed">
                {label}
            </dt>
            <dd
                className={`min-w-0 text-sm leading-relaxed break-words ${value ? 'font-medium' : 'text-base-content/40'}`}
            >
                {value || 'Belum tersedia'}
            </dd>
        </div>
    );
}

export default function Profile({
    mustVerifyEmail,
    status,
    profileSummary,
    hasStudentProfile = false,
    academicLocked = false,
    editableProfile,
    academicOptions,
    locationOptions,
    defaultEditing = false,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    profileSummary: ProfileSummary;
    hasStudentProfile?: boolean;
    academicLocked?: boolean;
    editableProfile?: EditableProfile;
    academicOptions?: AcademicOptions | null;
    locationOptions?: LocationOptions | null;
    defaultEditing?: boolean;
}) {
    const { auth } = usePage<PageProps>().props;
    const [editing, setEditing] = useState(defaultEditing);

    const buildInitialValues = () => ({
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

    const form = useForm(buildInitialValues());

    const startEditing = () => {
        form.setData(buildInitialValues());
        form.clearErrors();
        setEditing(true);
    };

    const cancelEditing = () => {
        form.setData(buildInitialValues());
        form.clearErrors();
        setEditing(false);
    };

    const identityFields = profileSummary.sections[0]?.fields ?? {};
    const academicFields = profileSummary.sections[1]?.fields ?? {};
    const residenceSection = profileSummary.sections[2];

    const filteredDepartments = (academicOptions?.departemen ?? []).filter(
        (item) =>
            !form.data.faculty_id || item.faculty_id === form.data.faculty_id,
    );
    const filteredPrograms = (academicOptions?.prodi ?? []).filter(
        (item) =>
            !form.data.departemen_id ||
            item.departemen_id === form.data.departemen_id,
    );
    const selectedProgram = (academicOptions?.prodi ?? []).find(
        (item) => item.id === form.data.prodi_id,
    );
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

            <Card className="space-y-5 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <Heading
                        variant="small"
                        title="Ringkasan akun"
                        description="Identitas, kategori, dan kondisi akun Anda."
                    />
                    {!editing ? (
                        <button
                            type="button"
                            className="btn btn-outline btn-sm gap-1.5"
                            onClick={startEditing}
                            data-test="start-edit-profile-button"
                        >
                            <Pencil className="size-3.5" />
                            Edit Profil
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm gap-1.5"
                            onClick={cancelEditing}
                            disabled={form.processing}
                        >
                            <X className="size-3.5" />
                            Batal
                        </button>
                    )}
                </div>

                {mustVerifyEmail && auth.user.email_verified_at === null && (
                    <p className="text-base-content/70 bg-base-200/50 rounded-lg px-3 py-2 text-sm">
                        Email Anda belum diverifikasi.{' '}
                        <Link
                            href={send()}
                            method="post"
                            as="button"
                            className="link font-medium"
                        >
                            Kirim ulang email verifikasi.
                        </Link>
                    </p>
                )}

                {status === 'verification-link-sent' && (
                    <p className="text-success text-sm font-medium">
                        Tautan verifikasi baru telah dikirim ke email Anda.
                    </p>
                )}

                {!editing ? (
                    <UserProfileDetails summary={profileSummary} />
                ) : (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.patch(ProfileController.update.url(), {
                                preserveScroll: true,
                                onSuccess: () => setEditing(false),
                            });
                        }}
                        className="space-y-6"
                    >
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

                        <section className="space-y-2">
                            <h2 className="text-base-content/60 text-xs font-semibold tracking-wide uppercase">
                                Identitas dan akun
                            </h2>
                            <div className="divide-base-300 divide-y">
                                <ProfileFieldRow
                                    label="Nama lengkap"
                                    htmlFor="name"
                                    error={form.errors.name}
                                >
                                    <input
                                        id="name"
                                        name="name"
                                        className="input input-bordered w-full max-w-md"
                                        value={form.data.name}
                                        onChange={(e) =>
                                            form.setData('name', e.target.value)
                                        }
                                        required
                                        autoComplete="name"
                                    />
                                </ProfileFieldRow>

                                <ReadonlyRow
                                    label="NIM / NIP / Nomor identitas"
                                    value={
                                        identityFields[
                                            'NIM / NIP / Nomor identitas'
                                        ]
                                    }
                                />

                                <ProfileFieldRow
                                    label="Email"
                                    htmlFor="email"
                                    error={form.errors.email}
                                >
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        className="input input-bordered w-full max-w-md"
                                        value={form.data.email}
                                        onChange={(e) =>
                                            form.setData(
                                                'email',
                                                e.target.value,
                                            )
                                        }
                                        required
                                        autoComplete="username"
                                    />
                                </ProfileFieldRow>

                                {hasStudentProfile && (
                                    <ProfileFieldRow
                                        label="Email pribadi"
                                        htmlFor="email_pribadi"
                                        error={form.errors.email_pribadi}
                                    >
                                        <input
                                            id="email_pribadi"
                                            name="email_pribadi"
                                            type="email"
                                            className="input input-bordered w-full max-w-md"
                                            value={form.data.email_pribadi}
                                            onChange={(e) =>
                                                form.setData(
                                                    'email_pribadi',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Email pribadi aktif"
                                        />
                                    </ProfileFieldRow>
                                )}

                                <ProfileFieldRow
                                    label="Nomor telepon"
                                    htmlFor="no_hp"
                                    error={form.errors.no_hp}
                                >
                                    <input
                                        id="no_hp"
                                        name="no_hp"
                                        className="input input-bordered w-full max-w-md"
                                        value={form.data.no_hp}
                                        onChange={(e) =>
                                            form.setData(
                                                'no_hp',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Contoh: 081234567890"
                                    />
                                </ProfileFieldRow>

                                <ProfileFieldRow
                                    label="Jenis kelamin"
                                    htmlFor="gender"
                                    error={form.errors.gender}
                                >
                                    <select
                                        id="gender"
                                        name="gender"
                                        className="select select-bordered w-full max-w-md"
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
                                </ProfileFieldRow>

                                <ReadonlyRow
                                    label="Peran akses"
                                    value={identityFields['Peran akses']}
                                />
                                <ReadonlyRow
                                    label="Status akun"
                                    value={identityFields['Status akun']}
                                />
                                <ReadonlyRow
                                    label="Kategori akun"
                                    value={identityFields['Kategori akun']}
                                />
                            </div>
                        </section>

                        {hasStudentProfile && (
                            <section className="space-y-2">
                                <h2 className="text-base-content/60 text-xs font-semibold tracking-wide uppercase">
                                    Data akademik dan asal
                                </h2>
                                <div className="divide-base-300 divide-y">
                                    <ReadonlyRow
                                        label="Angkatan"
                                        value={academicFields['Angkatan']}
                                    />

                                    {academicOptions && (
                                        <>
                                            <ProfileFieldRow
                                                label="Fakultas"
                                                htmlFor="faculty_id"
                                            >
                                                <select
                                                    id="faculty_id"
                                                    className="select select-bordered w-full max-w-md"
                                                    disabled={academicLocked}
                                                    value={form.data.faculty_id}
                                                    onChange={(e) =>
                                                        form.setData({
                                                            ...form.data,
                                                            faculty_id:
                                                                e.target.value,
                                                            departemen_id: '',
                                                            prodi_id: '',
                                                        })
                                                    }
                                                >
                                                    <option value="">
                                                        Pilih fakultas
                                                    </option>
                                                    {(
                                                        academicOptions.fakultas ??
                                                        []
                                                    ).map((item) => (
                                                        <option
                                                            key={item.id}
                                                            value={item.id}
                                                        >
                                                            {item.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </ProfileFieldRow>

                                            <ProfileFieldRow
                                                label="Departemen"
                                                htmlFor="departemen_id"
                                            >
                                                <select
                                                    id="departemen_id"
                                                    className="select select-bordered w-full max-w-md"
                                                    disabled={
                                                        academicLocked ||
                                                        !form.data.faculty_id
                                                    }
                                                    value={
                                                        form.data.departemen_id
                                                    }
                                                    onChange={(e) =>
                                                        form.setData({
                                                            ...form.data,
                                                            departemen_id:
                                                                e.target.value,
                                                            prodi_id: '',
                                                        })
                                                    }
                                                >
                                                    <option value="">
                                                        Pilih departemen
                                                    </option>
                                                    {filteredDepartments.map(
                                                        (item) => (
                                                            <option
                                                                key={item.id}
                                                                value={item.id}
                                                            >
                                                                {item.name}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </ProfileFieldRow>

                                            <ProfileFieldRow
                                                label="Program studi"
                                                htmlFor="prodi_id"
                                                error={form.errors.prodi_id}
                                            >
                                                <select
                                                    id="prodi_id"
                                                    name="prodi_id"
                                                    className="select select-bordered w-full max-w-md"
                                                    disabled={
                                                        academicLocked ||
                                                        !form.data.departemen_id
                                                    }
                                                    value={form.data.prodi_id}
                                                    onChange={(e) =>
                                                        form.setData(
                                                            'prodi_id',
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="">
                                                        Pilih program studi
                                                    </option>
                                                    {filteredPrograms.map(
                                                        (item) => (
                                                            <option
                                                                key={item.id}
                                                                value={item.id}
                                                            >
                                                                {item.name} (
                                                                {item.jenjang})
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </ProfileFieldRow>

                                            <ReadonlyRow
                                                label="Jenjang"
                                                value={
                                                    selectedProgram?.jenjang ??
                                                    academicFields['Jenjang']
                                                }
                                            />
                                        </>
                                    )}

                                    <ProfileFieldRow
                                        label="NIK"
                                        htmlFor="nik"
                                        error={form.errors.nik}
                                    >
                                        <input
                                            id="nik"
                                            name="nik"
                                            maxLength={16}
                                            className="input input-bordered w-full max-w-md"
                                            value={form.data.nik}
                                            onChange={(e) =>
                                                form.setData(
                                                    'nik',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="16 digit NIK"
                                        />
                                    </ProfileFieldRow>

                                    <ProfileFieldRow
                                        label="Alamat lengkap"
                                        htmlFor="alamat"
                                        error={form.errors.alamat}
                                    >
                                        <textarea
                                            id="alamat"
                                            name="alamat"
                                            rows={3}
                                            className="textarea textarea-bordered w-full max-w-md"
                                            value={form.data.alamat}
                                            onChange={(e) =>
                                                form.setData(
                                                    'alamat',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Alamat asal lengkap"
                                        />
                                    </ProfileFieldRow>

                                    {locationOptions && (
                                        <>
                                            <ProfileFieldRow
                                                label="Provinsi"
                                                htmlFor="province_id"
                                            >
                                                <select
                                                    id="province_id"
                                                    className="select select-bordered w-full max-w-md"
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
                                            </ProfileFieldRow>

                                            <ProfileFieldRow
                                                label="Kota / kabupaten"
                                                htmlFor="city_id"
                                                error={form.errors.city_id}
                                            >
                                                <select
                                                    id="city_id"
                                                    name="city_id"
                                                    className="select select-bordered w-full max-w-md"
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
                                            </ProfileFieldRow>
                                        </>
                                    )}
                                </div>
                            </section>
                        )}

                        {residenceSection && (
                            <section className="space-y-2">
                                <h2 className="text-base-content/60 text-xs font-semibold tracking-wide uppercase">
                                    {residenceSection.title}
                                </h2>
                                <dl className="divide-base-300 divide-y">
                                    {Object.entries(
                                        residenceSection.fields,
                                    ).map(([label, value]) => (
                                        <ReadonlyRow
                                            key={label}
                                            label={label}
                                            value={value}
                                        />
                                    ))}
                                </dl>
                            </section>
                        )}

                        <div className="border-base-300 flex flex-wrap justify-end gap-2 border-t pt-4">
                            <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={cancelEditing}
                                disabled={form.processing}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary btn-sm"
                                disabled={form.processing}
                                data-test="update-profile-button"
                            >
                                Simpan perubahan
                            </button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
}
