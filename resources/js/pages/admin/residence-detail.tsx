import { Head, Link } from '@inertiajs/react';
import { type ReactNode } from 'react';
import { show as buildingShow } from '@/routes/andalas/gedung';
import { show as floorShow } from '@/routes/andalas/lantai';
import { show as roomShow } from '@/routes/andalas/kamar';
import { show as assetShow } from '@/routes/andalas/aset';
import { show as residentShow } from '@/routes/andalas/mahasiswa';
import { kelolaBangunan } from '@/routes/admin';
import { kelolaBangunan as assetBuildings } from '@/routes/admin_aset';
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
    lantai?: Floor;
    aset?: Asset[];
    penempatan_kamar?: Placement[];
};
type Facility = {
    id: string;
    nama_fasilitas: string;
    kategori: string;
    kondisi: string;
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
    can_view_assets?: boolean;
    can_view_residents?: boolean;
};
const categoryLabels: Record<string, string> = {
    local_kipk: 'Maba lokal KIP-K',
    local_non_kipk: 'Maba lokal non-KIP-K',
    student: 'Mahasiswa S1 non-maba',
    international_student: 'Internasional/S2/S3 pribadi',
    international_free_facility: 'Internasional/S2/S3 ditanggung',
    non_student: 'Non-mahasiswa',
    summer_course: 'Summer Course',
};
const typeLabel = (value: string) =>
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
function Facts({ values }: { values: Array<[string, ReactNode]> }) {
    return (
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
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
    can_view_assets = false,
    can_view_residents = false,
}: Props) {
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
              lantai:
                  kind === 'floor'
                      ? [floor!]
                      : kind === 'room'
                        ? [{ ...floor!, kamar: [room!] }]
                        : building.lantai,
          }
        : null;
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
            {(kind === 'building' || kind === 'floor') && building && (
                <>
                    <Section title="Informasi bangunan">
                        <Facts
                            values={[
                                ['Kode gedung', building.kode_gedung],
                                [
                                    'Peruntukan',
                                    typeLabel(
                                        building.gender_peruntukan ?? 'campur',
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
                        {building.deskripsi && (
                            <p className="whitespace-pre-wrap">
                                {building.deskripsi}
                            </p>
                        )}
                        {kind === 'building' && building.foto && (
                            <img
                                src={`/storage/${building.foto}`}
                                alt={building.nama_gedung}
                                className="max-h-80 rounded-lg object-cover"
                            />
                        )}
                    </Section>
                    {kind === 'building' && (
                        <Section title="Kategori penghuni dan master tipe kamar">
                            <p>
                                {building.allowed_categories === null
                                    ? 'Kategori belum dikonfigurasi.'
                                    : building.allowed_categories?.length
                                      ? building.allowed_categories
                                            .map((c) => categoryLabels[c] ?? c)
                                            .join(' • ')
                                      : 'Tidak menerima kategori penghuni.'}
                            </p>
                            <div className="overflow-x-auto">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Tipe</th>
                                            <th>Tersedia</th>
                                            <th>Kapasitas maksimal</th>
                                            <th>Fasilitas master</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {building.room_types?.map((t) => (
                                            <tr key={t.type}>
                                                <td>{typeLabel(t.type)}</td>
                                                <td>
                                                    {t.enabled ? 'Ya' : 'Tidak'}
                                                </td>
                                                <td>
                                                    {t.max_capacity == null
                                                        ? 'Belum diisi'
                                                        : `${t.max_capacity} orang`}
                                                </td>
                                                <td>
                                                    {t.facilities ||
                                                        'Belum diisi'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    )}
                    {kind === 'building' && (
                        <Section title="Lantai">
                            <div className="divide-base-300 divide-y">
                                {building.lantai?.length ? (
                                    building.lantai.map((f) => (
                                        <div
                                            key={f.id}
                                            className="flex items-center justify-between gap-4 py-3"
                                        >
                                            <Link
                                                className="link link-primary"
                                                href={floorShow.url(f.id)}
                                            >
                                                {f.nama_lantai}
                                            </Link>
                                            <span>
                                                {f.kamar?.length ?? 0} kamar
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p>Belum ada lantai tercatat.</p>
                                )}
                            </div>
                        </Section>
                    )}
                    <Section title="Daftar kamar">
                        <RoomTable rooms={roomList} />
                    </Section>
                    <Section title="Fasilitas umum">
                        <div className="divide-base-300 divide-y">
                            {(kind === 'building'
                                ? (building.fasilitas_umum ?? [])
                                : facilities
                            ).length ? (
                                (kind === 'building'
                                    ? (building.fasilitas_umum ?? [])
                                    : facilities
                                ).map((f) => (
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
                    <Section title="Informasi kamar">
                        <Facts
                            values={[
                                ['Tipe kamar', typeLabel(room.tipe_kamar)],
                                [
                                    'Status',
                                    <StatusBadge status={room.status} />,
                                ],
                                ['Kapasitas', `${room.kapasitas} orang`],
                                ['Penghuni aktif', active.length],
                                [
                                    'Tempat ditahan / reservasi',
                                    reservations_count,
                                ],
                                [
                                    'Kapasitas maksimal tipe',
                                    type_definition?.max_capacity == null
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
                                ['Aset tercatat', room.aset?.length ?? 0],
                            ]}
                        />
                    </Section>
                    <Section title="Aset di kamar">
                        <AssetTable
                            assets={room.aset ?? []}
                            link={can_view_assets}
                        />
                    </Section>
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
                </>
            )}
            {rates.length > 0 && (
                <Section title="Tarif tercatat">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Tipe</th>
                                    <th>Satuan</th>
                                    <th>Per orang / umum</th>
                                    <th>Harian mahasiswa</th>
                                    <th>Tahunan per kamar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rates.map((rate) => (
                                    <tr key={rate.id}>
                                        <td>{typeLabel(rate.tipe_kamar)}</td>
                                        <td>
                                            {
                                                {
                                                    year: 'Tahun',
                                                    month: 'Bulan',
                                                    day: 'Hari',
                                                }[rate.unit]
                                            }
                                        </td>
                                        <td>
                                            {formatRupiah(Number(rate.amount))}
                                        </td>
                                        <td>
                                            {rate.student_amount == null
                                                ? '—'
                                                : formatRupiah(
                                                      Number(
                                                          rate.student_amount,
                                                      ),
                                                  )}
                                        </td>
                                        <td>
                                            {rate.room_amount == null
                                                ? '—'
                                                : formatRupiah(
                                                      Number(rate.room_amount),
                                                  )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}
            {can_manage &&
                managementBuilding &&
                ['building', 'floor', 'room'].includes(kind) && (
                    <Section title="Kelola lantai dan kamar">
                        <KelolaBangunan
                            gedung={[managementBuilding]}
                            detail
                            floorOnly={kind !== 'building'}
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
