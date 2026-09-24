import { Head, Link, useForm } from '@inertiajs/react';
import { login } from '@/routes';
import { store } from '@/routes/register';
import {
    AndalasAuthShell,
    AuthField,
    AuthSubmitButton,
    authInputClass,
} from '@/andalas/components/AndalasAuthShell';

export default function Register({
    prodi = [],
}: {
    prodi?: Array<{ id: string; name: string }>;
}) {
    const form = useForm({
        nama: '',
        nim_nip: '',
        email: '',
        password: '',
        password_confirmation: '',
        client_profile_category: 'local_non_kipk',
        angkatan: '',
        prodi_id: '',
        gender: 'laki_laki',
        no_hp: '',
    });
    const nonStudent = form.data.client_profile_category === 'non_student';
    const categories = [
        ['local_non_kipk', 'Mahasiswa baru lokal non-KIPK'],
        ['local_kipk', 'Mahasiswa baru lokal KIPK'],
        ['local_resident', 'Mahasiswa hunian lokal / alumni'],
        ['international_student', 'Mahasiswa internasional'],
        [
            'international_free_facility',
            'Mahasiswa internasional dengan fasilitas asrama gratis',
        ],
        ['non_student', 'Non-mahasiswa'],
    ];
    return (
        <AndalasAuthShell>
            <Head title="Daftar Akun Andalas Residence" />
            <h1 className="mb-5 text-2xl font-bold">Daftar akun</h1>
            <form
                className="space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(store.url());
                }}
            >
                <AuthField
                    label="Kategori client"
                    error={form.errors.client_profile_category}
                >
                    <select
                        className={authInputClass}
                        value={form.data.client_profile_category}
                        onChange={(event) =>
                            form.setData(
                                'client_profile_category',
                                event.target.value,
                            )
                        }
                    >
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
                        <AuthField
                            label="Tahun masuk / angkatan"
                            error={form.errors.angkatan}
                        >
                            <input
                                required
                                type="number"
                                min="1900"
                                max={new Date().getFullYear()}
                                className={authInputClass}
                                value={form.data.angkatan}
                                onChange={(e) =>
                                    form.setData('angkatan', e.target.value)
                                }
                            />
                        </AuthField>
                        <AuthField
                            label="Program studi (jika tersedia)"
                            error={form.errors.prodi_id}
                        >
                            <select
                                className={authInputClass}
                                value={form.data.prodi_id}
                                onChange={(e) =>
                                    form.setData('prodi_id', e.target.value)
                                }
                            >
                                <option value="">Pilih program studi</option>
                                {prodi.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </AuthField>
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
                    <input
                        required
                        type="password"
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
                    <input
                        required
                        type="password"
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
                <p className="text-muted text-sm">
                    Kategori dan fasilitas gratis diperiksa admin saat
                    pendaftaran hunian. Untuk surat bebas asrama, isi angkatan
                    sesuai tahun masuk kuliah.
                </p>
                <AuthSubmitButton processing={form.processing}>
                    Buat akun
                </AuthSubmitButton>
            </form>
            <p className="mt-4 text-center text-sm">
                <Link className="link link-primary" href={login.url()}>
                    Sudah punya akun? Masuk
                </Link>
            </p>
        </AndalasAuthShell>
    );
}
