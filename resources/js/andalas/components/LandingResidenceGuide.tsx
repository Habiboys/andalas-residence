import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Bath,
    BookOpen,
    Car,
    CheckCircle2,
    Download,
    FileText,
    Globe2,
    GraduationCap,
    HeartHandshake,
    Landmark,
    ShieldCheck,
    Shirt,
    Sparkles,
    Users,
    Wifi,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { type RegistrationTrackSetting } from '../lib/landing-settings';
import { formatRupiah } from '../lib/format';
import type { ResidenceListing } from './ResidenceMarketplace';
import { register } from '@/routes';

export type PublicPaymentAccount = {
    id: string;
    bank_name: string;
    account_number: string;
    account_name: string;
};

export type PublicRegulationDoc = {
    id: string;
    kategori: string;
    judul: string;
    file: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
    local_non_kipk: 'Mahasiswa Lokal (S1)',
    local_kipk: 'Mahasiswa KIP-K',
    international: 'Internasional / S2 / S3',
    summer_course: 'Summer Course / Kegiatan',
    non_student: 'Umum / Sewa Harian',
};

const UNIT_LABELS: Record<string, string> = {
    year: 'tahun',
    semester: 'semester',
    month: 'bulan',
    day: 'hari',
};

const GENDER_LABELS: Record<string, string> = {
    laki_laki: 'Putra',
    perempuan: 'Putri',
    campur: 'Campur',
};

const TRACKS = [
    {
        badge: 'Rekomendasi Mahasiswa Baru',
        title: 'Mahasiswa Lokal (S1) & KIP-K',
        icon: GraduationCap,
        description:
            'Jalur utama bagi mahasiswa S1 Universitas Andalas menggunakan akun @unand.ac.id atau Google (@gmail.com). Mahasiswa baru yang belum memiliki NIM dapat mendaftar dengan tahun angkatan dan melengkapi NIM sebelum memilih kamar.',
        points: [
            'Non-KIP-K dapat memilih skema per orang, per grup bersama teman, atau booking 1 kamar.',
            'Penerima KIP-K terverifikasi otomatis dan dialokasikan pengelola sesuai prioritas serta kapasitas.',
        ],
        ctaLabel: 'Daftar Akun S1',
        ctaHref: register.url(),
    },
    {
        badge: 'Pascasarjana & Warga Negara Asing',
        title: 'Mahasiswa Internasional & S2/S3',
        icon: Globe2,
        description:
            'Diperuntukkan bagi mahasiswa internasional serta mahasiswa program magister (S2) dan doktoral (S3) yang memerlukan hunian kampus atau fasilitas penempatan terkoordinasi.',
        points: [
            'Gedung dan tipe kamar menyesuaikan kebijakan kategori Internasional / S2 / S3 yang dibuka.',
            'Mendukung pembiayaan mandiri maupun penjamin/sponsor institusi resmi.',
            'Proses administrasi, surat pernyataan, dan verifikasi dipantau langsung dari akun Anda.',
        ],
        ctaLabel: 'Daftar Jalur S2/S3 & Internasional',
        ctaHref: register.url(),
    },
    {
        badge: 'Peserta Kegiatan & Jangka Pendek',
        title: 'Sewa Harian / Umum & Kegiatan',
        icon: Users,
        description:
            'Layanan hunian fleksibel bagi peserta Summer Course, tamu akademik, peserta kegiatan kampus, atau penyewa umum jangka pendek sesuai ketersediaan kamar.',
        points: [
            'Tarif transparan per hari atau per periode kegiatan tanpa biaya tersembunyi.',
            'Penempatan kelompok kegiatan maupun tamu difasilitasi pengelola dan fasilitator gedung.',
            'Bukti tagihan, pembayaran, dan administrasi check-out tercatat rapi secara digital.',
        ],
        ctaLabel: 'Cek Ketersediaan Unit',
        ctaHref: '#katalog-hunian',
    },
];

const FACILITIES = [
    {
        title: 'WiFi Area Asrama',
        text: 'Koneksi internet di lingkungan gedung dan ruang bersama untuk menunjang perkuliahan.',
        icon: Wifi,
    },
    {
        title: 'Keamanan 24/7',
        text: 'Pengawasan lingkungan asrama dengan petugas jaga, akses gerbang, dan CCTV area.',
        icon: ShieldCheck,
    },
    {
        title: 'Ruang Belajar & Komunal',
        text: 'Area belajar tenang serta aula berkumpul untuk diskusi akademik dan kegiatan bersama.',
        icon: BookOpen,
    },
    {
        title: 'Kebersihan & Teknisi',
        text: 'Perawatan area umum rutin serta pelaporan kerusakan kamar yang ditangani langsung oleh teknisi.',
        icon: Sparkles,
    },
    {
        title: 'Pembinaan Karakter',
        text: 'Program pembinaan mahasiswa binaan terstruktur bersama fasilitator dengan presensi QR.',
        icon: HeartHandshake,
    },
    {
        title: 'Area Parkir Terpadu',
        text: 'Ketersediaan area parkir kendaraan bermotor di sekitar kompleks gedung hunian.',
        icon: Car,
    },
    {
        title: 'Sanitasi & Air Bersih',
        text: 'Kamar mandi dalam maupun bersama yang terjaga kebersihannya serta pasokan air bersih.',
        icon: Bath,
    },
    {
        title: 'Area Jemur & Penunjang',
        text: 'Fasilitas area jemur pakaian dan ruang penunjang harian penghuni di tiap unit gedung.',
        icon: Shirt,
    },
];

const CORE_RULES = [
    {
        title: 'Bebas Rokok & Barang Terlarang',
        text: 'Dilarang keras merokok, mengonsumsi alkohol, maupun menyimpan barang berbahaya/terlarang di seluruh area asrama.',
    },
    {
        title: 'Kebersihan & Aset Kamar',
        text: 'Penghuni wajib menjaga kebersihan kamar serta fasilitas bersama dan bertanggung jawab atas kondisi aset kamar hingga check-out.',
    },
    {
        title: 'Jam Malam, Tamu & Pembinaan',
        text: 'Patuhi batas jam masuk malam, larangan tamu menginap di kamar, serta kewajiban mengikuti kegiatan pembinaan bagi mahasiswa binaan.',
    },
];

const PAYMENT_STEPS = [
    {
        step: '01',
        title: 'Pilih Kamar & Unggah Berkas',
        text: 'Setelah akun dan data hunian lengkap, pilih kamar (atau tunggu alokasi KIP-K) lalu unggah dokumen persyaratan.',
    },
    {
        step: '02',
        title: 'Cek Tagihan & Rekening / VA',
        text: 'Sistem menerbitkan invoice beserta nominal, batas waktu, nomor Virtual Account (jika tersedia), dan rekening resmi tujuan.',
    },
    {
        step: '03',
        title: 'Transfer & Unggah Bukti Bayar',
        text: 'Lakukan pembayaran melalui ATM, mobile banking, atau teller sesuai tagihan lalu unggah bukti transfer pada menu Pendaftaran / Tagihan.',
    },
    {
        step: '04',
        title: 'Verifikasi Keuangan & Penempatan',
        text: 'Unggahan bukti langsung mengamankan penempatan administratif Anda sambil menunggu verifikasi lunas resmi oleh bagian keuangan.',
    },
];

function resolveTrackIcon(title: string, index: number) {
    const lower = title.toLowerCase();
    if (
        lower.includes('internasional') ||
        lower.includes('s2') ||
        lower.includes('s3')
    ) {
        return Globe2;
    }
    if (
        lower.includes('umum') ||
        lower.includes('harian') ||
        lower.includes('kegiatan')
    ) {
        return Users;
    }
    if (
        lower.includes('lokal') ||
        lower.includes('s1') ||
        lower.includes('kip')
    ) {
        return GraduationCap;
    }
    return [GraduationCap, Globe2, Users][index % 3];
}

function resolveFacilityIcon(title: string, index: number) {
    const lower = title.toLowerCase();
    if (lower.includes('wifi') || lower.includes('internet')) return Wifi;
    if (lower.includes('aman') || lower.includes('cctv')) return ShieldCheck;
    if (lower.includes('belajar') || lower.includes('komunal')) return BookOpen;
    if (lower.includes('bersih') || lower.includes('teknisi')) return Sparkles;
    if (lower.includes('bina') || lower.includes('karakter'))
        return HeartHandshake;
    if (lower.includes('parkir') || lower.includes('kendaraan')) return Car;
    if (
        lower.includes('sanitasi') ||
        lower.includes('air') ||
        lower.includes('mandi')
    )
        return Bath;
    if (lower.includes('jemur') || lower.includes('penunjang')) return Shirt;
    return [
        Wifi,
        ShieldCheck,
        BookOpen,
        Sparkles,
        HeartHandshake,
        Car,
        Bath,
        Shirt,
    ][index % 8];
}

export function RegistrationTracksSection({
    headings = {},
    tracks,
}: {
    headings?: Record<string, string>;
    tracks?: RegistrationTrackSetting[];
} = {}) {
    const items =
        tracks && tracks.length > 0
            ? tracks.map((track, idx) => ({
                  badge: track.badge,
                  title: track.title,
                  icon: resolveTrackIcon(track.title, idx),
                  description: track.description,
                  points: track.points_text
                      .split(/\r?\n/)
                      .map((line) => line.trim())
                      .filter(Boolean),
                  ctaLabel: track.cta_label,
                  ctaHref: track.cta_href || register.url(),
              }))
            : TRACKS;

    return (
        <section
            id="jalur-pendaftaran"
            className="bg-base-100 border-base-200 scroll-mt-24 border-t py-16 md:py-20"
        >
            <div className="mx-auto max-w-7xl px-4 md:px-6">
                <div className="max-w-2xl">
                    <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
                        {headings.tracks_eyebrow || 'Jalur Pendaftaran'}
                    </p>
                    <h2 className="font-display mt-2 text-3xl leading-tight md:text-4xl">
                        {headings.tracks ||
                            'Pilih jalur yang sesuai sebelum membuat akun.'}
                    </h2>
                    <p className="text-muted mt-3 text-sm leading-6 md:text-base">
                        {headings.tracks_intro ||
                            'Setiap jalur memiliki alur pemilihan kamar, verifikasi status, dan skema pembiayaan yang disesuaikan agar proses pendaftaran Anda berjalan lancar.'}
                    </p>
                </div>

                <div className="mt-10 grid gap-6 lg:grid-cols-3">
                    {items.map((track, idx) => {
                        const Icon = track.icon;
                        const highlighted = idx === 0;
                        const isAnchor = track.ctaHref.startsWith('#');

                        return (
                            <article
                                key={track.title}
                                className={`flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-md ${
                                    highlighted
                                        ? 'border-primary/40 bg-primary/5'
                                        : 'border-base-300 bg-base-100'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                            highlighted
                                                ? 'bg-primary text-primary-content'
                                                : 'bg-base-200 text-base-content/80'
                                        }`}
                                    >
                                        {track.badge}
                                    </span>
                                    <Icon
                                        className="text-primary size-5 shrink-0"
                                        aria-hidden="true"
                                    />
                                </div>
                                <h3 className="mt-4 text-xl font-bold">
                                    {track.title}
                                </h3>
                                <p className="text-muted mt-2 text-sm leading-6">
                                    {track.description}
                                </p>
                                <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                                    {track.points.map((point) => (
                                        <li
                                            key={point}
                                            className="flex items-start gap-2.5"
                                        >
                                            <CheckCircle2
                                                className="text-primary mt-0.5 size-4 shrink-0"
                                                aria-hidden="true"
                                            />
                                            <span className="text-base-content/85 leading-5">
                                                {point}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-6 pt-2">
                                    {isAnchor ? (
                                        <a
                                            href={track.ctaHref}
                                            className="btn btn-outline w-full justify-between"
                                        >
                                            <span>{track.ctaLabel}</span>
                                            <ArrowRight className="size-4" />
                                        </a>
                                    ) : (
                                        <Link
                                            href={track.ctaHref}
                                            className={`btn w-full justify-between ${
                                                highlighted
                                                    ? 'btn-primary'
                                                    : 'btn-outline'
                                            }`}
                                        >
                                            <span>{track.ctaLabel}</span>
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export function TariffMatrixSection({
    listings = [],
    headings = {},
}: {
    listings?: ResidenceListing[];
    headings?: Record<string, string>;
}) {
    const buildingsWithRates = useMemo(
        () => listings.filter((item) => item.offers.length > 0),
        [listings],
    );
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');
    const [selectedUnit, setSelectedUnit] = useState<string>('all');

    const availableUnits = useMemo(() => {
        const set = new Set<string>();
        for (const building of buildingsWithRates) {
            for (const offer of building.offers) {
                set.add(offer.unit);
            }
        }
        return ['year', 'semester', 'month', 'day'].filter((u) => set.has(u));
    }, [buildingsWithRates]);

    const rows = useMemo(() => {
        const filteredBuildings =
            selectedBuildingId === 'all'
                ? buildingsWithRates
                : buildingsWithRates.filter((b) => b.id === selectedBuildingId);

        const list: Array<{
            key: string;
            buildingName: string;
            gender: string;
            type: string;
            capacity: number | null;
            category: string;
            unit: string;
            amount: number;
            places: number;
        }> = [];

        for (const building of filteredBuildings) {
            for (const offer of building.offers) {
                if (selectedUnit !== 'all' && offer.unit !== selectedUnit) {
                    continue;
                }
                const typeMeta = building.types.find(
                    (t) => t.type === offer.type,
                );
                list.push({
                    key: `${building.id}-${offer.category}-${offer.type}-${offer.unit}`,
                    buildingName: building.name,
                    gender: GENDER_LABELS[building.gender] ?? building.gender,
                    type: offer.type,
                    capacity: typeMeta?.capacity ?? null,
                    category: CATEGORY_LABELS[offer.category] ?? offer.category,
                    unit: UNIT_LABELS[offer.unit] ?? offer.unit,
                    amount: offer.amount,
                    places: offer.places,
                });
            }
        }

        return list;
    }, [buildingsWithRates, selectedBuildingId, selectedUnit]);

    return (
        <section
            id="tarif-resmi"
            className="bg-base-100 border-base-200 scroll-mt-24 border-t py-16 md:py-20"
        >
            <div className="mx-auto max-w-7xl px-4 md:px-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="max-w-2xl">
                        <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
                            {headings.tariffs_eyebrow || 'Transparansi Biaya'}
                        </p>
                        <h2 className="font-display mt-2 text-3xl leading-tight md:text-4xl">
                            {headings.tariffs || 'Tabel Ringkas Tarif Resmi'}
                        </h2>
                        <p className="text-muted mt-2 text-sm leading-6">
                            {headings.tariffs_intro ||
                                'Bandingkan tarif resmi asrama per gedung dan satuan masa tinggal sesuai kebijakan aktif dari pengelola.'}
                        </p>
                    </div>
                    {availableUnits.length > 0 && (
                        <div
                            className="flex flex-wrap gap-1.5"
                            role="group"
                            aria-label="Filter satuan tarif"
                        >
                            <button
                                type="button"
                                onClick={() => setSelectedUnit('all')}
                                aria-pressed={selectedUnit === 'all'}
                                className={`btn btn-xs sm:btn-sm rounded-full ${
                                    selectedUnit === 'all'
                                        ? 'btn-primary'
                                        : 'btn-outline'
                                }`}
                            >
                                Semua Satuan
                            </button>
                            {availableUnits.map((unit) => (
                                <button
                                    key={unit}
                                    type="button"
                                    onClick={() => setSelectedUnit(unit)}
                                    aria-pressed={selectedUnit === unit}
                                    className={`btn btn-xs sm:btn-sm rounded-full capitalize ${
                                        selectedUnit === unit
                                            ? 'btn-primary'
                                            : 'btn-outline'
                                    }`}
                                >
                                    Per {UNIT_LABELS[unit] ?? unit}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {buildingsWithRates.length > 0 ? (
                    <>
                        <div
                            className="mt-6 flex flex-wrap gap-2"
                            role="tablist"
                            aria-label="Filter gedung pada tabel tarif"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={selectedBuildingId === 'all'}
                                onClick={() => setSelectedBuildingId('all')}
                                className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                                    selectedBuildingId === 'all'
                                        ? 'border-primary bg-primary text-primary-content'
                                        : 'border-base-300 bg-base-100 hover:border-primary'
                                }`}
                            >
                                Semua Gedung ({buildingsWithRates.length})
                            </button>
                            {buildingsWithRates.map((building) => (
                                <button
                                    key={building.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={
                                        selectedBuildingId === building.id
                                    }
                                    onClick={() =>
                                        setSelectedBuildingId(building.id)
                                    }
                                    className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                                        selectedBuildingId === building.id
                                            ? 'border-primary bg-primary text-primary-content'
                                            : 'border-base-300 bg-base-100 hover:border-primary'
                                    }`}
                                >
                                    {building.name}
                                </button>
                            ))}
                        </div>

                        <div className="border-base-300 mt-5 overflow-x-auto rounded-2xl border">
                            <table className="table-sm sm:table-md table w-full">
                                <thead className="bg-base-200/70">
                                    <tr>
                                        <th>Gedung &amp; Gender</th>
                                        <th>Kategori</th>
                                        <th>Tipe Kamar</th>
                                        <th>Kapasitas</th>
                                        <th>Tarif / Orang</th>
                                        <th>Sisa Slot</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length > 0 ? (
                                        rows.map((row) => (
                                            <tr key={row.key}>
                                                <td className="font-semibold">
                                                    <span>
                                                        {row.buildingName}
                                                    </span>
                                                    <span className="text-muted ml-2 text-xs font-normal">
                                                        ({row.gender})
                                                    </span>
                                                </td>
                                                <td>{row.category}</td>
                                                <td className="capitalize">
                                                    {row.type}
                                                </td>
                                                <td>
                                                    {row.capacity
                                                        ? `${row.capacity} orang`
                                                        : '-'}
                                                </td>
                                                <td className="text-primary font-semibold whitespace-nowrap">
                                                    {formatRupiah(row.amount)}{' '}
                                                    <span className="text-muted text-xs font-normal">
                                                        / {row.unit}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`badge badge-sm ${
                                                            row.places > 0
                                                                ? 'badge-success badge-soft'
                                                                : 'badge-ghost'
                                                        }`}
                                                    >
                                                        {row.places > 0
                                                            ? `${row.places} tersedia`
                                                            : 'Penuh'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="text-muted py-6 text-center text-sm"
                                            >
                                                Belum ada tarif pada satuan yang
                                                dipilih untuk gedung ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-muted mt-3 text-xs">
                            {headings.tariffs_note ||
                                'Catatan: Tarif KIP-K mengikuti ketentuan beasiswa KIP-K Universitas Andalas; tarif booking penuh 1 kamar menyesuaikan jumlah kapasitas kamar pada saat pendaftaran.'}
                        </p>
                    </>
                ) : (
                    <div className="border-base-300 bg-base-200/40 mt-6 rounded-2xl border p-6 text-sm">
                        <p className="font-medium">
                            Tarif resmi per periode sedang disiapkan oleh
                            pengelola.
                        </p>
                        <p className="text-muted mt-1">
                            Anda tetap dapat melihat informasi gedung pada{' '}
                            <a
                                href="#katalog-hunian"
                                className="link link-primary font-medium"
                            >
                                katalog hunian di atas
                            </a>{' '}
                            atau masuk ke portal setelah periode dibuka.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}

export function FacilitiesAndRulesSection({
    regulationDocs = [],
    headings = {},
    facilities,
    coreRules,
}: {
    regulationDocs?: PublicRegulationDoc[];
    headings?: Record<string, string>;
    facilities?: Array<{ title: string; text: string }>;
    coreRules?: Array<{ title: string; text: string }>;
}) {
    const downloadableDocs = regulationDocs.filter((doc) => Boolean(doc.file));
    const facilityItems =
        facilities && facilities.length > 0
            ? facilities.map((item, idx) => ({
                  ...item,
                  icon: resolveFacilityIcon(item.title, idx),
              }))
            : FACILITIES;
    const ruleItems =
        coreRules && coreRules.length > 0 ? coreRules : CORE_RULES;

    return (
        <section
            id="fasilitas-aturan"
            className="bg-mist border-base-300 scroll-mt-24 border-y py-16 md:py-20"
        >
            <div className="mx-auto max-w-7xl space-y-12 px-4 md:px-6">
                <div>
                    <div className="max-w-2xl">
                        <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
                            {headings.facilities_eyebrow ||
                                'Fasilitas & Tata Tertib'}
                        </p>
                        <h2 className="font-display mt-2 text-3xl leading-tight md:text-4xl">
                            {headings.facilities ||
                                'Fasilitas Asrama & Aturan Penting'}
                        </h2>
                        <p className="text-muted mt-3 text-sm leading-6">
                            {headings.facilities_intro ||
                                'Dirancang untuk kenyamanan tinggal, pembinaan mahasiswa baru, dan keamanan bersama di seluruh unit Andalas Residence.'}
                        </p>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {facilityItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.title}
                                    className="border-base-300 bg-base-100 rounded-2xl border p-5"
                                >
                                    <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                                        <Icon
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <h3 className="mt-4 text-base font-semibold">
                                        {item.title}
                                    </h3>
                                    <p className="text-muted mt-1.5 text-sm leading-6">
                                        {item.text}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="border-base-300 bg-base-100 grid gap-8 rounded-2xl border p-6 md:p-8 lg:grid-cols-3">
                    <div>
                        <span className="bg-warning/15 text-warning-content inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
                            <AlertTriangle
                                className="text-warning size-3.5"
                                aria-hidden="true"
                            />
                            {headings.rules_badge || 'Aturan Penting Penghuni'}
                        </span>
                        <h3 className="font-display mt-3 text-2xl">
                            {headings.rules ||
                                'Komitmen tinggal aman & tertib di asrama.'}
                        </h3>
                        <p className="text-muted mt-2 text-sm leading-6">
                            {headings.rules_intro ||
                                'Calon penghuni wajib membaca regulasi dan tata tertib asrama sebelum melakukan serah kunci.'}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2.5">
                            <Link
                                href="/informasi/regulasi"
                                className="btn btn-primary btn-sm gap-1.5"
                            >
                                <FileText className="size-4" />
                                Regulasi &amp; Tata Tertib
                            </Link>
                            <Link
                                href="/informasi/sop"
                                className="btn btn-outline btn-sm"
                            >
                                Lihat SOP Layanan
                            </Link>
                        </div>
                        {downloadableDocs.length > 0 && (
                            <div className="mt-4 space-y-1.5">
                                {downloadableDocs.map((doc) => (
                                    <a
                                        key={doc.id}
                                        href={`/storage/${doc.file}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary flex items-center gap-1.5 text-xs font-semibold hover:underline"
                                    >
                                        <Download className="size-3.5 shrink-0" />
                                        <span>Unduh: {doc.judul}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
                        {ruleItems.map((rule, index) => (
                            <div
                                key={rule.title}
                                className="border-base-300 bg-base-200/40 rounded-xl border p-4"
                            >
                                <span className="text-primary text-xs font-bold">
                                    ATURAN {String(index + 1).padStart(2, '0')}
                                </span>
                                <h4 className="mt-1.5 text-sm font-bold">
                                    {rule.title}
                                </h4>
                                <p className="text-muted mt-2 text-xs leading-5">
                                    {rule.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export function PaymentProcedureSection({
    paymentAccounts = [],
    supportPhone,
    supportEmail,
    headings = {},
    paymentSteps,
}: {
    paymentAccounts?: PublicPaymentAccount[];
    supportPhone?: string;
    supportEmail?: string;
    headings?: Record<string, string>;
    paymentSteps?: Array<{ title: string; text: string }>;
}) {
    const cleanPhone = (supportPhone || '0811-6699634').trim();
    const waDigits = cleanPhone.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const stepItems =
        paymentSteps && paymentSteps.length > 0
            ? paymentSteps.map((item, idx) => ({
                  step: String(idx + 1).padStart(2, '0'),
                  title: item.title,
                  text: item.text,
              }))
            : PAYMENT_STEPS;

    return (
        <section
            id="prosedur-pembayaran"
            className="bg-base-100 scroll-mt-24 py-16 md:py-20"
        >
            <div className="mx-auto max-w-7xl px-4 md:px-6">
                <div className="grid gap-10 lg:grid-cols-3">
                    <div className="space-y-4">
                        <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
                            {headings.payment_eyebrow || 'Pembayaran Resmi'}
                        </p>
                        <h2 className="font-display text-3xl leading-tight">
                            {headings.payment || 'Prosedur Pembayaran Asrama'}
                        </h2>
                        <p className="text-muted text-sm leading-6">
                            {headings.payment_intro ||
                                'Seluruh pembayaran asrama tercatat melalui tagihan akun Anda. Pastikan hanya mentransfer ke Virtual Account atau rekening resmi Universitas Andalas.'}
                        </p>

                        <div className="border-base-300 bg-base-200/50 space-y-3 rounded-2xl border p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <Landmark className="text-primary size-4" />
                                <span>Kanal Pembayaran Resmi</span>
                            </div>
                            {paymentAccounts.length > 0 ? (
                                <ul className="space-y-2 text-xs">
                                    {paymentAccounts.map((acc) => (
                                        <li
                                            key={acc.id}
                                            className="border-base-300 bg-base-100 rounded-lg border p-2.5"
                                        >
                                            <p className="font-bold">
                                                {acc.bank_name} ·{' '}
                                                {acc.account_number}
                                            </p>
                                            <p className="text-muted mt-0.5">
                                                a.n. {acc.account_name}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted text-xs leading-5">
                                    Nomor Virtual Account dan rekening tujuan
                                    ditampilkan otomatis pada menu Tagihan
                                    setelah kamar dipilih.
                                </p>
                            )}
                            <p className="text-muted text-xs">
                                Butuh konfirmasi pembayaran? Hubungi pengelola
                                via{' '}
                                <a
                                    href={`https://wa.me/${waDigits}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="link link-primary font-medium"
                                >
                                    WhatsApp ({cleanPhone})
                                </a>
                                {supportEmail ? (
                                    <>
                                        {' '}
                                        atau{' '}
                                        <a
                                            href={`mailto:${supportEmail}`}
                                            className="link link-primary font-medium"
                                        >
                                            {supportEmail}
                                        </a>
                                    </>
                                ) : null}
                                .
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                        {stepItems.map((item) => (
                            <div
                                key={item.step}
                                className="border-base-300 bg-base-100 rounded-2xl border p-5"
                            >
                                <span className="font-display text-primary text-2xl font-semibold">
                                    {item.step}
                                </span>
                                <h3 className="mt-2 text-base font-bold">
                                    {item.title}
                                </h3>
                                <p className="text-muted mt-1.5 text-sm leading-6">
                                    {item.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
