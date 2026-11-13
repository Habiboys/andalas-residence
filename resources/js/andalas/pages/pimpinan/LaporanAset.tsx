import { useMemo, useState } from 'react';
import { PageHeader, StatCard, StatusBadge, Table } from '../../components/ui';

type LokasiRelation = {
    kamar?: {
        nomor_kamar?: string;
        lantai?: { gedung?: { nama_gedung?: string } };
    };
    fasilitas_umum?: {
        nama_fasilitas?: string;
        gedung?: { nama_gedung?: string };
    };
};

type AsetRow = LokasiRelation & {
    kode_inventaris?: string;
    nama_aset?: string;
    kategori?: string;
    kondisi?: string;
    jumlah?: number;
};
type TiketRow = LokasiRelation & {
    nomor_tiket?: string;
    status?: string;
    prioritas?: string;
    deskripsi?: string;
};

type Props = {
    aset?: AsetRow[];
    tiket?: TiketRow[];
};

function formatLocation(row: LokasiRelation): string {
    if (row.kamar?.nomor_kamar) {
        const gedung = row.kamar.lantai?.gedung?.nama_gedung;
        return gedung
            ? `${gedung} · Kamar ${row.kamar.nomor_kamar}`
            : `Kamar ${row.kamar.nomor_kamar}`;
    }
    if (row.fasilitas_umum?.nama_fasilitas) {
        const gedung = row.fasilitas_umum.gedung?.nama_gedung;
        return gedung
            ? `${gedung} · ${row.fasilitas_umum.nama_fasilitas}`
            : row.fasilitas_umum.nama_fasilitas;
    }
    return '-';
}

export default function LaporanAset({ aset = [], tiket = [] }: Props) {
    const [assetSearch, setAssetSearch] = useState('');
    const [kondisiFilter, setKondisiFilter] = useState('');
    const [tiketStatus, setTiketStatus] = useState('');

    const filteredAset = useMemo(() => {
        const q = assetSearch.trim().toLowerCase();
        return aset.filter((item) => {
            if (kondisiFilter && item.kondisi !== kondisiFilter) {
                return false;
            }
            if (!q) {
                return true;
            }
            const haystack = [
                item.kode_inventaris,
                item.nama_aset,
                item.kategori,
                formatLocation(item),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [aset, assetSearch, kondisiFilter]);

    const filteredTiket = useMemo(
        () =>
            tiketStatus
                ? tiket.filter((item) => item.status === tiketStatus)
                : tiket,
        [tiket, tiketStatus],
    );

    const brokenCount = aset.filter((item) =>
        ['rusak_ringan', 'rusak_berat', 'hilang'].includes(
            item.kondisi ?? '',
        ),
    ).length;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Laporan Aset"
                subtitle="Inventaris dan tiket pemeliharaan asrama"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                    label="Total Unit Aset"
                    value={aset.length}
                    color="blue"
                />
                <StatCard
                    label="Aset Perlu Perhatian"
                    value={brokenCount}
                    color="red"
                />
                <StatCard
                    label="Total Tiket Kerusakan"
                    value={tiket.length}
                    color="gold"
                />
            </div>
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold">Inventaris Aset</h2>
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="search"
                            value={assetSearch}
                            onChange={(e) => setAssetSearch(e.target.value)}
                            placeholder="Cari kode, nama, lokasi..."
                            className="input input-bordered input-sm w-56"
                        />
                        <select
                            aria-label="Filter kondisi aset"
                            value={kondisiFilter}
                            onChange={(e) => setKondisiFilter(e.target.value)}
                            className="select select-bordered select-sm"
                        >
                            <option value="">Semua kondisi</option>
                            <option value="baik">Baik</option>
                            <option value="rusak_ringan">Rusak ringan</option>
                            <option value="rusak_berat">Rusak berat</option>
                            <option value="hilang">Hilang</option>
                        </select>
                    </div>
                </div>
                <Table
                    columns={[
                        { key: 'kode_inventaris', label: 'Kode' },
                        { key: 'nama_aset', label: 'Nama' },
                        { key: 'kategori', label: 'Kategori' },
                        {
                            key: 'lokasi',
                            label: 'Lokasi',
                            render: (r: AsetRow) => formatLocation(r),
                        },
                        {
                            key: 'kondisi',
                            label: 'Kondisi',
                            render: (r: AsetRow) => (
                                <StatusBadge status={r.kondisi ?? 'baik'} />
                            ),
                        },
                    ]}
                    data={filteredAset}
                    emptyMessage="Tidak ada aset yang sesuai"
                />
            </section>
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold">Tiket Kerusakan</h2>
                    <select
                        aria-label="Filter status tiket"
                        value={tiketStatus}
                        onChange={(e) => setTiketStatus(e.target.value)}
                        className="select select-bordered select-sm"
                    >
                        <option value="">Semua status</option>
                        <option value="menunggu_triage">Menunggu triage</option>
                        <option value="didisposisikan">Didisposisikan</option>
                        <option value="sedang_dikerjakan">Dikerjakan</option>
                        <option value="selesai">Selesai</option>
                        <option value="dibatalkan">Dibatalkan</option>
                    </select>
                </div>
                <Table
                    columns={[
                        { key: 'nomor_tiket', label: 'No. Tiket' },
                        {
                            key: 'lokasi',
                            label: 'Lokasi',
                            render: (r: TiketRow) => formatLocation(r),
                        },
                        { key: 'deskripsi', label: 'Deskripsi' },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (r: TiketRow) => (
                                <StatusBadge status={r.status ?? ''} />
                            ),
                        },
                    ]}
                    data={filteredTiket}
                    emptyMessage="Tidak ada tiket"
                />
            </section>
        </div>
    );
}
