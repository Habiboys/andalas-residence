import { PageHeader, Card, Table, TableSkeleton } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { formatRupiah } from "../../lib/format";

type TransaksiRow = { nomor_bukti?: string; tanggal_transaksi?: string; tipe?: string; nominal?: number; kategori?: { nama_kategori?: string } };

export default function LaporanKeuangan() {
  const { data, loading } = useAndalasApi<TransaksiRow[]>("/api/andalas/keuangan");

  return (
    <div className="p-6">
      <PageHeader title="Laporan Keuangan" subtitle="Rekap transaksi kas operasional" />
      <Card>
        {loading ? <TableSkeleton /> : (
          <Table columns={[
            { key: "nomor_bukti", label: "No. Bukti" },
            { key: "tanggal", label: "Tanggal", render: (r: TransaksiRow) => String(r.tanggal_transaksi ?? "").slice(0, 10) },
            { key: "kategori", label: "Kategori", render: (r: TransaksiRow) => r.kategori?.nama_kategori ?? "-" },
            { key: "tipe", label: "Tipe" },
            { key: "nominal", label: "Nominal", render: (r: TransaksiRow) => formatRupiah(Number(r.nominal ?? 0)) },
          ]} data={data ?? []} emptyMessage="Belum ada transaksi" />
        )}
      </Card>
    </div>
  );
}
