import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

type Option = { id: string; name: string };
type Program = Option & {
    jenjang: string;
    departemen?: Option & { faculty?: Option };
};
type City = Option & { province?: Option };

export default function DataHunian({
    profile,
    identity,
    programs,
    cities,
    saveUrl,
    registrationUrl,
}: {
    profile?: {
        prodi_id?: string;
        city_id?: string;
        angkatan?: number;
        nik?: string;
        alamat?: string;
    };
    identity: {
        nim_nip: string;
        email: string;
        gender?: string;
        no_hp?: string;
        status: string;
        category?: string;
    };
    programs: Program[];
    cities: City[];
    saveUrl: string;
    registrationUrl: string;
}) {
    const [step, setStep] = useState(0);
    const form = useForm({
        nama: '',
        no_hp: identity.no_hp ?? '',
        gender: identity.gender ?? '',
        prodi_id: profile?.prodi_id ?? '',
        city_id: profile?.city_id ?? '',
        nik: profile?.nik ?? '',
        alamat: profile?.alamat ?? '',
    });
    const program = programs.find((item) => item.id === form.data.prodi_id);
    const city = cities.find((item) => item.id === form.data.city_id);
    const identityReady = !!(
        form.data.nama.trim() &&
        form.data.no_hp.trim() &&
        form.data.gender &&
        /^\d{16}$/.test(form.data.nik)
    );
    const addressReady = !!(program && city && form.data.alamat.trim());
    const control = 'input w-full';
    const categories: Record<string, string> = {
        local_kipk: 'Mahasiswa KIP-K',
        local_non_kipk: 'Mahasiswa lokal non-KIP-K',
        international_student: 'Mahasiswa internasional',
    };

    return (
        <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-8">
            <Head title="Data pendaftaran hunian" />
            <h1 className="text-2xl font-bold">Data pendaftaran hunian</h1>
            <ol
                className="grid grid-cols-3 gap-3 text-sm"
                aria-label="Tahapan data hunian"
            >
                {['Identitas', 'Akademik dan alamat', 'Review data'].map(
                    (label, index) => (
                        <li
                            key={label}
                            aria-current={step === index ? 'step' : undefined}
                            className={
                                step === index
                                    ? 'text-primary font-semibold'
                                    : ''
                            }
                        >
                            {label}
                        </li>
                    ),
                )}
            </ol>
            <form
                className="card bg-base-100 border-base-300 space-y-4 border p-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (step === 2 && identityReady && addressReady)
                        form.post(saveUrl);
                }}
            >
                {step === 0 && (
                    <>
                        <p>Isi ulang nama lengkap sesuai dokumen resmi.</p>
                        <label>
                            Nama lengkap
                            <input
                                className={control}
                                autoComplete="name"
                                value={form.data.nama}
                                onChange={(e) =>
                                    form.setData('nama', e.target.value)
                                }
                                maxLength={255}
                            />
                        </label>
                        <label>
                            NIK
                            <input
                                className={control}
                                inputMode="numeric"
                                maxLength={16}
                                value={form.data.nik}
                                onChange={(e) =>
                                    form.setData('nik', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Nomor telepon
                            <input
                                className={control}
                                type="tel"
                                maxLength={20}
                                value={form.data.no_hp}
                                onChange={(e) =>
                                    form.setData('no_hp', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Jenis kelamin
                            <select
                                className="select w-full"
                                value={form.data.gender}
                                onChange={(e) =>
                                    form.setData('gender', e.target.value)
                                }
                            >
                                <option value="">Pilih jenis kelamin</option>
                                <option value="laki_laki">Laki-laki</option>
                                <option value="perempuan">Perempuan</option>
                            </select>
                        </label>
                        <p>
                            Nomor identitas {identity.nim_nip} ·{' '}
                            {identity.email}
                        </p>
                        <p>
                            Mahasiswa ·{' '}
                            {identity.status === 'aktif'
                                ? 'Aktif'
                                : identity.status}
                        </p>
                        <p>
                            {categories[identity.category ?? ''] ??
                                'Kategori ditentukan setelah verifikasi data'}
                        </p>
                    </>
                )}
                {step === 1 && (
                    <>
                        <label>
                            Program studi
                            <select
                                className="select w-full"
                                value={form.data.prodi_id}
                                onChange={(e) =>
                                    form.setData('prodi_id', e.target.value)
                                }
                            >
                                <option value="">Pilih program studi</option>
                                {programs.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} ({item.jenjang})
                                    </option>
                                ))}
                            </select>
                        </label>
                        {program && (
                            <p>
                                {program.departemen?.faculty?.name} ·{' '}
                                {program.departemen?.name} · {program.jenjang}
                            </p>
                        )}
                        <p>
                            Angkatan{' '}
                            {profile?.angkatan || 'ditentukan dari NIM'}
                        </p>
                        <label>
                            Kota atau kabupaten
                            <select
                                className="select w-full"
                                value={form.data.city_id}
                                onChange={(e) =>
                                    form.setData('city_id', e.target.value)
                                }
                            >
                                <option value="">
                                    Pilih kota atau kabupaten
                                </option>
                                {cities.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} · {item.province?.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {city?.province && <p>Provinsi {city.province.name}</p>}
                        <label>
                            Alamat lengkap
                            <textarea
                                className="textarea w-full"
                                maxLength={500}
                                value={form.data.alamat}
                                onChange={(e) =>
                                    form.setData('alamat', e.target.value)
                                }
                            />
                        </label>
                    </>
                )}
                {step === 2 && (
                    <div className="space-y-2">
                        <p className="font-semibold">{form.data.nama}</p>
                        <p>
                            {identity.nim_nip} · {identity.email}
                        </p>
                        <p>
                            NIK {form.data.nik} · {form.data.no_hp}
                        </p>
                        <p>
                            {form.data.gender === 'laki_laki'
                                ? 'Laki-laki'
                                : 'Perempuan'}
                        </p>
                        <p>
                            {program?.name} ·{' '}
                            {program?.departemen?.faculty?.name}
                        </p>
                        <p>
                            {form.data.alamat}, {city?.name},{' '}
                            {city?.province?.name}
                        </p>
                    </div>
                )}
                {Object.entries(form.errors).map(([key, message]) => (
                    <p role="alert" className="text-error" key={key}>
                        {message}
                    </p>
                ))}
                <div className="flex justify-between gap-3">
                    {step > 0 ? (
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => setStep(step - 1)}
                        >
                            Kembali
                        </button>
                    ) : (
                        <Link href={registrationUrl} className="btn btn-ghost">
                            Kembali ke pendaftaran
                        </Link>
                    )}
                    {step < 2 ? (
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={
                                step === 0 ? !identityReady : !addressReady
                            }
                            onClick={() => setStep(step + 1)}
                        >
                            Lanjut
                        </button>
                    ) : (
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={form.processing}
                        >
                            Simpan dan lanjutkan
                        </button>
                    )}
                </div>
            </form>
        </main>
    );
}
