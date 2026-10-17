import { useMemo, useState } from 'react';
import { BedDouble, Check, MapPin, Users } from 'lucide-react';
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
    const [building, setBuilding] = useState('');
    const [type, setType] = useState('');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('price');
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
                        `${room.nomor_kamar} ${room.lantai?.gedung?.nama_gedung}`
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
    return (
        <section className="space-y-4" aria-label="Katalog kamar">
            <div>
                <h2 className="text-xl font-semibold">
                    Temukan kamar yang cocok
                </h2>
                <p className="text-muted mt-1 text-sm">
                    Kamar yang tampil mengikuti kategori Anda dan prioritas
                    pengisian lantai. Pilih satu kamar untuk melanjutkan.
                </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input
                    aria-label="Cari kamar atau gedung"
                    className="input w-full"
                    placeholder="Cari kamar atau gedung"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
                <select
                    aria-label="Filter gedung"
                    className="select w-full"
                    value={building}
                    onChange={(event) => setBuilding(event.target.value)}
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
                    className="select w-full"
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                >
                    <option value="">Semua tipe</option>
                    {Array.from(
                        new Set(rooms.map((room) => room.tipe_kamar)),
                    ).map((value) => (
                        <option key={value} value={value}>
                            {value.replaceAll('_', ' ')}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Urutkan kamar"
                    className="select w-full"
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                >
                    <option value="price">Harga terendah</option>
                    <option value="number">Nomor kamar</option>
                </select>
            </div>
            <p className="text-muted text-sm" role="status">
                {filtered.length} kamar tersedia
            </p>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {filtered.map((room) => {
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
                    return (
                        <article
                            key={room.id}
                            className={`bg-base-100 overflow-hidden rounded-xl border ${selected === room.id ? 'border-primary ring-primary/20 ring-2' : 'border-base-300'}`}
                        >
                            {photo ? (
                                <img
                                    src={`/storage/${photo}`}
                                    alt={`Kamar ${room.nomor_kamar} di ${room.lantai?.gedung?.nama_gedung}`}
                                    className="h-44 w-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="bg-base-200 text-base-content/30 flex h-44 items-center justify-center">
                                    <BedDouble className="size-12" />
                                    <span className="sr-only">
                                        Foto belum tersedia
                                    </span>
                                </div>
                            )}
                            <div className="space-y-3 p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="badge badge-ghost capitalize">
                                        {room.tipe_kamar.replaceAll('_', ' ')}
                                    </span>
                                    {selected === room.id && (
                                        <span className="text-primary flex items-center gap-1 text-sm">
                                            <Check className="size-4" />
                                            Terpilih
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-lg font-semibold">
                                    Kamar {room.nomor_kamar}
                                </h3>
                                <p className="text-muted flex items-center gap-1 text-sm">
                                    <MapPin className="size-4 shrink-0" />
                                    {room.lantai?.gedung?.nama_gedung} /{' '}
                                    {room.lantai?.nama_lantai ??
                                        `Lantai ${room.lantai?.nomor_lantai ?? ''}`}
                                </p>
                                <p className="flex items-center gap-1 text-sm">
                                    <Users className="size-4" />
                                    {room.kapasitas ?? '—'} orang ·{' '}
                                    {room.available_places ?? '—'} tempat
                                    tersedia
                                </p>
                                <p className="text-muted min-h-10 text-sm">
                                    {room.facilities ||
                                        'Informasi fasilitas belum diisi.'}
                                </p>
                                <div className="border-base-200 space-y-3 border-t pt-3">
                                    <p className="text-primary text-xl font-semibold">
                                        {price > 0
                                            ? formatRupiah(price)
                                            : 'Tarif belum tersedia'}
                                        <span className="text-muted block text-xs font-normal">
                                            per{' '}
                                            {basis === 'room'
                                                ? 'kamar'
                                                : 'orang'}{' '}
                                            /{' '}
                                            {
                                                {
                                                    year: 'tahun',
                                                    month: 'bulan',
                                                    day: 'hari',
                                                }[unit]
                                            }
                                        </span>
                                    </p>
                                    <button
                                        type="button"
                                        aria-pressed={selected === room.id}
                                        disabled={disabled}
                                        className={`btn w-full ${selected === room.id ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => onSelect(room.id)}
                                    >
                                        {selected === room.id
                                            ? 'Kamar dipilih'
                                            : 'Pilih kamar'}
                                    </button>
                                    {disabled && (
                                        <p className="text-muted text-xs">
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
            {filtered.length === 0 && (
                <div className="bg-base-200 rounded-xl p-8 text-center">
                    <BedDouble className="text-muted mx-auto mb-3 size-10" />
                    <h3 className="font-semibold">
                        Belum ada kamar yang sesuai
                    </h3>
                    <p className="text-muted mt-1 text-sm">
                        Ubah filter, atau hubungi pengelola untuk pembukaan
                        lantai berikutnya.
                    </p>
                </div>
            )}
        </section>
    );
}
