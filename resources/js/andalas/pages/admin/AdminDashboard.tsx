import { useState } from "react";
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
    .filter((p) => p.status === "menunggu_verifikasi")
    .slice(0, 5);

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

      <Card>
        <div className="border-b border-base-300 px-6 py-4">
          <h2 className="font-semibold">Pembayaran Menunggu Verifikasi</h2>
        </div>
        <Table columns={tableColumns} data={pendingPembayaran as unknown as Record<string, unknown>[]} emptyMessage="Tidak ada pembayaran pending" />
      </Card>
    </div>
  );
}
