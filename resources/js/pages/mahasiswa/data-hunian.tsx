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
    const [confirmOpen, setConfirmOpen] = useState(false);
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
    const [facultyId, setFacultyId] = useState(
        program?.departemen?.faculty?.id ?? '',
    );
    const [departmentId, setDepartmentId] = useState(
        program?.departemen?.id ?? '',
    );
    const faculties = Array.from(
        new Map(
            programs
                .filter((item) => item.departemen?.faculty)
                .map((item) => [
                    item.departemen!.faculty!.id,
                    item.departemen!.faculty!,
                ]),
        ).values(),
    ).sort((a, b) => a.name.localeCompare(b.name));
    const departments = Array.from(
        new Map(
            programs
                .filter(
                    (item) =>
                        item.departemen &&
                        (!facultyId ||
                            item.departemen.faculty?.id === facultyId),
                )
                .map((item) => [item.departemen!.id, item.departemen!]),
        ).values(),
    ).sort((a, b) => a.name.localeCompare(b.name));
    const filteredPrograms = programs.filter(
        (item) =>
            (!facultyId || item.departemen?.faculty?.id === facultyId) &&
            (!departmentId || item.departemen?.id === departmentId),
    );

    const city = cities.find((item) => item.id === form.data.city_id);
    const [cityQuery, setCityQuery] = useState(
        city
            ? `${city.name}${city.province ? ` · ${city.province.name}` : ''}`
            : '',
    );
    const [cityMenuOpen, setCityMenuOpen] = useState(false);
    const normalizedCityQuery = cityQuery.trim().toLowerCase();
    const matchedCities = (
        normalizedCityQuery && !city
            ? cities.filter((item) => {
                  const label =
                      `${item.name} ${item.province?.name ?? ''}`.toLowerCase();
                  return label.includes(normalizedCityQuery);
              })
            : cities
    ).slice(0, 30);
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
                        setConfirmOpen(true);
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
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block space-y-1.5 text-sm font-medium">
                                <span>Fakultas</span>
                                <select
                                    className="select select-bordered w-full"
                                    value={facultyId}
                                    onChange={(e) => {
                                        setFacultyId(e.target.value);
                                        setDepartmentId('');
                                        form.setData('prodi_id', '');
                                    }}
                                >
                                    <option value="">Pilih fakultas</option>
                                    {faculties.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block space-y-1.5 text-sm font-medium">
                                <span>Departemen</span>
                                <select
                                    className="select select-bordered w-full"
                                    value={departmentId}
                                    disabled={!facultyId}
                                    onChange={(e) => {
                                        setDepartmentId(e.target.value);
                                        form.setData('prodi_id', '');
                                    }}
                                >
                                    <option value="">
                                        {facultyId
                                            ? 'Pilih departemen'
                                            : 'Pilih fakultas terlebih dahulu'}
                                    </option>
                                    {departments.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <label className="block space-y-1.5 text-sm font-medium">
                            <span>Program studi</span>
                            <select
                                className="select select-bordered w-full"
                                value={form.data.prodi_id}
                                disabled={!departmentId}
                                onChange={(e) =>
                                    form.setData('prodi_id', e.target.value)
                                }
                            >
                                <option value="">
                                    {departmentId
                                        ? 'Pilih program studi'
                                        : 'Pilih departemen terlebih dahulu'}
                                </option>
                                {filteredPrograms.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} ({item.jenjang})
                                    </option>
                                ))}
                            </select>
                        </label>

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
                            <div className="relative space-y-1.5 text-sm">
                                <label className="block space-y-1.5 font-medium">
                                    <span>Kota atau kabupaten asal</span>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className={control}
                                            role="combobox"
                                            aria-expanded={cityMenuOpen}
                                            aria-autocomplete="list"
                                            placeholder="Ketik nama kota/kabupaten atau provinsi (misal: Padang, Tanah Datar)"
                                            value={cityQuery}
                                            onFocus={() =>
                                                setCityMenuOpen(true)
                                            }
                                            onBlur={() =>
                                                setTimeout(
                                                    () =>
                                                        setCityMenuOpen(false),
                                                    150,
                                                )
                                            }
                                            onChange={(e) => {
                                                setCityQuery(e.target.value);
                                                if (form.data.city_id) {
                                                    form.setData('city_id', '');
                                                }
                                                setCityMenuOpen(true);
                                            }}
                                        />
                                        {cityQuery && (
                                            <button
                                                type="button"
                                                aria-label="Hapus pilihan kota atau kabupaten"
                                                onClick={() => {
                                                    setCityQuery('');
                                                    form.setData('city_id', '');
                                                    setCityMenuOpen(true);
                                                }}
                                                className="btn btn-ghost btn-xs absolute top-1/2 right-2 -translate-y-1/2"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </label>

                                {cityMenuOpen && (
                                    <ul
                                        role="listbox"
                                        aria-label="Daftar kota atau kabupaten"
                                        className="bg-base-100 border-base-300 absolute z-20 max-h-60 w-full overflow-y-auto rounded-lg border p-1 shadow-lg"
                                    >
                                        {matchedCities.length === 0 ? (
                                            <li className="text-base-content/60 px-3 py-2 text-xs">
                                                Kota atau kabupaten tidak
                                                ditemukan.
                                            </li>
                                        ) : (
                                            matchedCities.map((item) => (
                                                <li key={item.id}>
                                                    <button
                                                        type="button"
                                                        role="option"
                                                        aria-selected={
                                                            form.data
                                                                .city_id ===
                                                            item.id
                                                        }
                                                        onMouseDown={(e) =>
                                                            e.preventDefault()
                                                        }
                                                        onClick={() => {
                                                            form.setData(
                                                                'city_id',
                                                                item.id,
                                                            );
                                                            setCityQuery(
                                                                `${item.name}${item.province ? ` · ${item.province.name}` : ''}`,
                                                            );
                                                            setCityMenuOpen(
                                                                false,
                                                            );
                                                        }}
                                                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                                            form.data
                                                                .city_id ===
                                                            item.id
                                                                ? 'bg-primary text-primary-content font-medium'
                                                                : 'hover:bg-base-200'
                                                        }`}
                                                    >
                                                        <span>{item.name}</span>
                                                        {item.province && (
                                                            <span
                                                                className={`text-xs ${
                                                                    form.data
                                                                        .city_id ===
                                                                    item.id
                                                                        ? 'text-primary-content/80'
                                                                        : 'text-base-content/60'
                                                                }`}
                                                            >
                                                                {
                                                                    item
                                                                        .province
                                                                        .name
                                                                }
                                                            </span>
                                                        )}
                                                    </button>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                )}

                                {city?.province ? (
                                    <p className="text-success text-xs font-medium">
                                        Terpilih: {city.name} · Provinsi{' '}
                                        {city.province.name}
                                    </p>
                                ) : cityQuery.trim() ? (
                                    <p className="text-warning text-xs">
                                        Klik salah satu kota/kabupaten dari
                                        daftar yang muncul.
                                    </p>
                                ) : null}
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
                            key="step-next"
                            type="button"
                            className="btn btn-primary"
                            disabled={
                                step === 0 ? !identityReady : !addressReady
                            }
                            onClick={(e) => {
                                e.preventDefault();
                                setStep(step + 1);
                            }}
                        >
                            Lanjut
                        </button>
                    ) : (
                        <button
                            key="step-submit"
                            type="submit"
                            className="btn btn-primary"
                            disabled={form.processing}
                        >
                            Simpan dan lanjutkan
                        </button>
                    )}
                </div>
            </form>

            {confirmOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-data-hunian-title"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                >
                    <div className="bg-base-100 border-base-300 w-full max-w-md space-y-4 rounded-2xl border p-5 shadow-xl">
                        <div className="space-y-1">
                            <h2
                                id="confirm-data-hunian-title"
                                className="text-lg font-bold"
                            >
                                Konfirmasi Simpan Data Hunian
                            </h2>
                            <p className="text-base-content/70 text-sm">
                                Pastikan seluruh data sudah benar karena akan
                                digunakan untuk kontrak dan dokumen resmi
                                asrama.
                            </p>
                        </div>
                        <dl className="bg-base-200/60 border-base-300 space-y-2 rounded-xl border p-3 text-sm">
                            <div>
                                <dt className="text-base-content/60 text-xs">
                                    Nama lengkap resmi
                                </dt>
                                <dd className="font-semibold">
                                    {form.data.nama}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-base-content/60 text-xs">
                                    NIK &amp; Telepon
                                </dt>
                                <dd>
                                    {form.data.nik} · {form.data.no_hp}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-base-content/60 text-xs">
                                    Program studi &amp; Kota/Kabupaten asal
                                </dt>
                                <dd>
                                    {program?.name} · {city?.name}
                                </dd>
                            </div>
                        </dl>
                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                className="btn btn-outline"
                                disabled={form.processing}
                                onClick={() => setConfirmOpen(false)}
                            >
                                Periksa kembali
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={form.processing}
                                onClick={() =>
                                    form.post(saveUrl, {
                                        onError: () => setConfirmOpen(false),
                                        onFinish: () => setConfirmOpen(false),
                                    })
                                }
                            >
                                {form.processing
                                    ? 'Menyimpan...'
                                    : 'Ya, simpan data'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
