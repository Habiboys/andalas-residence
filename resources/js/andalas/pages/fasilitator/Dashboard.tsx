import { PageHeader, StatCard, Card } from "../../components/ui";
import type { DashboardStats } from "../../lib/types";

export default function FasilitatorDashboard({ stats, absensi = [] }: { stats?: DashboardStats; absensi?: unknown[] }) {

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Fasilitator" subtitle="Ringkasan wilayah dan absensi hari ini" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Absensi Hari Ini" value={absensi?.length ?? 0} color="green" />
        <StatCard label="Penghuni Aktif" value={stats?.penghuni_aktif ?? 0} color="gold" />
        <StatCard label="Okupansi Kamar" value={stats ? `${stats.okupansi.total_kamar - stats.okupansi.kosong}/${stats.okupansi.total_kamar}` : "-"} color="green" />
      </div>
      <Card className="p-5 text-sm text-muted">Gunakan menu Scan Barcode untuk mencatat absensi sholat mahasiswa wilayah Anda.</Card>
    </div>
  );
}
