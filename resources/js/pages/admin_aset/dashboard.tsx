import { Link } from '@inertiajs/react';
import {
    kelolaAset,
    kelolaBangunan,
    pemetaanKamar,
    stokAset,
} from '@/routes/admin_aset';
import { Card, PageHeader, StatCard } from '@/andalas/components/ui';

type AsetSummary = {
    total_unit_aset: number;
    aset_perlu_perbaikan: number;
    total_stok_gudang: number;
    kamar_kosong: number;
    total_kamar: number;
};

export default function Dashboard({
    aset_summary,
}: {
    aset_summary?: AsetSummary;
}) {
    const perluPerbaikan = aset_summary?.aset_perlu_perbaikan ?? 0;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard Admin Aset"
                subtitle="Ringkasan inventaris, stok gudang, dan pemetaan kamar asrama."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Unit Aset"
                    value={aset_summary?.total_unit_aset ?? 0}
                />
                <StatCard
                    label="Perlu Perbaikan / Hilang"
                    value={perluPerbaikan}
                    color={perluPerbaikan > 0 ? 'gold' : 'green'}
                />
                <StatCard
                    label="Total Stok Gudang"
                    value={aset_summary?.total_stok_gudang ?? 0}
                />
                <StatCard
                    label="Kamar Kosong"
                    value={`${aset_summary?.kamar_kosong ?? 0} / ${aset_summary?.total_kamar ?? 0}`}
                />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="p-5">
                    <h2 className="text-base font-semibold">Kelola Aset</h2>
                    <p className="text-muted mt-1 text-sm">
                        Kelola inventaris dan lokasi barang pada kamar atau
                        fasilitas umum.
                    </p>
                    <Link
                        className="btn btn-primary btn-sm mt-4"
                        href={kelolaAset.url()}
                    >
                        Kelola inventaris
                    </Link>
                </Card>
                <Card className="p-5">
                    <h2 className="text-base font-semibold">Stok Gudang</h2>
                    <p className="text-muted mt-1 text-sm">
                        Kelola master stok barang sebelum ditempatkan ke kamar
                        atau area umum.
                    </p>
                    <Link
                        className="btn btn-outline btn-sm mt-4"
                        href={stokAset.url()}
                    >
                        Stok aset
                    </Link>
                </Card>
                <Card className="p-5">
                    <h2 className="text-base font-semibold">Pemetaan Kamar</h2>
                    <p className="text-muted mt-1 text-sm">
                        Pantau okupansi dan status setiap kamar per gedung dan
                        lantai.
                    </p>
                    <Link
                        className="btn btn-outline btn-sm mt-4"
                        href={pemetaanKamar.url()}
                    >
                        Pemetaan kamar
                    </Link>
                </Card>
                <Card className="p-5">
                    <h2 className="text-base font-semibold">
                        Bangunan &amp; Lantai
                    </h2>
                    <p className="text-muted mt-1 text-sm">
                        Kelola gedung, lantai, kamar, dan tarif tipe kamar.
                    </p>
                    <Link
                        className="btn btn-outline btn-sm mt-4"
                        href={kelolaBangunan.url()}
                    >
                        Kelola bangunan
                    </Link>
                </Card>
            </div>
        </div>
    );
}
