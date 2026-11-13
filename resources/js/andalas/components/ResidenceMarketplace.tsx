import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    Building2,
    MapPin,
    Search,
    SlidersHorizontal,
    BedDouble,
    Check,
    ArrowRight,
} from 'lucide-react';
import { login } from '@/routes';

export type ResidenceListing = {
    id: string;
    name: string;
    code: string;
    gender: string;
    address: string | null;
    description: string;
    image: string | null;
    floors: number;
    rooms: number;
    types: {
        type: string;
        rooms: number;
        capacity: number;
        facilities: string;
    }[];
    offers: {
        category: string;
        type: string;
        unit: string;
        amount: number;
        places: number;
    }[];
};
const categories: Record<string, string> = {
    local_non_kipk: 'Mahasiswa lokal',
    local_kipk: 'KIP-K',
    international: 'Internasional / S2 / S3',
    summer_course: 'Summer Course',
    non_student: 'Umum',
};
const units: Record<string, string> = {
    year: 'tahun',
    semester: 'semester',
    month: 'bulan',
    day: 'hari',
};
const currency = (value: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);

export default function ResidenceMarketplace({
    listings = [],
}: {
    listings?: ResidenceListing[];
}) {
    const [query, setQuery] = useState('');
    const [gender, setGender] = useState('');
    const [category, setCategory] = useState('local_non_kipk');
    const [unit, setUnit] = useState('year');
    const [onlyAvailable, setOnlyAvailable] = useState(false);
    const [sort, setSort] = useState('name');
    const results = useMemo(
        () =>
            listings
                .map((item) => {
                    const offers = item.offers.filter(
                        (offer) =>
                            offer.category === category && offer.unit === unit,
                    );
                    const lowest = offers.length
                        ? Math.min(...offers.map((offer) => offer.amount))
                        : null;
                    return {
                        ...item,
                        filteredOffers: offers,
                        lowest,
                        places: offers.reduce(
                            (sum, offer) => sum + offer.places,
                            0,
                        ),
                    };
                })
                .filter(
                    (item) =>
                        (!gender ||
                            item.gender === gender ||
                            item.gender === 'campur') &&
                        `${item.name} ${item.code} ${item.address ?? ''} ${item.description} ${item.types.map((type) => type.type).join(' ')}`
                            .toLowerCase()
                            .includes(query.toLowerCase()) &&
                        (!onlyAvailable || item.places > 0),
                )
                .sort((a, b) =>
                    sort === 'price'
                        ? (a.lowest ?? Infinity) - (b.lowest ?? Infinity)
                        : a.name.localeCompare(b.name),
                ),
        [listings, query, gender, category, unit, onlyAvailable, sort],
    );
    return (
        <section
            id="katalog-hunian"
            className="bg-base-200/50 scroll-mt-24 py-16 md:py-24"
        >
            <div className="mx-auto max-w-7xl px-4 md:px-6">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <p className="text-primary mb-3 text-xs font-bold tracking-[0.2em] uppercase">
                            Temukan tempatmu
                        </p>
                        <h2 className="font-display text-3xl leading-tight md:text-5xl">
                            Hunian yang pas untuk
                            <br className="hidden sm:block" /> perjalanan
                            barumu.
                        </h2>
                        <p className="text-base-content/65 mt-4 max-w-xl">
                            Jelajahi gedung, bandingkan tipe kamar, dan temukan
                            pilihan sesuai kebutuhanmu di Andalas Residence.
                        </p>
                    </div>
                    <span className="border-base-300 bg-base-100 rounded-full border px-4 py-2 text-sm">
                        <Building2 className="text-primary mr-2 inline size-4" />
                        {listings.length} gedung untuk dijelajahi
                    </span>
                </div>
                <div className="border-base-300 bg-base-100 mb-7 grid gap-3 rounded-2xl border p-4 shadow-sm md:grid-cols-4">
                    <label className="md:col-span-2">
                        <span className="mb-1 block text-xs font-semibold">
                            Cari hunian
                        </span>
                        <div className="bg-base-200 flex items-center gap-2 rounded-xl px-3">
                            <Search className="text-base-content/50 size-4 shrink-0" />
                            <input
                                className="w-full min-w-0 bg-transparent py-3 text-sm outline-none"
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                placeholder="Nama gedung, lokasi, atau tipe kamar"
                            />
                        </div>
                    </label>
                    <label>
                        <span className="mb-1 block text-xs font-semibold">
                            Kategori penghuni
                        </span>
                        <select
                            className="bg-base-200 w-full rounded-xl p-3 text-sm"
                            value={category}
                            onChange={(event) =>
                                setCategory(event.target.value)
                            }
                        >
                            {Object.entries(categories).map(
                                ([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ),
                            )}
                        </select>
                    </label>
                    <label>
                        <span className="mb-1 block text-xs font-semibold">
                            Bandingkan tarif per
                        </span>
                        <select
                            className="bg-base-200 w-full rounded-xl p-3 text-sm"
                            value={unit}
                            onChange={(event) => setUnit(event.target.value)}
                        >
                            {Object.entries(units).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                        {[
                            ['', 'Semua hunian'],
                            ['laki_laki', 'Putra'],
                            ['perempuan', 'Putri'],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={gender === value}
                                onClick={() => setGender(value)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${gender === value ? 'bg-primary text-primary-content' : 'border-base-300 bg-base-100 hover:border-primary border'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={onlyAvailable}
                                onChange={(event) =>
                                    setOnlyAvailable(event.target.checked)
                                }
                            />
                            Tersedia untuk diajukan
                        </label>
                        <label className="flex items-center gap-2">
                            <SlidersHorizontal className="size-4" />
                            <span className="sr-only">Urutkan hunian</span>
                            <select
                                className="bg-base-100 rounded-lg p-2"
                                value={sort}
                                onChange={(event) =>
                                    setSort(event.target.value)
                                }
                            >
                                <option value="name">Nama gedung</option>
                                <option value="price">Harga terendah</option>
                            </select>
                        </label>
                    </div>
                </div>
                <p className="text-base-content/60 mb-4 text-sm">
                    {results.length} pilihan gedung · Harga per orang, sesuai
                    kategori dan satuan yang dipilih.
                </p>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {results.map((item) => (
                        <article
                            key={item.id}
                            className="group border-base-300 bg-base-100 flex flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-xl"
                        >
                            <div className="bg-primary/10 relative aspect-[16/10] overflow-hidden">
                                {item.image ? (
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        loading="lazy"
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="from-primary/15 to-base-200 flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br">
                                        <Building2 className="text-primary/40 size-12" />
                                        <span className="text-primary/65 text-sm font-semibold">
                                            {item.code}
                                        </span>
                                        <span className="text-base-content/50 text-xs">
                                            Foto segera tersedia
                                        </span>
                                    </div>
                                )}
                                <span className="bg-base-100/95 absolute top-4 left-4 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm">
                                    {item.gender === 'laki_laki'
                                        ? 'Hunian putra'
                                        : item.gender === 'perempuan'
                                          ? 'Hunian putri'
                                          : 'Hunian campuran'}
                                </span>
                            </div>
                            <div className="flex flex-1 flex-col p-5">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="text-primary text-xs font-semibold tracking-wider uppercase">
                                        Andalas Residence
                                    </span>
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs ${item.places ? 'bg-emerald-100 text-emerald-800' : 'bg-base-200 text-base-content/60'}`}
                                    >
                                        {item.places
                                            ? `${item.places} tempat tersedia`
                                            : item.lowest !== null
                                              ? 'Belum ada tempat tersedia'
                                              : 'Pendaftaran belum dibuka'}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold">
                                    {item.name}
                                </h3>
                                <p className="text-base-content/60 mt-2 flex items-start gap-1.5 text-xs">
                                    <MapPin className="size-3.5 shrink-0" />
                                    {item.address ||
                                        'Kampus Universitas Andalas'}
                                </p>
                                <div className="text-base-content/70 my-4 flex gap-4 text-sm">
                                    <span>
                                        <Building2 className="mr-1 inline size-4" />
                                        {item.floors} lantai
                                    </span>
                                    <span>
                                        <BedDouble className="mr-1 inline size-4" />
                                        {item.rooms} kamar
                                    </span>
                                </div>
                                <details className="bg-base-200/50 mb-5 rounded-xl p-3">
                                    <summary className="cursor-pointer text-sm font-semibold">
                                        Lihat tipe kamar & fasilitas
                                    </summary>
                                    <div className="mt-3 space-y-3">
                                        {item.description && (
                                            <p className="text-base-content/65 text-sm">
                                                {item.description}
                                            </p>
                                        )}
                                        {item.types.map((type) => (
                                            <div
                                                key={type.type}
                                                className="border-base-300 border-t pt-3"
                                            >
                                                <p className="text-sm font-semibold capitalize">
                                                    {type.type} · hingga{' '}
                                                    {type.capacity} orang/kamar
                                                </p>
                                                <p className="text-base-content/65 mt-1 text-xs leading-relaxed">
                                                    {type.facilities ||
                                                        'Detail fasilitas dapat dikonfirmasi kepada pengelola.'}
                                                </p>
                                                {item.filteredOffers
                                                    .filter(
                                                        (offer) =>
                                                            offer.type ===
                                                            type.type,
                                                    )
                                                    .map((offer) => (
                                                        <p
                                                            key={offer.unit}
                                                            className="text-primary mt-2 text-sm font-semibold"
                                                        >
                                                            {currency(
                                                                offer.amount,
                                                            )}{' '}
                                                            /{' '}
                                                            {units[offer.unit]}{' '}
                                                            / orang
                                                        </p>
                                                    ))}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                                <div className="border-base-300 mt-auto border-t pt-4">
                                    <p className="text-base-content/60 text-xs">
                                        {item.lowest !== null
                                            ? 'Mulai dari'
                                            : 'Tarif kategori ini'}
                                    </p>
                                    <p className="text-primary mt-1 text-2xl font-bold">
                                        {item.lowest !== null ? (
                                            currency(item.lowest)
                                        ) : (
                                            <span className="text-base">
                                                Menunggu publikasi pengelola
                                            </span>
                                        )}
                                        {item.lowest !== null && (
                                            <span className="text-base-content/60 text-xs font-normal">
                                                {' '}
                                                / {units[unit]} / orang
                                            </span>
                                        )}
                                    </p>
                                    <Link
                                        href={login.url()}
                                        className="bg-primary text-primary-content mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                                    >
                                        {item.places
                                            ? 'Masuk & lanjutkan pendaftaran'
                                            : 'Masuk ke layanan hunian'}
                                        <ArrowUpRight className="size-4" />
                                    </Link>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
                {!results.length && (
                    <div className="border-base-300 bg-base-100 rounded-2xl border border-dashed p-12 text-center">
                        <Search className="text-primary/50 mx-auto mb-4 size-8" />
                        <h3 className="text-lg font-bold">
                            Belum ada hunian yang cocok
                        </h3>
                        <p className="text-base-content/60 mt-2 text-sm">
                            Coba nama gedung lain atau ubah filter ketersediaan.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                setGender('');
                                setOnlyAvailable(false);
                            }}
                            className="text-primary mt-4 text-sm font-semibold"
                        >
                            Reset pencarian{' '}
                            <ArrowRight className="inline size-4" />
                        </button>
                    </div>
                )}
                <div className="border-primary/15 bg-primary/5 text-base-content/70 mt-8 flex items-start gap-3 rounded-xl border p-4 text-sm">
                    <Check className="text-primary mt-0.5 size-5 shrink-0" />
                    <p>
                        Ketersediaan memperhitungkan penghuni dan alokasi yang
                        sedang berjalan. Penetapan kamar diperiksa kembali saat
                        pendaftaran. KIP-K dialokasikan otomatis; internasional,
                        kegiatan dan umum melalui pengelola. Check-in dilakukan
                        setelah administrasi dan serah kunci.
                    </p>
                </div>
            </div>
        </section>
    );
}
