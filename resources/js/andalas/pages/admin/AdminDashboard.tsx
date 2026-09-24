import { Link, usePage } from "@inertiajs/react";
import { ChartCard, DonutChart, OccupancyChart, TrendAreaChart } from "../../components/charts";
import * as admin from "@/routes/admin";
import * as layanan from "@/routes/admin_layanan";
import { PageHeader, StatCard, Card, Table, StatusBadge } from "../../components/ui";
import type { DashboardStats } from "../../lib/types";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

type PembayaranRow = {
  id: string;
  kode_transaksi?: string;
  jenis_pembayaran?: string;
  nominal?: number;
  status?: string;
  created_at?: string;
  mahasiswa?: { user?: { nim_nip?: string; nama?: string } };
};

export default function AdminDashboard({ stats, pembayaran = [] }: { stats?: DashboardStats; pembayaran?: PembayaranRow[] }) {

  const pendingPembayaran = (pembayaran ?? [])
    .filter((p) => p.status === "menunggu_verifikasi");

  const role = usePage().props.role;
  const paymentUrl = role === 'admin_layanan' ? layanan.verifikasiPembayaran.url() : admin.verifikasiPembayaran.url();
  const monthly = Object.values(pembayaran.filter((item) => item.status === 'terverifikasi' && item.created_at).reduce<Record<string, { bulan: string; total: number }>>((result, item) => {
    const month = item.created_at!.slice(0, 7);
    result[month] ??= { bulan: month, total: 0 };
    result[month].total += Number(item.nominal ?? 0);
    return result;
  }, {})).sort((a, b) => a.bulan.localeCompare(b.bulan));
  const okupansiPct = stats
    ? Math.round(((stats.okupansi.total_kamar - stats.okupansi.kosong) / Math.max(stats.okupansi.total_kamar, 1)) * 100)
    : 0;

  const tableColumns = [
    { key: "nim", label: "NIM", render: (row: Record<string, unknown>) => String((row.mahasiswa as PembayaranRow["mahasiswa"])?.user?.nim_nip ?? "-") },
    { key: "nama", label: "Nama", render: (row: Record<string, unknown>) => String((row.mahasiswa as PembayaranRow["mahasiswa"])?.user?.nama ?? "-") },
    { key: "jenis_pembayaran", label: "Jenis" },
    { key: "nominal", label: "Jumlah", render: (row: Record<string, unknown>) => formatRupiah(Number(row.nominal ?? 0)) },
    { key: "created_at", label: "Tanggal", render: (row: Record<string, unknown>) => String(row.created_at ?? "").slice(0, 10) },
    { key: "status", label: "Status", render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status)} /> },
    { key: "aksi", label: "Aksi", render: () => <Link className="btn btn-xs btn-primary" href={paymentUrl}>Verifikasi</Link> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Administrasi" subtitle="Ringkasan aktivitas dan status terkini asrama" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Penghuni Aktif" value={stats?.penghuni_aktif ?? 0} color="green" />
        <StatCard label="Pengajuan Pending" value={stats?.pengajuan_pending ?? 0} color="gold" />
        <StatCard label="Tiket Aktif" value={stats?.tiket_aktif ?? 0} color="red" />
        <StatCard label="Tingkat Okupansi" value={`${okupansiPct}%`} color="green" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Keterisian kamar" subtitle="Kamar yang memiliki penghuni">
          <OccupancyChart total={stats?.okupansi.total_kamar ?? 0} empty={stats?.okupansi.kosong ?? 0} />
        </ChartCard>
        <ChartCard title="Status pembayaran" subtitle="Distribusi bukti pembayaran yang tercatat">
          <DonutChart data={[
            { name: 'Terverifikasi', value: pembayaran.filter((p) => p.status === 'terverifikasi').length, color: '#27745a' },
            { name: 'Menunggu', value: pendingPembayaran.length, color: '#dbad4a' },
            { name: 'Ditolak', value: pembayaran.filter((p) => p.status === 'ditolak').length, color: '#bc6676' },
          ]} />
        </ChartCard>
        <ChartCard title="Pembayaran terverifikasi" subtitle="Total per bulan berdasarkan tanggal pembayaran dicatat">
          <TrendAreaChart data={monthly} xKey="bulan" series={[{ key: 'total', name: 'Pembayaran', color: '#578cc8' }]} valueFormatter={formatRupiah} />
        </ChartCard>
      </div>
      <Card>
        <div className="border-b border-base-300 px-6 py-4">
          <h2 className="font-semibold">Pembayaran Menunggu Verifikasi</h2>
        </div>
        <Table columns={tableColumns} data={pendingPembayaran as unknown as Record<string, unknown>[]} emptyMessage="Tidak ada pembayaran pending" />
      </Card>
    </div>
  );
}
