import { useRoomTypeCatalog } from '@/andalas/lib/room-types';
import { PhotoCarousel, photoPaths } from '@/andalas/components/PhotoGallery';
import { Head, Link } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { show as buildingShow } from '@/routes/andalas/gedung';
import { show as floorShow } from '@/routes/andalas/lantai';
import { show as roomShow } from '@/routes/andalas/kamar';
import { show as assetShow } from '@/routes/andalas/aset';
import { show as residentShow } from '@/routes/andalas/mahasiswa';
import { kelolaBangunan } from '@/routes/admin';
import { kelolaBangunan as assetBuildings } from '@/routes/admin_aset';
import BuildingWorkspace from '@/andalas/pages/admin/BuildingWorkspace';
import RoomPhotoEditor from '@/andalas/components/RoomPhotoEditor';
import FloorAvailability from '@/andalas/components/FloorAvailability';
import KelolaBangunan from '@/andalas/pages/admin/KelolaBangunan';
import UserProfileDetails, {
    type ProfileSummary,
} from '@/andalas/components/UserProfileDetails';
import {
    PageHeader,
    Card,
    DataTable,
    StatusBadge,
    type DataColumn,
} from '@/andalas/components/ui';
import { formatRupiah } from '@/andalas/lib/format';

type RoomType = {
    type: string;
    enabled: boolean;
    max_capacity: number | null;
    facilities: string;
};
type Building = {
    id: string;
    kode_gedung: string;
    nama_gedung: string;
    alamat?: string;
    deskripsi?: string;
    foto?: string;
    photos?: string[] | null;
    gender_peruntukan?: string;
    allowed_categories?: string[] | null;
    room_types?: RoomType[] | null;
    lantai?: Floor[];
    fasilitas_umum?: Facility[];
};
type Floor = {
    id: string;
    nomor_lantai: number;
    nama_lantai: string;
    booking_open?: boolean;
    booking_priority?: number;
    kamar?: Room[];
    gedung?: Building;
};
type Room = {
    id: string;
    nomor_kamar: string;
    kapasitas: number;
    tipe_kamar: string;
    status: string;
    occupants_count?: number;
    aset_count?: number;
    tarif_per_periode?: string;
    foto?: string | null;
    photos?: string[] | null;
    lantai?: Floor;
    aset?: Asset[];
    penempatan_kamar?: Placement[];
};
type Facility = {
    id: string;
    nama_fasilitas: string;
    kategori: string;
    kondisi: string;
    lantai_id?: string | null;
    gedung?: Building;
};
type Asset = {
    id: string;
    nama_aset: string;
    kode_inventaris: string;
    kategori: string;
    kondisi: string;
    jumlah: number;
    nilai_aset?: string;
    kamar?: Room;
    fasilitas_umum?: Facility;
    stok_aset?: { nama: string; kode: string; satuan: string };
    laporan_kerusakan?: {
        id: string;
        judul?: string;
        deskripsi?: string;
        status: string;
    }[];
};
type Placement = {
    id: string;
    status: string;
    tanggal_mulai: string;
    tanggal_selesai?: string | null;
    catatan?: string;
    mahasiswa?: {
        id: string;
        user: { nama: string; nim_nip: string };
        prodi?: { name: string };
    };
    kamar?: Room;
    periode?: { nama_periode: string };
};
type Rate = {
    id: string;
    tipe_kamar: string;
    unit: string;
    amount: string;
    student_amount?: string | null;
    room_amount?: string | null;
};
type Props = {
    kind: 'building' | 'floor' | 'room' | 'asset' | 'resident';
    role?: string;
    building?: Building;
    floor?: Floor;
    room?: Room;
    asset?: Asset;
    resident?: {
        id: string;
        nama: string;
        nim_nip: string;
        prodi?: string;
        angkatan?: string;
        placements: Placement[];
    };
    profile_summary?: ProfileSummary | null;
    facilities?: Facility[];
    rates?: Rate[];
    type_definition?: RoomType | null;
    reservations_count?: number;
    can_manage?: boolean;
    can_manage_availability?: boolean;
    can_view_assets?: boolean;
    can_view_residents?: boolean;
};
const defaultTypeLabel = (value: string) =>
    value
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateLabel = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString('id-ID') : 'Belum ditetapkan';

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Card className="space-y-4 p-5">
            <h2 className="text-lg font-semibold">{title}</h2>
            {children}
        </Card>
    );
}
function Facts({
    values,
    compact = false,
}: {
    values: Array<[string, ReactNode]>;
    compact?: boolean;
}) {
    return (
        <dl
            className={`grid gap-x-6 gap-y-4 sm:grid-cols-2 ${compact ? '' : 'lg:grid-cols-3'}`}
        >
            {values.map(([label, value]) => (
                <div key={label}>
                    <dt className="text-base-content/60 text-sm">{label}</dt>
                    <dd className="mt-1 font-medium break-words">
                        {value ?? 'Belum tersedia'}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
function RoomTable({ rooms }: { rooms: Room[] }) {
    const catalog = useRoomTypeCatalog();
    const typeLabel = (code: string) =>
        catalog.find((type) => type.code === code)?.name ??
        defaultTypeLabel(code);

    const columns: DataColumn<Room>[] = [
        {
            key: 'nomor_kamar',
            label: 'Kamar',
            render: (room) => (
                <Link
                    className="link link-primary"
                    href={roomShow.url(room.id)}
                >
                    {room.nomor_kamar}
                </Link>
            ),
        },
        {
            key: 'tipe_kamar',
            label: 'Tipe',
            render: (room) => typeLabel(room.tipe_kamar),
        },
        { key: 'kapasitas', label: 'Kapasitas' },
        { key: 'occupants_count', label: 'Penghuni aktif' },
        { key: 'aset_count', label: 'Data aset' },
        {
            key: 'status',
            label: 'Kondisi hunian',
            render: (room) => <StatusBadge status={room.status} />,
        },
    ];
    return (
        <DataTable
            columns={columns}
            data={rooms}
            searchKeys={['nomor_kamar', 'tipe_kamar']}
            emptyMessage="Belum ada kamar tercatat."
        />
    );
}
export function BuildingInventory({
    floors,
    initialView = 'table',
}: {
    floors: Floor[];
    initialView?: 'grid' | 'table';
}) {
    const catalog = useRoomTypeCatalog();
    const typeLabel = (code: string) =>
        catalog.find((type) => type.code === code)?.name ??
        defaultTypeLabel(code);

    const [view, setView] = useState(initialView);
    const rooms = floors.flatMap((floor) => floor.kamar ?? []);
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Lantai dan kamar</h2>
                <div
                    className="join"
                    role="group"
                    aria-label="Tampilan lantai dan kamar"
                >
                    {(['grid', 'table'] as const).map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            aria-pressed={view === mode}
                            onClick={() => setView(mode)}
                            className={`btn btn-sm join-item ${view === mode ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            {mode === 'grid' ? (
                                <LayoutGrid
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ) : (
                                <List className="size-4" aria-hidden="true" />
                            )}
                            {mode === 'grid' ? 'Grid' : 'Tabel'}
                        </button>
                    ))}
                </div>
            </div>
            {view === 'table' ? (
                <>
                    <Section title="Lantai">
                        <DataTable
                            columns={[
                                {
                                    key: 'nama_lantai',
                                    label: 'Lantai',
                                    render: (floor) => (
                                        <Link
                                            className="link link-primary"
                                            href={floorShow.url(floor.id)}
                                        >
                                            {floor.nama_lantai ||
                                                `Lantai ${floor.nomor_lantai}`}
                                        </Link>
                                    ),
                                },
                                { key: 'room_count', label: 'Jumlah kamar' },
                                { key: 'capacity', label: 'Kapasitas' },
                                { key: 'occupants', label: 'Penghuni aktif' },
                            ]}
                            data={floors.map((floor) => ({
                                ...floor,
                                room_count: floor.kamar?.length ?? 0,
                                capacity:
                                    floor.kamar?.reduce(
                                        (sum, room) => sum + room.kapasitas,
                                        0,
                                    ) ?? 0,
                                occupants:
                                    floor.kamar?.reduce(
                                        (sum, room) =>
                                            sum + (room.occupants_count ?? 0),
                                        0,
                                    ) ?? 0,
                            }))}
                            searchKeys={['nama_lantai']}
                            emptyMessage="Belum ada lantai tercatat."
                        />
                    </Section>
                    <Section title="Daftar kamar">
                        <RoomTable rooms={rooms} />
                    </Section>
                </>
            ) : floors.length ? (
                floors.map((floor) => (
                    <Section
                        key={floor.id}
                        title={
                            floor.nama_lantai || `Lantai ${floor.nomor_lantai}`
                        }
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Link
                                className="link link-primary"
                                href={floorShow.url(floor.id)}
                            >
                                Lihat detail lantai
                            </Link>
                            <span className="text-muted text-sm">
                                {floor.kamar?.length ?? 0} kamar
                            </span>
                        </div>
                        {floor.kamar?.length ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {floor.kamar.map((room) => (
                                    <div
                                        key={room.id}
                                        className="border-base-300 rounded-box space-y-3 border p-4"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <Link
                                                className="link link-primary font-semibold"
                                                href={roomShow.url(room.id)}
                                            >
                                                Kamar {room.nomor_kamar}
                                            </Link>
                                            <StatusBadge status={room.status} />
                                        </div>
                                        <p className="text-muted text-sm">
                                            {typeLabel(room.tipe_kamar)}
                                        </p>
                                        <Facts
                                            values={[
                                                [
                                                    'Kapasitas',
                                                    `${room.kapasitas} orang`,
                                                ],
                                                [
                                                    'Penghuni aktif',
                                                    room.occupants_count ?? 0,
                                                ],
                                                [
                                                    'Data aset',
                                                    room.aset_count ?? 0,
                                                ],
                                            ]}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>Belum ada kamar tercatat.</p>
                        )}
                    </Section>
                ))
            ) : (
                <p>Belum ada lantai tercatat.</p>
            )}
        </div>
    );
}
function AssetTable({ assets, link }: { assets: Asset[]; link: boolean }) {
    const columns: DataColumn<Asset>[] = [
        {
            key: 'nama_aset',
            label: 'Aset',
            render: (asset) =>
                link ? (
                    <Link
                        className="link link-primary"
                        href={assetShow.url(asset.id)}
                    >
                        {asset.nama_aset}
                    </Link>
                ) : (
                    asset.nama_aset
                ),
        },
        { key: 'kode_inventaris', label: 'Kode inventaris' },
        { key: 'jumlah', label: 'Jumlah' },
        {
            key: 'kondisi',
            label: 'Kondisi',
            render: (asset) => <StatusBadge status={asset.kondisi} />,
        },
    ];
    return (
        <DataTable
            columns={columns}
            data={assets}
            searchKeys={['nama_aset', 'kode_inventaris']}
            emptyMessage="Belum ada aset yang didata di kamar ini. Fasilitas master belum berarti aset fisik sudah tercatat."
        />
    );
}
function Placements({
    placements,
    residentLinks,
}: {
    placements: Placement[];
    residentLinks: boolean;
}) {
    const columns: DataColumn<Placement>[] = [
        {
            key: 'nama',
            label: 'Penghuni',
            value: (p) => p.mahasiswa?.user.nama ?? '',
            render: (p) =>
                p.mahasiswa ? (
                    residentLinks ? (
                        <Link
                            className="link link-primary"
                            href={residentShow.url(p.mahasiswa.id)}
                        >
                            {p.mahasiswa.user.nama}
                        </Link>
                    ) : (
                        p.mahasiswa.user.nama
                    )
                ) : (
                    '—'
                ),
        },
        {
            key: 'identitas',
            label: 'NIM / identitas',
            render: (p) => p.mahasiswa?.user.nim_nip ?? '—',
        },
        {
            key: 'kamar',
            label: 'Kamar',
            render: (p) =>
                p.kamar ? (
                    <Link
                        className="link link-primary"
                        href={roomShow.url(p.kamar.id)}
                    >
                        {p.kamar.lantai?.gedung?.nama_gedung} /{' '}
                        {p.kamar.nomor_kamar}
                    </Link>
                ) : (
                    '—'
                ),
        },
        {
            key: 'tanggal_mulai',
            label: 'Masuk',
            render: (p) => dateLabel(p.tanggal_mulai),
        },
        {
            key: 'tanggal_selesai',
            label: 'Keluar',
            render: (p) => dateLabel(p.tanggal_selesai),
        },
        {
            key: 'periode',
            label: 'Periode',
            render: (p) => p.periode?.nama_periode ?? '—',
        },
        {
            key: 'status',
            label: 'Status',
            render: (p) => <StatusBadge status={p.status} />,
        },
    ];
    return (
        <DataTable
            columns={columns}
            data={placements}
            searchKeys={['nama']}
            emptyMessage="Belum ada penempatan penghuni tercatat."
        />
    );
}
export default function ResidenceDetail({
    kind,
    role,
    building,
    floor,
    room,
    asset,
    resident,
    profile_summary,
    facilities = [],
    rates = [],
    type_definition,
    reservations_count = 0,
    can_manage = false,
    can_manage_availability = false,
    can_view_assets = false,
    can_view_residents = false,
}: Props) {
    const catalog = useRoomTypeCatalog();
    const typeLabel = (code: string) =>
        catalog.find((type) => type.code === code)?.name ??
        defaultTypeLabel(code);

    const title =
        kind === 'building'
            ? building?.nama_gedung
            : kind === 'floor'
              ? floor?.nama_lantai
              : kind === 'room'
                ? `Kamar ${room?.nomor_kamar}`
                : kind === 'asset'
                  ? asset?.nama_aset
                  : resident?.nama;
    const roomList =
        kind === 'floor'
            ? (floor?.kamar ?? [])
            : (building?.lantai?.flatMap((f) => f.kamar ?? []) ?? []);
    const managementBuilding = building
        ? {
              ...building,
              lantai: kind === 'floor' ? [floor!] : building.lantai,
          }
        : null;
    const roomRateFacts: Array<[string, ReactNode]> = rates.flatMap((rate) => {
        const unit =
            { year: 'tahun', month: 'bulan', day: 'hari' }[rate.unit] ??
            rate.unit;
        const type = typeLabel(rate.tipe_kamar);
        const facts: Array<[string, ReactNode]> = [
            [
                `${type} - Per orang / ${unit}`,
                formatRupiah(Number(rate.amount)),
            ],
        ];
        if (rate.student_amount != null) {
            facts.push([
                `${type} - Mahasiswa / ${unit}`,
                formatRupiah(Number(rate.student_amount)),
            ]);
        }
        if (rate.room_amount != null) {
            facts.push([
                `${type} - Per kamar / ${unit}`,
                formatRupiah(Number(rate.room_amount)),
            ]);
        }
        return facts;
    });
    const active =
        room?.penempatan_kamar?.filter((p) => p.status === 'aktif') ?? [];
    return (
        <div className="space-y-6">
            <Head title={title ?? 'Detail hunian'} />
            <nav
                aria-label="Hierarki hunian"
                className="flex flex-wrap items-center gap-2 text-sm"
            >
                {can_manage && (
                    <>
                        <Link
                            className="link"
                            href={
                                role === 'admin_aset'
                                    ? assetBuildings.url()
                                    : kelolaBangunan.url()
                            }
                        >
                            Kelola Bangunan
                        </Link>
                        <span>/</span>
                    </>
                )}
                {building && (
                    <Link
                        className="link link-primary"
                        href={buildingShow.url(building.id)}
                    >
                        {building.nama_gedung}
                    </Link>
                )}
                {floor && (
                    <>
                        <span>/</span>
                        <Link
                            className="link link-primary"
                            href={floorShow.url(floor.id)}
                        >
                            {floor.nama_lantai}
                        </Link>
                    </>
                )}
                {room && (
                    <>
                        <span>/</span>
                        <span>Kamar {room.nomor_kamar}</span>
                    </>
                )}
            </nav>
            <PageHeader
                title={title ?? 'Detail hunian'}
                subtitle={
                    kind === 'room'
                        ? 'Kondisi kamar, fasilitas, aset, dan penempatan penghuni.'
                        : kind === 'building'
                          ? 'Informasi gedung dan pengelolaan lantai serta kamar.'
                          : kind === 'floor'
                            ? 'Informasi lantai dan kamar yang tercatat.'
                            : kind === 'asset'
                              ? 'Identitas inventaris, kondisi, dan lokasi penempatan.'
                              : 'Profil penghuni dan riwayat hunian.'
                }
            />
            {kind === 'building' && building && (
                <BuildingWorkspace
                    key={building.id}
                    building={building}
                    rates={rates}
                    canManage={can_manage}
                    canManageAvailability={can_manage_availability}
                />
            )}
            {kind === 'floor' && floor && can_manage_availability && (
                <Card className="p-5">
                    <FloorAvailability floors={[floor]} />
                </Card>
            )}
            {kind === 'floor' && building && (
                <>
                    <Section title="Informasi bangunan">
                        <div className="grid items-start gap-6 lg:grid-cols-2">
                            <PhotoCarousel
                                photos={photoPaths(building)}
                                title={building.nama_gedung}
                            />
                            <Facts
                                values={[
                                    ['Kode gedung', building.kode_gedung],
                                    [
                                        'Peruntukan',
                                        typeLabel(
                                            building.gender_peruntukan ??
                                                'campur',
                                        ),
                                    ],
                                    ['Alamat', building.alamat],
                                    ['Jumlah kamar', roomList.length],
                                    [
                                        'Kapasitas total',
                                        roomList.reduce(
                                            (sum, r) => sum + r.kapasitas,
                                            0,
                                        ),
                                    ],
                                    [
                                        'Penghuni aktif',
                                        roomList.reduce(
                                            (sum, r) =>
                                                sum + (r.occupants_count ?? 0),
                                            0,
                                        ),
                                    ],
                                ]}
                            />
                        </div>
                        {building.deskripsi && (
                            <p className="whitespace-pre-wrap">
                                {building.deskripsi}
                            </p>
                        )}
                    </Section>
                    {!can_manage && (
                        <Section title="Daftar kamar">
                            <RoomTable rooms={roomList} />
                        </Section>
                    )}
                    <Section title="Fasilitas umum">
                        <div className="divide-base-300 divide-y">
                            {facilities.length ? (
                                facilities.map((f) => (
                                    <div
                                        key={f.id}
                                        className="flex justify-between py-3"
                                    >
                                        <span>{f.nama_fasilitas}</span>
                                        <StatusBadge status={f.kondisi} />
                                    </div>
                                ))
                            ) : (
                                <p>Belum ada fasilitas umum yang didata.</p>
                            )}
                        </div>
                    </Section>
                </>
            )}
            {kind === 'room' && room && (
                <>
                    <Card className="overflow-hidden">
                        <div className="grid md:grid-cols-2">
                            <div className="p-4">
                                <PhotoCarousel
                                    photos={photoPaths(room)}
                                    title={`Kamar ${room.nomor_kamar}`}
                                />
                            </div>
                            <div className="space-y-4 p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="font-semibold">
                                        Informasi kamar
                                    </h2>
                                    {can_manage && (
                                        <RoomPhotoEditor room={room} />
                                    )}
                                </div>
                                <Facts
                                    compact
                                    values={[
                                        [
                                            'Tipe kamar',
                                            typeLabel(room.tipe_kamar),
                                        ],
                                        [
                                            'Status',
                                            <StatusBadge
                                                status={room.status}
                                            />,
                                        ],
                                        [
                                            'Kapasitas',
                                            `${room.kapasitas} orang`,
                                        ],
                                        ['Penghuni aktif', active.length],
                                        [
                                            'Tempat tersedia',
                                            Math.max(
                                                0,
                                                room.kapasitas -
                                                    active.length -
                                                    reservations_count,
                                            ),
                                        ],
                                        [
                                            'Tempat ditahan / reservasi',
                                            reservations_count,
                                        ],
                                        [
                                            'Kapasitas maksimal tipe',
                                            type_definition?.max_capacity ==
                                            null
                                                ? 'Belum diisi'
                                                : `${type_definition.max_capacity} orang`,
                                        ],
                                        [
                                            'Tipe tersedia',
                                            type_definition
                                                ? type_definition.enabled
                                                    ? 'Ya'
                                                    : 'Tidak'
                                                : 'Belum dikonfigurasi',
                                        ],
                                        [
                                            'Fasilitas menurut master',
                                            type_definition?.facilities ||
                                                'Belum diisi',
                                        ],
                                        [
                                            'Aset tercatat',
                                            room.aset?.length ?? 0,
                                        ],
                                    ]}
                                />
                                <section
                                    aria-label="Tarif kamar"
                                    className="border-base-300 space-y-3 border-t pt-4"
                                >
                                    <h3 className="font-semibold">
                                        Tarif kamar
                                    </h3>
                                    {rates.length > 0 ? (
                                        <Facts compact values={roomRateFacts} />
                                    ) : Number(room.tarif_per_periode) > 0 ? (
                                        <Facts
                                            compact
                                            values={[
                                                [
                                                    'Per orang / tahun',
                                                    formatRupiah(
                                                        Number(
                                                            room.tarif_per_periode,
                                                        ),
                                                    ),
                                                ],
                                            ]}
                                        />
                                    ) : (
                                        <p className="text-base-content/60 text-sm">
                                            Tarif belum ditetapkan.
                                        </p>
                                    )}
                                </section>
                            </div>
                        </div>
                    </Card>
                    <details className="border-base-300 rounded-xl border" open>
                        <summary className="cursor-pointer p-4 font-semibold">
                            Inventaris kamar
                        </summary>
                        <Section title="Aset di kamar">
                            <AssetTable
                                assets={room.aset ?? []}
                                link={can_view_assets}
                            />
                        </Section>
                    </details>
                    <details className="border-base-300 rounded-xl border">
                        <summary className="cursor-pointer p-4 font-semibold">
                            Penghuni & riwayat hunian
                        </summary>
                        <Section title="Penghuni aktif">
                            <Placements
                                placements={active.map((p) => ({
                                    ...p,
                                    kamar: room,
                                }))}
                                residentLinks={can_view_residents}
                            />
                        </Section>
                        <Section title="Riwayat penempatan">
                            <Placements
                                placements={(room.penempatan_kamar ?? [])
                                    .filter((p) => p.status !== 'aktif')
                                    .map((p) => ({ ...p, kamar: room }))}
                                residentLinks={can_view_residents}
                            />
                        </Section>
                    </details>
                </>
            )}
            {can_manage && managementBuilding && kind === 'floor' && (
                <Section title="Kelola lantai dan kamar">
                    <KelolaBangunan
                        gedung={[managementBuilding]}
                        detail
                        floorOnly
                    />
                </Section>
            )}
            {kind === 'asset' && asset && (
                <>
                    <Section title="Detail aset">
                        <Facts
                            values={[
                                ['Kode inventaris', asset.kode_inventaris],
                                ['Kategori', asset.kategori],
                                [
                                    'Jumlah',
                                    `${asset.jumlah} ${asset.stok_aset?.satuan ?? 'unit'}`,
                                ],
                                [
                                    'Kondisi',
                                    <StatusBadge status={asset.kondisi} />,
                                ],
                                [
                                    'Stok asal',
                                    asset.stok_aset
                                        ? `${asset.stok_aset.kode} / ${asset.stok_aset.nama}`
                                        : 'Belum terhubung',
                                ],
                                [
                                    'Nilai aset',
                                    formatRupiah(Number(asset.nilai_aset ?? 0)),
                                ],
                                [
                                    'Lokasi',
                                    asset.kamar ? (
                                        <Link
                                            className="link link-primary"
                                            href={roomShow.url(asset.kamar.id)}
                                        >
                                            Kamar {asset.kamar.nomor_kamar}
                                        </Link>
                                    ) : (
                                        (asset.fasilitas_umum?.nama_fasilitas ??
                                        'Belum ditempatkan')
                                    ),
                                ],
                            ]}
                        />
                    </Section>
                    <Section title="Laporan kerusakan">
                        {asset.laporan_kerusakan?.length ? (
                            asset.laporan_kerusakan.map((report) => (
                                <div
                                    key={report.id}
                                    className="border-base-300 flex justify-between gap-4 border-b py-3"
                                >
                                    <span>
                                        {report.judul ?? report.deskripsi}
                                    </span>
                                    <StatusBadge status={report.status} />
                                </div>
                            ))
                        ) : (
                            <p>Belum ada laporan kerusakan tercatat.</p>
                        )}
                    </Section>
                </>
            )}
            {kind === 'resident' && resident && (
                <>
                    <Section title="Profil penghuni">
                        {profile_summary ? (
                            <UserProfileDetails summary={profile_summary} />
                        ) : (
                            <Facts
                                values={[
                                    ['Nama', resident.nama],
                                    ['NIM / identitas', resident.nim_nip],
                                    ['Prodi', resident.prodi],
                                    ['Angkatan', resident.angkatan],
                                ]}
                            />
                        )}
                    </Section>
                    <Section title="Riwayat hunian">
                        <Placements
                            placements={resident.placements.map((p) => ({
                                ...p,
                                mahasiswa: {
                                    id: resident.id,
                                    user: {
                                        nama: resident.nama,
                                        nim_nip: resident.nim_nip,
                                    },
                                },
                            }))}
                            residentLinks={false}
                        />
                    </Section>
                </>
            )}
        </div>
    );
}
