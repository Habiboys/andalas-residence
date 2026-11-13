import { useRoomTypeCatalog, roomTypeName } from '@/andalas/lib/room-types';
import { useMemo, useState } from 'react';
import {
    BedDouble,
    Building2,
    Check,
    Eye,
    MapPin,
    Search,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import { formatRupiah } from '../lib/format';

export type CatalogRoom = {
    id: string;
    nomor_kamar: string;
    tipe_kamar: string;
    tarif_per_periode: string;
    foto?: string | null;
    kapasitas?: number;
    available_places?: number;
    facilities?: string;
    lantai?: {
        id?: string;
        nama_lantai?: string;
        nomor_lantai?: number;
        gedung_id: string;
        gedung?: { nama_gedung: string; foto?: string; alamat?: string };
    };
};
export type CatalogRate = {
    gedung_id: string;
    tipe_kamar: string;
    unit: string;
    amount: string;
    student_amount?: string | null;
    room_amount?: string | null;
};

export function roomPrice(
    room: CatalogRoom,
    rates: CatalogRate[],
    unit: string,
    basis: string,
    isStudent = true,
): number {
    const rate =
        rates.find(
            (item) =>
                item.gedung_id === room.lantai?.gedung_id &&
                item.tipe_kamar === room.tipe_kamar &&
                item.unit === unit,
        ) ??
        (unit === 'day'
            ? rates.find(
                  (item) =>
                      item.gedung_id === room.lantai?.gedung_id &&
                      item.tipe_kamar === 'umum' &&
                      item.unit === 'day',
              )
            : undefined);
    if (basis === 'room') return Number(rate?.room_amount ?? 0);
    return Number(
        (unit === 'day' && isStudent
            ? (rate?.student_amount ?? rate?.amount)
            : rate?.amount) ??
            (unit === 'year' ? room.tarif_per_periode : 0) ??
            0,
    );
}

function parseFacilities(raw?: string): string[] {
    if (!raw) return [];
    return raw
        .split(/[,;\n]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

const unitLabelMap: Record<string, string> = {
    year: 'tahun',
    month: 'bulan',
    day: 'hari',
};

export default function RoomCatalog({
    rooms,
    rates,
    selected,
    onSelect,
    unit,
    basis,
    isStudent = true,
}: {
    rooms: CatalogRoom[];
    rates: CatalogRate[];
    selected: string;
    onSelect: (id: string) => void;
    unit: string;
    basis: string;
    isStudent?: boolean;
}) {
    const catalog = useRoomTypeCatalog();
    const [building, setBuilding] = useState('');
    const [type, setType] = useState('');
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('price');
    const [detailRoom, setDetailRoom] = useState<CatalogRoom | null>(null);

    const buildings = Array.from(
        new Map(
            rooms.map((room) => [
                room.lantai?.gedung_id,
                room.lantai?.gedung?.nama_gedung,
            ]),
        ).entries(),
    );

    const filtered = useMemo(
        () =>
            rooms
                .filter(
                    (room) =>
                        (!building || room.lantai?.gedung_id === building) &&
                        (!type || room.tipe_kamar === type) &&
                        `${room.nomor_kamar} ${room.lantai?.gedung?.nama_gedung ?? ''} ${room.facilities ?? ''}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                )
                .sort((a, b) =>
                    sort === 'price'
                        ? roomPrice(a, rates, unit, basis, isStudent) -
                          roomPrice(b, rates, unit, basis, isStudent)
                        : a.nomor_kamar.localeCompare(b.nomor_kamar),
                ),
        [rooms, building, type, search, sort, rates, unit, basis, isStudent],
    );

    const pageSize = 9;
    const totalPages = Math.ceil(filtered.length / pageSize);
    const currentPage = Math.min(page, Math.max(1, totalPages));
    const hasFilter = Boolean(search || building || type);

    const selectedRoom = rooms.find((r) => r.id === selected);
    const unitLabel = unitLabelMap[unit] ?? unit;
    const basisLabel = basis === 'room' ? 'kamar' : 'orang';

    return (
        <section className="space-y-4" aria-label="Katalog kamar">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">
                        Temukan kamar yang cocok
                    </h2>
                    <p className="text-base-content/70 mt-1 text-sm">
                        Lihat detail fasilitas, kapasitas, dan tarif tiap kamar
                        sebelum memilih.
                    </p>
                </div>
                {selectedRoom && (
                    <div className="bg-primary/10 border-primary/30 text-primary flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold">
                        <Check className="size-3.5" />
                        <span>
                            Terpilih: {selectedRoom.lantai?.gedung?.nama_gedung}{' '}
                            · Kamar {selectedRoom.nomor_kamar}
                        </span>
                    </div>
                )}
            </div>

            <div className="border-base-300 bg-base-100 grid gap-3 rounded-2xl border p-3.5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                <label className="relative block">
                    <span className="sr-only">Cari kamar atau gedung</span>
                    <Search className="text-base-content/40 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <input
                        aria-label="Cari kamar atau gedung"
                        className="input input-bordered w-full pl-9"
                        placeholder="Cari kamar, gedung, fasilitas..."
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                    />
                </label>
                <select
                    aria-label="Filter gedung"
                    className="select select-bordered w-full"
                    value={building}
                    onChange={(event) => {
                        setBuilding(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">Semua gedung</option>
                    {buildings.map(([id, name]) => (
                        <option key={id} value={id}>
                            {name}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Filter tipe kamar"
                    className="select select-bordered w-full"
                    value={type}
                    onChange={(event) => {
                        setType(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">Semua tipe</option>
                    {Array.from(
                        new Set(rooms.map((room) => room.tipe_kamar)),
                    ).map((value) => (
                        <option key={value} value={value}>
                            {roomTypeName(catalog, value)}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Urutkan kamar"
                    className="select select-bordered w-full"
                    value={sort}
                    onChange={(event) => {
                        setSort(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="price">Harga terendah</option>
                    <option value="number">Nomor kamar</option>
                </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-base-content/70 font-medium" role="status">
                    {filtered.length} kamar tersedia
                </p>
                {hasFilter && (
                    <button
                        type="button"
                        className="btn btn-ghost btn-xs text-primary"
                        onClick={() => {
                            setSearch('');
                            setBuilding('');
                            setType('');
                            setPage(1);
                        }}
                    >
                        Reset filter
                    </button>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((room) => {
                        const price = roomPrice(
                            room,
                            rates,
                            unit,
                            basis,
                            isStudent,
                        );
                        const disabled =
                            price <= 0 ||
                            (basis === 'room' &&
                                room.available_places != null &&
                                room.available_places < (room.kapasitas ?? 0));
                        const photo = room.foto ?? room.lantai?.gedung?.foto;
                        const facilityList = parseFacilities(room.facilities);
                        const isSelected = selected === room.id;

                        return (
                            <article
                                key={room.id}
                                className={`bg-base-100 flex flex-col overflow-hidden rounded-2xl border transition-all duration-150 ${
                                    isSelected
                                        ? 'border-primary ring-primary/20 shadow-md ring-2'
                                        : 'border-base-300 shadow-sm hover:shadow-md'
                                }`}
                            >
                                <div className="relative h-44 w-full overflow-hidden">
                                    {photo ? (
                                        <img
                                            src={`/storage/${photo}`}
                                            alt={`Kamar ${room.nomor_kamar} di ${room.lantai?.gedung?.nama_gedung}`}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="bg-base-200 text-base-content/30 flex h-full items-center justify-center">
                                            <BedDouble className="size-12" />
                                            <span className="sr-only">
                                                Foto belum tersedia
                                            </span>
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                        <span className="badge bg-base-100/90 text-base-content border-0 text-xs font-semibold shadow-sm backdrop-blur-xs capitalize">
                                            {roomTypeName(
                                                catalog,
                                                room.tipe_kamar,
                                            )}
                                        </span>
                                    </div>
                                    {isSelected && (
                                        <span className="badge badge-primary absolute top-3 right-3 gap-1 shadow-sm">
                                            <Check className="size-3.5" />
                                            Terpilih
                                        </span>
                                    )}
                                    {room.available_places != null && (
                                        <span
                                            className={`badge absolute bottom-3 left-3 border-0 text-xs font-medium shadow-sm ${
                                                room.available_places > 0
                                                    ? 'bg-emerald-600/90 text-white'
                                                    : 'bg-rose-600/90 text-white'
                                            }`}
                                        >
                                            {room.available_places > 0
                                                ? `Sisa ${room.available_places} tempat`
                                                : 'Penuh'}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-1 flex-col justify-between space-y-3 p-4">
                                    <div className="space-y-2.5">
                                        <div>
                                            <p className="text-base-content/65 flex items-center gap-1 text-xs font-medium">
                                                <MapPin className="size-3.5 shrink-0" />
                                                <span className="truncate">
                                                    {
                                                        room.lantai?.gedung
                                                            ?.nama_gedung
                                                    }{' '}
                                                    ·{' '}
                                                    {room.lantai?.nama_lantai ??
                                                        `Lantai ${room.lantai?.nomor_lantai ?? ''}`}
                                                </span>
                                            </p>
                                            <h3 className="mt-0.5 text-lg font-bold">
                                                Kamar {room.nomor_kamar}
                                            </h3>
                                        </div>

                                        <p className="text-base-content/80 flex items-center gap-1.5 text-xs">
                                            <Users className="size-3.5 shrink-0" />
                                            <span>
                                                Kapasitas {room.kapasitas ?? '—'}{' '}
                                                orang ·{' '}
                                                {room.available_places ?? '—'}{' '}
                                                tersedia
                                            </span>
                                        </p>

                                        {facilityList.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {facilityList
                                                    .slice(0, 3)
                                                    .map((item) => (
                                                        <span
                                                            key={item}
                                                            className="bg-base-200 text-base-content/80 rounded-md px-2 py-0.5 text-xs"
                                                        >
                                                            {item}
                                                        </span>
                                                    ))}
                                                {facilityList.length > 3 && (
                                                    <span className="text-base-content/60 px-1 py-0.5 text-xs">
                                                        +
                                                        {facilityList.length -
                                                            3}{' '}
                                                        lainnya
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-base-content/60 text-xs">
                                                Informasi fasilitas belum diisi.
                                            </p>
                                        )}
                                    </div>

                                    <div className="border-base-200 space-y-3 border-t pt-3">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <div>
                                                <p className="text-primary text-xl font-bold">
                                                    {price > 0
                                                        ? formatRupiah(price)
                                                        : 'Tarif belum tersedia'}
                                                </p>
                                                <span className="text-base-content/60 block text-xs">
                                                    per {basisLabel} /{' '}
                                                    {unitLabel}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-sm gap-1.5"
                                                onClick={() =>
                                                    setDetailRoom(room)
                                                }
                                            >
                                                <Eye className="size-3.5" />
                                                Detail
                                            </button>
                                            <button
                                                type="button"
                                                aria-pressed={isSelected}
                                                disabled={disabled}
                                                className={`btn btn-sm ${
                                                    isSelected
                                                        ? 'btn-primary'
                                                        : 'btn-primary btn-outline'
                                                }`}
                                                onClick={() =>
                                                    onSelect(room.id)
                                                }
                                            >
                                                {isSelected
                                                    ? 'Terpilih'
                                                    : 'Pilih kamar'}
                                            </button>
                                        </div>

                                        {disabled && (
                                            <p className="text-warning text-xs">
                                                {price <= 0
                                                    ? 'Tarif untuk pilihan ini belum ditetapkan.'
                                                    : 'Sewa seluruh kamar memerlukan kamar kosong.'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
            </div>

            {totalPages > 1 && (
                <nav
                    className="flex flex-wrap items-center justify-center gap-3 pt-2"
                    aria-label="Halaman katalog kamar"
                >
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                    >
                        Sebelumnya
                    </button>
                    <span className="text-sm font-medium">
                        {currentPage} dari {totalPages}
                    </span>
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setPage(currentPage + 1)}
                    >
                        Berikutnya
                    </button>
                </nav>
            )}

            {filtered.length === 0 && (
                <div className="bg-base-100 border-base-300 rounded-2xl border p-8 text-center shadow-sm">
                    <BedDouble className="text-base-content/40 mx-auto mb-3 size-10" />
                    <h3 className="font-semibold">
                        Belum ada kamar yang sesuai
                    </h3>
                    <p className="text-base-content/70 mt-1 text-sm">
                        {rooms.length === 0
                            ? 'Belum ada kamar yang dibuka untuk kategori Anda.'
                            : 'Coba ubah filter pencarian.'}
                    </p>
                </div>
            )}

            {detailRoom && (
                <RoomDetailModal
                    room={detailRoom}
                    rates={rates}
                    unit={unit}
                    basis={basis}
                    isStudent={isStudent}
                    isSelected={selected === detailRoom.id}
                    typeName={roomTypeName(catalog, detailRoom.tipe_kamar)}
                    onClose={() => setDetailRoom(null)}
                    onSelect={() => {
                        onSelect(detailRoom.id);
                        setDetailRoom(null);
                    }}
                />
            )}
        </section>
    );
}

function RoomDetailModal({
    room,
    rates,
    unit,
    basis,
    isStudent,
    isSelected,
    typeName,
    onClose,
    onSelect,
}: {
    room: CatalogRoom;
    rates: CatalogRate[];
    unit: string;
    basis: string;
    isStudent: boolean;
    isSelected: boolean;
    typeName: string;
    onClose: () => void;
    onSelect: () => void;
}) {
    const photo = room.foto ?? room.lantai?.gedung?.foto;
    const facilities = parseFacilities(room.facilities);
    const activePrice = roomPrice(room, rates, unit, basis, isStudent);
    const disabled =
        activePrice <= 0 ||
        (basis === 'room' &&
            room.available_places != null &&
            room.available_places < (room.kapasitas ?? 0));

    const matchingRates = rates.filter(
        (r) =>
            r.gedung_id === room.lantai?.gedung_id &&
            (r.tipe_kamar === room.tipe_kamar ||
                (r.unit === 'day' && r.tipe_kamar === 'umum')),
    );

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-detail-modal-title"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
        >
            <div className="bg-base-100 border-base-300 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:rounded-2xl">
                <div className="relative h-52 w-full shrink-0 sm:h-64">
                    {photo ? (
                        <img
                            src={`/storage/${photo}`}
                            alt={`Foto Kamar ${room.nomor_kamar}`}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="bg-base-200 text-base-content/30 flex h-full items-center justify-center">
                            <BedDouble className="size-16" />
                        </div>
                    )}
                    <button
                        type="button"
                        aria-label="Tutup detail kamar"
                        onClick={onClose}
                        className="btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 absolute top-3 right-3 border-0 shadow"
                    >
                        <X className="size-4" />
                    </button>
                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                        <span className="badge bg-base-100/90 text-base-content border-0 font-semibold capitalize shadow">
                            {typeName}
                        </span>
                        {room.available_places != null && (
                            <span
                                className={`badge border-0 font-medium shadow ${
                                    room.available_places > 0
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-rose-600 text-white'
                                }`}
                            >
                                {room.available_places > 0
                                    ? `${room.available_places} dari ${room.kapasitas ?? room.available_places} tempat tersedia`
                                    : 'Kamar penuh'}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                    <div>
                        <p className="text-base-content/70 flex items-center gap-1.5 text-sm">
                            <Building2 className="size-4 shrink-0" />
                            <span>
                                {room.lantai?.gedung?.nama_gedung} ·{' '}
                                {room.lantai?.nama_lantai ??
                                    `Lantai ${room.lantai?.nomor_lantai ?? ''}`}
                            </span>
                        </p>
                        <h2
                            id="room-detail-modal-title"
                            className="mt-1 text-2xl font-bold"
                        >
                            Kamar {room.nomor_kamar}
                        </h2>
                        {room.lantai?.gedung?.alamat && (
                            <p className="text-base-content/60 mt-1 flex items-center gap-1.5 text-xs">
                                <MapPin className="size-3.5 shrink-0" />
                                {room.lantai.gedung.alamat}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="bg-base-200/60 rounded-xl p-3">
                            <span className="text-base-content/60 block text-xs">
                                Tipe Kamar
                            </span>
                            <strong className="text-sm capitalize">
                                {typeName}
                            </strong>
                        </div>
                        <div className="bg-base-200/60 rounded-xl p-3">
                            <span className="text-base-content/60 block text-xs">
                                Kapasitas
                            </span>
                            <strong className="text-sm">
                                {room.kapasitas ?? '—'} orang
                            </strong>
                        </div>
                        <div className="bg-base-200/60 rounded-xl p-3">
                            <span className="text-base-content/60 block text-xs">
                                Tersedia
                            </span>
                            <strong className="text-sm">
                                {room.available_places ?? '—'} tempat
                            </strong>
                        </div>
                        <div className="bg-base-200/60 rounded-xl p-3">
                            <span className="text-base-content/60 block text-xs">
                                Lokasi
                            </span>
                            <strong className="text-sm">
                                {room.lantai?.nama_lantai ??
                                    `Lt. ${room.lantai?.nomor_lantai ?? '—'}`}
                            </strong>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                            <Sparkles className="text-primary size-4" />
                            Fasilitas Kamar
                        </h3>
                        {facilities.length > 0 ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {facilities.map((item) => (
                                    <div
                                        key={item}
                                        className="border-base-200 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                                    >
                                        <Check className="text-success size-4 shrink-0" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-base-content/60 text-sm">
                                Informasi fasilitas belum diisi oleh pengelola.
                            </p>
                        )}
                    </div>

                    {matchingRates.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold">
                                Pilihan Tarif Gedung &amp; Tipe Ini
                            </h3>
                            <div className="border-base-200 divide-base-200 divide-y rounded-xl border text-sm">
                                {matchingRates.map((rate, idx) => (
                                    <div
                                        key={`${rate.unit}-${rate.tipe_kamar}-${idx}`}
                                        className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5"
                                    >
                                        <span className="font-medium capitalize">
                                            Tarif per{' '}
                                            {unitLabelMap[rate.unit] ??
                                                rate.unit}
                                        </span>
                                        <span className="text-right font-semibold">
                                            {formatRupiah(
                                                Number(
                                                    rate.unit === 'day' &&
                                                        isStudent
                                                        ? (rate.student_amount ??
                                                              rate.amount)
                                                        : rate.amount,
                                                ),
                                            )}
                                            <span className="text-base-content/60 text-xs font-normal">
                                                {' '}
                                                / orang
                                            </span>
                                            {rate.room_amount &&
                                                Number(rate.room_amount) > 0 && (
                                                    <span className="text-base-content/70 block text-xs font-normal">
                                                        {formatRupiah(
                                                            Number(
                                                                rate.room_amount,
                                                            ),
                                                        )}{' '}
                                                        / kamar
                                                    </span>
                                                )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-base-300 bg-base-100 flex flex-wrap items-center justify-between gap-3 border-t p-4">
                    <div>
                        <span className="text-base-content/60 block text-xs">
                            Tarif pilihan Anda ({basis === 'room' ? 'per kamar' : 'per orang'} / {unitLabelMap[unit] ?? unit})
                        </span>
                        <strong className="text-primary text-xl font-bold">
                            {activePrice > 0
                                ? formatRupiah(activePrice)
                                : 'Tarif belum tersedia'}
                        </strong>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={onClose}
                        >
                            Tutup
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={disabled}
                            onClick={onSelect}
                        >
                            {isSelected ? 'Kamar sudah dipilih' : 'Pilih kamar ini'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
