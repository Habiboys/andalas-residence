import { Head, Link, useForm } from '@inertiajs/react';
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

export default function Register(options: AcademicOptions) {
    const form = useForm({
        nama: '',
        nim_nip: '',
        email: '',
        password: '',
        password_confirmation: '',
        client_profile_category: '',
        faculty_id: '',
        departemen_id: '',
        prodi_id: '',
        gender: 'laki_laki',
        no_hp: '',
    });
    const nonStudent = form.data.client_profile_category === 'non_student';
    const categories = [
        ['local_student', 'Mahasiswa lokal'],
        ['international_student', 'Mahasiswa internasional'],
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
                        onChange={(event) =>
                            form.setData(
                                'client_profile_category',
                                event.target.value,
                            )
                        }
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
                <AuthField
                    label={
                        nonStudent
                            ? 'Nomor identitas (NIK/paspor)'
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
                {!nonStudent && (
                    <>
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
                <AuthField label="Email" error={form.errors.email}>
                    <input
                        required
                        type="email"
                        autoComplete="email"
                        className={authInputClass}
                        value={form.data.email}
                        onChange={(e) => form.setData('email', e.target.value)}
                    />
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
                    KIP-K ditentukan otomatis dari NIM, angkatan, dan daftar
                    penerima yang dikelola admin. Jika hasilnya tidak sesuai,
                    hubungi Admin Layanan untuk pemeriksaan data. Pembiayaan
                    sponsor memerlukan pengesahan admin saat pendaftaran hunian.
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
