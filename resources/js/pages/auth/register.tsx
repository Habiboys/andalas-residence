import { Head, Link, useForm } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import AcademicFields, {
    cohortFromNim,
    type AcademicOptions,
} from '@/andalas/components/AcademicFields';
import PasswordInput from '@/components/password-input';
import { login } from '@/routes';
import { store } from '@/routes/register';
import {
    AndalasAuthShell,
    AuthField,
    AuthSubmitButton,
    authInputClass,
} from '@/andalas/components/AndalasAuthShell';

type RegisterProps = AcademicOptions & {
    initialCategory?: string;
    ssoAsnUrl?: string;
};

export default function Register({
    initialCategory = '',
    ssoAsnUrl,
    ...options
}: RegisterProps) {
    const currentYear = new Date().getFullYear();
    const validInitial = [
        'local_student',
        'international_student',
        'non_student',
        'asn',
    ].includes(initialCategory)
        ? initialCategory
        : '';

    const form = useForm({
        nama: '',
        nim_nip: '',
        no_nim: false,
        is_external_campus: false,
        external_campus_name: '',
        external_program_name: '',
        unit_kerja: '',
        angkatan: String(currentYear),
        email: '',
        password: '',
        password_confirmation: '',
        client_profile_category: validInitial,
        faculty_id: '',
        departemen_id: '',
        prodi_id: '',
        gender: 'laki_laki',
        no_hp: '',
    });

    const nonStudent = form.data.client_profile_category === 'non_student';
    const isAsn = form.data.client_profile_category === 'asn';
    const isStudentCategory =
        form.data.client_profile_category === 'local_student' ||
        form.data.client_profile_category === 'international_student';
    const isExternalCampus = isStudentCategory && form.data.is_external_campus;
    const showUnandAcademic = isStudentCategory && !isExternalCampus;

    const categories = [
        ['local_student', 'Mahasiswa Lokal (S1)'],
        [
            'international_student',
            'Mahasiswa Internasional / Mahasiswa Lokal (S2/S3)',
        ],
        ['asn', 'ASN / Dosen (Khusus Rusun ASN)'],
        ['non_student', 'Nonmahasiswa'],
    ];

    return (
        <AndalasAuthShell wide>
            <Head title="Daftar Akun Andalas Residence" />
            <h1 className="mb-5 text-2xl font-bold">Daftar akun</h1>
            <p className="text-muted mb-6 text-sm">
                Buat akun untuk mengakses layanan asrama. Setelah masuk, pilih
                pendaftaran hunian atau pengurusan surat bebas asrama.
            </p>
            {isAsn && ssoAsnUrl && (
                <div className="border-primary/30 bg-primary/5 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm">
                    <div>
                        <p className="font-semibold">
                            Dosen / ASN Universitas Andalas?
                        </p>
                        <p className="text-muted text-xs">
                            Anda dapat langsung masuk menggunakan akun SSO Dosen
                            UNAND tanpa membuat password baru, atau lanjut
                            daftar manual dengan NIP di bawah ini.
                        </p>
                    </div>
                    <a
                        href={ssoAsnUrl}
                        className="btn btn-primary btn-sm shrink-0 gap-1.5"
                    >
                        <KeyRound className="size-4" aria-hidden="true" />
                        Masuk SSO Dosen / ASN
                    </a>
                </div>
            )}
            <form
                className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 [&>fieldset]:min-w-0"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(store.url());
                }}
            >
                <AuthField
                    label="Jenis pendaftar"
                    error={form.errors.client_profile_category}
                >
                    <select
                        required
                        aria-label="Jenis pendaftar"
                        className={authInputClass}
                        value={form.data.client_profile_category}
                        onChange={(event) => {
                            const category = event.target.value;
                            const studentType =
                                category === 'local_student' ||
                                category === 'international_student';
                            form.setData((prev) => ({
                                ...prev,
                                client_profile_category: category,
                                no_nim: studentType ? prev.no_nim : false,
                                is_external_campus: studentType
                                    ? prev.is_external_campus
                                    : false,
                            }));
                        }}
                    >
                        <option value="">Pilih jenis pendaftar</option>
                        {categories.map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </AuthField>
                <AuthField label="Nama lengkap" error={form.errors.nama}>
                    <input
                        required
                        className={authInputClass}
                        value={form.data.nama}
                        onChange={(e) => form.setData('nama', e.target.value)}
                    />
                </AuthField>

                {isStudentCategory && (
                    <div className="border-base-300 bg-base-200/30 col-span-full space-y-2 rounded-xl border p-3.5">
                        <p className="text-base-content/70 text-xs font-semibold tracking-wide uppercase">
                            Asal Kampus Mahasiswa
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm">
                            <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
                                <input
                                    type="radio"
                                    name="campus_origin"
                                    className="radio radio-sm radio-primary"
                                    checked={!form.data.is_external_campus}
                                    onChange={() =>
                                        form.setData((prev) => ({
                                            ...prev,
                                            is_external_campus: false,
                                            external_campus_name: '',
                                            external_program_name: '',
                                        }))
                                    }
                                />
                                <span>
                                    Mahasiswa Universitas Andalas (UNAND)
                                </span>
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
                                <input
                                    type="radio"
                                    name="campus_origin"
                                    className="radio radio-sm radio-primary"
                                    checked={form.data.is_external_campus}
                                    onChange={() =>
                                        form.setData((prev) => ({
                                            ...prev,
                                            is_external_campus: true,
                                            no_nim: false,
                                            faculty_id: '',
                                            departemen_id: '',
                                            prodi_id: '',
                                        }))
                                    }
                                />
                                <span>
                                    Mahasiswa Luar Kampus UNAND (contoh: PNP)
                                </span>
                            </label>
                        </div>
                        {isExternalCampus && (
                            <p className="text-muted text-xs">
                                Inputan Fakultas, Departemen, dan Program Studi
                                UNAND disembunyikan. Tarif dan pilihan gedung
                                mengikuti jalur mahasiswa lokal / internasional
                                yang dipilih.
                            </p>
                        )}
                    </div>
                )}

                {showUnandAcademic && (
                    <div className="col-span-full">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-primary"
                                checked={form.data.no_nim}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    form.setData((prev) => ({
                                        ...prev,
                                        no_nim: checked,
                                        nim_nip: checked ? '' : prev.nim_nip,
                                    }));
                                }}
                            />
                            <span>
                                Belum memiliki NIM (khusus mahasiswa baru UNAND)
                            </span>
                        </label>
                    </div>
                )}

                {showUnandAcademic && form.data.no_nim ? (
                    <AuthField
                        label="Tahun Angkatan"
                        error={form.errors.angkatan}
                    >
                        <input
                            required
                            type="number"
                            min={2000}
                            max={currentYear}
                            className={authInputClass}
                            value={form.data.angkatan}
                            onChange={(e) =>
                                form.setData('angkatan', e.target.value)
                            }
                        />
                        <p className="text-muted mt-1 text-xs">
                            Anda dapat mendaftar akun terlebih dahulu. Sistem
                            akan terus mengingatkan untuk melengkapi NIM pada
                            menu Data Hunian atau Profil sebelum memilih kamar.
                        </p>
                    </AuthField>
                ) : (
                    <AuthField
                        label={
                            nonStudent
                                ? 'Nomor identitas (NIK/paspor)'
                                : isAsn
                                  ? 'NIP / Nomor Pegawai ASN'
                                  : isExternalCampus
                                    ? 'NIM / Nomor Induk Mahasiswa (Kampus Asal)'
                                    : 'NIM / nomor mahasiswa'
                        }
                        error={form.errors.nim_nip}
                    >
                        <input
                            required
                            className={authInputClass}
                            value={form.data.nim_nip}
                            onChange={(e) =>
                                form.setData('nim_nip', e.target.value)
                            }
                        />
                    </AuthField>
                )}

                {isAsn && (
                    <AuthField
                        label="Unit Kerja / Fakultas / Instansi (Opsional)"
                        error={form.errors.unit_kerja}
                    >
                        <input
                            className={authInputClass}
                            placeholder="Contoh: Fakultas Teknik UNAND"
                            value={form.data.unit_kerja}
                            onChange={(e) =>
                                form.setData('unit_kerja', e.target.value)
                            }
                        />
                    </AuthField>
                )}

                {isExternalCampus && (
                    <>
                        <AuthField
                            label="Tahun Angkatan"
                            error={form.errors.angkatan}
                        >
                            <input
                                required
                                type="number"
                                min={2000}
                                max={currentYear}
                                className={authInputClass}
                                value={form.data.angkatan}
                                onChange={(e) =>
                                    form.setData('angkatan', e.target.value)
                                }
                            />
                        </AuthField>
                        <AuthField
                            label="Nama Kampus / Perguruan Tinggi Asal"
                            error={form.errors.external_campus_name}
                        >
                            <input
                                required
                                className={authInputClass}
                                placeholder="Contoh: Politeknik Negeri Padang (PNP)"
                                value={form.data.external_campus_name}
                                onChange={(e) =>
                                    form.setData(
                                        'external_campus_name',
                                        e.target.value,
                                    )
                                }
                            />
                        </AuthField>
                        <AuthField
                            label="Program Studi / Jurusan"
                            error={form.errors.external_program_name}
                        >
                            <input
                                required
                                className={authInputClass}
                                placeholder="Contoh: Teknologi Informasi / D4 TRPL"
                                value={form.data.external_program_name}
                                onChange={(e) =>
                                    form.setData(
                                        'external_program_name',
                                        e.target.value,
                                    )
                                }
                            />
                        </AuthField>
                    </>
                )}

                {showUnandAcademic && (
                    <>
                        {!form.data.no_nim && (
                            <AuthField label="Angkatan dari NIM">
                                <output className="block py-2 font-medium">
                                    {cohortFromNim(form.data.nim_nip) ||
                                        'Isi NIM yang valid terlebih dahulu'}
                                </output>
                                <p className="text-muted text-xs">
                                    Dua digit awal NIM menentukan tahun masuk
                                    kuliah.
                                </p>
                            </AuthField>
                        )}
                        <AcademicFields
                            {...options}
                            value={form.data}
                            errors={form.errors}
                            onChange={(selection) =>
                                form.setData({ ...form.data, ...selection })
                            }
                        />
                    </>
                )}

                <AuthField label="Jenis kelamin" error={form.errors.gender}>
                    <select
                        className={authInputClass}
                        value={form.data.gender}
                        onChange={(e) => form.setData('gender', e.target.value)}
                    >
                        <option value="laki_laki">Laki-laki</option>
                        <option value="perempuan">Perempuan</option>
                    </select>
                </AuthField>
                <AuthField
                    label={
                        isExternalCampus
                            ? 'Email aktif (Kampus / Gmail)'
                            : 'Email (@unand.ac.id / Gmail)'
                    }
                    error={form.errors.email}
                >
                    <input
                        required
                        type="email"
                        autoComplete="email"
                        placeholder={
                            isExternalCampus
                                ? 'nama@pnp.ac.id atau nama@gmail.com'
                                : 'nama@unand.ac.id atau nama@gmail.com'
                        }
                        pattern={
                            isExternalCampus
                                ? undefined
                                : '^[^@\\s]+@((([a-zA-Z0-9-]+\\.)*unand\\.ac\\.id)|(gmail\\.com|googlemail\\.com))$'
                        }
                        title={
                            isExternalCampus
                                ? 'Masukkan alamat email aktif yang valid'
                                : 'Gunakan email @unand.ac.id atau akun Google (@gmail.com)'
                        }
                        className={authInputClass}
                        value={form.data.email}
                        onChange={(e) => form.setData('email', e.target.value)}
                    />
                    <p className="text-muted mt-1 text-xs">
                        {isExternalCampus
                            ? 'Gunakan email kampus asal atau email pribadi aktif Anda.'
                            : 'Gunakan email berdomain @unand.ac.id atau akun Google (@gmail.com).'}
                    </p>
                </AuthField>
                <AuthField label="Nomor telepon" error={form.errors.no_hp}>
                    <input
                        className={authInputClass}
                        value={form.data.no_hp}
                        onChange={(e) => form.setData('no_hp', e.target.value)}
                    />
                </AuthField>
                <AuthField label="Password" error={form.errors.password}>
                    <PasswordInput
                        required
                        minLength={8}
                        autoComplete="new-password"
                        className={authInputClass}
                        value={form.data.password}
                        onChange={(e) =>
                            form.setData('password', e.target.value)
                        }
                    />
                </AuthField>
                <AuthField
                    label="Ulangi password"
                    error={form.errors.password_confirmation}
                >
                    <PasswordInput
                        required
                        minLength={8}
                        autoComplete="new-password"
                        className={authInputClass}
                        value={form.data.password_confirmation}
                        onChange={(e) =>
                            form.setData(
                                'password_confirmation',
                                e.target.value,
                            )
                        }
                    />
                </AuthField>
                <p className="text-muted col-span-full text-sm">
                    {isAsn
                        ? 'Akun ASN / Dosen diperuntukkan khusus hunian Rusun ASN. Anda juga dapat langsung masuk dengan SSO Dosen UNAND.'
                        : isExternalCampus
                          ? 'Mahasiswa luar kampus UNAND mengikuti pilihan kamar dan tarif jalur reguler non-KIP-K atau internasional.'
                          : 'KIP-K ditentukan otomatis dari NIM, angkatan, dan daftar penerima yang dikelola admin. Jika hasilnya tidak sesuai, hubungi Admin Layanan untuk pemeriksaan data.'}
                </p>
                <div className="col-span-full">
                    <AuthSubmitButton processing={form.processing}>
                        Buat akun
                    </AuthSubmitButton>
                </div>
            </form>
            <p className="mt-4 text-center text-sm">
                <Link className="link link-primary" href={login.url()}>
                    Sudah punya akun? Masuk
                </Link>
            </p>
        </AndalasAuthShell>
    );
}
