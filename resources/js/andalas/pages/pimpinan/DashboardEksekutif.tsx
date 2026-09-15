import { PageHeader, StatCard, Card } from "../../components/ui";
import type { DashboardStats } from "../../lib/types";
import { formatRupiah } from "../../lib/format";

type TransaksiRow = { tipe?: string; nominal?: number };

export default function DashboardEksekutif({ stats, keuangan = [] }: { stats?: DashboardStats; keuangan?: TransaksiRow[] }) {

  const pemasukan = (keuangan ?? []).filter((t) => t.tipe === "pemasukan").reduce((s, t) => s + Number(t.nominal ?? 0), 0);
  const pengeluaran = (keuangan ?? []).filter((t) => t.tipe === "pengeluaran").reduce((s, t) => s + Number(t.nominal ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Eksekutif" subtitle="Mode analitik pimpinan asrama" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Penghuni Aktif" value={stats?.penghuni_aktif ?? 0} color="green" />
        <StatCard label="Okupansi" value={stats ? `${stats.okupansi.penuh}/${stats.okupansi.total_kamar}` : "-"} color="gold" />
        <StatCard label="Tiket Aktif" value={stats?.tiket_aktif ?? 0} color="red" />
        <StatCard label="Pengajuan Pending" value={stats?.pengajuan_pending ?? 0} color="gold" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5"><p className="text-xs text-muted uppercase">Total Pemasukan</p><p className="text-2xl font-bold text-success">{formatRupiah(pemasukan)}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted uppercase">Total Pengeluaran</p><p className="text-2xl font-bold text-error">{formatRupiah(pengeluaran)}</p></Card>
      </div>
    </div>
  );
}
