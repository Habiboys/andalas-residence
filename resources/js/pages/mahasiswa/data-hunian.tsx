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
    const [provinceId, setProvinceId] = useState(city?.province?.id ?? '');
    const provinces = Array.from(
        new Map(
            cities
                .filter((item) => item.province)
                .map((item) => [item.province!.id, item.province!]),
        ).values(),
    ).sort((a, b) => a.name.localeCompare(b.name));
    const provinceCities = cities.filter(
        (item) => item.province?.id === provinceId,
    );
    const identityReady = !!(
        form.data.nama.trim() &&
        form.data.no_hp.trim() &&
        form.data.gender &&
        /^\d{16}$/.test(form.data.nik)
    );
    const addressReady = !!(program && city && form.data.alamat.trim());
    const control = 'input input-bordered w-full';
    const categories: Record<string, string> = {
        local_kipk: 'Mahasiswa KIP-K',
        local_non_kipk: 'Mahasiswa lokal non-KIP-K',
        international_student: 'Mahasiswa internasional',
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Head title="Data pendaftaran hunian" />
            <header className="space-y-1">
                <h1 className="text-2xl font-bold">Data pendaftaran hunian</h1>
                <p className="text-base-content/70 text-sm">
                    Lengkapi data identitas resmi, akademik, dan alamat asal
                    sebelum memilih kamar asrama.
                </p>
            </header>

            <ol
                className="grid grid-cols-3 gap-3 text-sm"
                aria-label="Tahapan data hunian"
            >
                {['Identitas', 'Akademik dan alamat', 'Review data'].map(
                    (label, index) => (
                        <li
                            key={label}
                            aria-current={step === index ? 'step' : undefined}
                            className={`rounded-xl border p-3 transition ${
                                step === index
                                    ? 'border-primary bg-primary/5 text-primary font-semibold'
                                    : step > index
                                      ? 'border-success/40 bg-success/5 text-success font-medium'
                                      : 'border-base-300 text-base-content/60'
                            }`}
                        >
                            <span className="block text-xs opacity-70">
                                Langkah {index + 1}
                            </span>
                            {label}
                        </li>
                    ),
                )}
            </ol>

            <form
                className="card bg-base-100 border-base-300 space-y-5 rounded-xl border p-5 shadow-xs md:p-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (step === 2 && identityReady && addressReady) {
                        form.post(saveUrl);
                    }
                }}
            >
                {step === 0 && (
                    <div className="space-y-4">
                        <div className="bg-info/10 border-info/30 rounded-lg border p-3 text-sm">
                            <p className="font-medium">
                                Isi ulang nama lengkap sesuai dokumen resmi.
                            </p>
                            <p className="text-base-content/70 mt-0.5 text-xs">
                                Nama bawaan SSO dapat belum sesuai ejaan KTP/KTM.
                                Ketik ulang nama lengkap Anda untuk keperluan
                                kontrak dan dokumen resmi asrama.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block space-y-1.5 text-sm font-medium sm:col-span-2">
                                <span>Nama lengkap</span>
                                <input
                                    className={control}
                                    autoComplete="name"
                                    placeholder="Ketik nama lengkap sesuai KTP / KTM"
                                    value={form.data.nama}
                                    onChange={(e) =>
                                        form.setData('nama', e.target.value)
                                    }
                                    maxLength={255}
                                />
                            </label>

                            <label className="block space-y-1.5 text-sm font-medium">
                                <span>NIK (16 digit)</span>
                                <input
                                    className={control}
                                    inputMode="numeric"
                                    maxLength={16}
                                    placeholder="16 digit Nomor Induk Kependudukan"
                                    value={form.data.nik}
                                    onChange={(e) =>
                                        form.setData('nik', e.target.value)
                                    }
                                />
                            </label>

                            <label className="block space-y-1.5 text-sm font-medium">
                                <span>Nomor telepon</span>
                                <input
                                    className={control}
                                    type="tel"
                                    maxLength={20}
                                    placeholder="Contoh: 081234567890"
                                    value={form.data.no_hp}
                                    onChange={(e) =>
                                        form.setData('no_hp', e.target.value)
                                    }
                                />
                            </label>

                            <label className="block space-y-1.5 text-sm font-medium sm:col-span-2">
                                <span>Jenis kelamin</span>
                                <select
                                    className="select select-bordered w-full"
                                    value={form.data.gender}
                                    onChange={(e) =>
                                        form.setData('gender', e.target.value)
                                    }
                                >
                                    <option value="">
                                        Pilih jenis kelamin
                                    </option>
                                    <option value="laki_laki">Laki-laki</option>
                                    <option value="perempuan">Perempuan</option>
                                </select>
                            </label>
                        </div>

                        <div className="bg-base-200/60 border-base-300 min-w-0 space-y-1.5 rounded-lg border p-4 text-sm">
                            <p className="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
                                Informasi Akun Sistem (Otomatis)
                            </p>
                            <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[auto_1fr]">
                                <dt className="text-base-content/60 text-xs">
                                    Nomor identitas
                                </dt>
                                <dd className="font-medium break-all">
                                    {identity.nim_nip}
                                </dd>
                                <dt className="text-base-content/60 text-xs">
                                    Email
                                </dt>
                                <dd className="font-medium break-all">
                                    {identity.email}
                                </dd>
                                <dt className="text-base-content/60 text-xs">
                                    Status
                                </dt>
                                <dd>
                                    Mahasiswa ·{' '}
                                    {identity.status === 'aktif'
                                        ? 'Aktif'
                                        : identity.status}
                                </dd>
                            </dl>
                            <p className="text-base-content/70 text-xs break-words">
                                {categories[identity.category ?? ''] ??
                                    'Kategori ditentukan setelah verifikasi data'}
                            </p>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-4">
                        <label className="block space-y-1.5 text-sm font-medium">
                            <span>Program studi</span>
                            <select
                                className="select select-bordered w-full"
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
                            <div className="bg-base-200/60 border-base-300 rounded-lg border p-3 text-sm">
                                <span className="text-base-content/60 block text-xs">
                                    Fakultas, Departemen &amp; Jenjang
                                </span>
                                <p className="font-medium">
                                    {program.departemen?.faculty?.name} ·{' '}
                                    {program.departemen?.name} ·{' '}
                                    {program.jenjang}
                                </p>
                            </div>
                        )}

                        <p className="bg-base-200/60 border-base-300 rounded-lg border p-3 text-sm font-medium">
                            Angkatan{' '}
                            {profile?.angkatan || 'ditentukan dari NIM'}
                        </p>

                        {cities.length === 0 ? (
                            <p
                                role="alert"
                                className="alert alert-warning py-2 text-sm"
                            >
                                Data kota/kabupaten belum tersedia di sistem.
                                Hubungi Admin Asrama agar menyinkronkan data
                                wilayah terlebih dahulu.
                            </p>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block space-y-1.5 text-sm font-medium">
                                    <span>Provinsi asal</span>
                                    <select
                                        className="select select-bordered w-full"
                                        value={provinceId}
                                        onChange={(e) => {
                                            setProvinceId(e.target.value);
                                            form.setData('city_id', '');
                                        }}
                                    >
                                        <option value="">Pilih provinsi</option>
                                        {provinces.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block space-y-1.5 text-sm font-medium">
                                    <span>Kota atau kabupaten asal</span>
                                    <select
                                        className="select select-bordered w-full"
                                        value={form.data.city_id}
                                        disabled={!provinceId}
                                        onChange={(e) =>
                                            form.setData('city_id', e.target.value)
                                        }
                                    >
                                        <option value="">
                                            {provinceId
                                                ? 'Pilih kota atau kabupaten'
                                                : 'Pilih provinsi terlebih dahulu'}
                                        </option>
                                        {provinceCities.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        )}

                        <label className="block space-y-1.5 text-sm font-medium">
                            <span>Alamat lengkap</span>
                            <textarea
                                className="textarea textarea-bordered w-full"
                                rows={3}
                                maxLength={500}
                                placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan/nagari, kecamatan"
                                value={form.data.alamat}
                                onChange={(e) =>
                                    form.setData('alamat', e.target.value)
                                }
                            />
                        </label>
                    </div>
                )}

                {step === 2 && (
                    <div className="bg-base-200/50 border-base-300 space-y-3 rounded-xl border p-4 text-sm">
                        <p className="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
                            Ringkasan Data Pendaftaran Hunian
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <span className="text-base-content/60 block text-xs">
                                    Nama lengkap resmi
                                </span>
                                <p className="text-base font-semibold">
                                    {form.data.nama}
                                </p>
                            </div>
                            <div>
                                <span className="text-base-content/60 block text-xs">
                                    NIM &amp; Email
                                </span>
                                <p>
                                    {identity.nim_nip} · {identity.email}
                                </p>
                            </div>
                            <div>
                                <span className="text-base-content/60 block text-xs">
                                    NIK &amp; Telepon
                                </span>
                                <p>
                                    NIK {form.data.nik} · {form.data.no_hp}
                                </p>
                            </div>
                            <div>
                                <span className="text-base-content/60 block text-xs">
                                    Jenis kelamin
                                </span>
                                <p>
                                    {form.data.gender === 'laki_laki'
                                        ? 'Laki-laki'
                                        : 'Perempuan'}
                                </p>
                            </div>
                            <div className="sm:col-span-2">
                                <span className="text-base-content/60 block text-xs">
                                    Program studi &amp; Fakultas
                                </span>
                                <p>
                                    {program?.name} ·{' '}
                                    {program?.departemen?.faculty?.name}
                                </p>
                            </div>
                            <div className="sm:col-span-2">
                                <span className="text-base-content/60 block text-xs">
                                    Alamat asal
                                </span>
                                <p>
                                    {form.data.alamat}, {city?.name},{' '}
                                    {city?.province?.name}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {Object.entries(form.errors).map(([key, message]) => (
                    <p
                        role="alert"
                        className="alert alert-error py-2 text-sm"
                        key={key}
                    >
                        {message}
                    </p>
                ))}

                <div className="border-base-300 flex justify-between gap-3 border-t pt-4">
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
        </div>
    );
}
