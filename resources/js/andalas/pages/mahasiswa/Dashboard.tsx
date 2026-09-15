import { PageHeader, StatCard, Card } from "../../components/ui";
import { formatRupiah } from "../../lib/format";
import type { DashboardStats } from "../../lib/types";
import { useAuth } from "../../context/AppContext";

type PembayaranRow = { status?: string; nominal?: number; jenis_pembayaran?: string };

export default function MahasiswaDashboard({ stats, pembayaran = [] }: { stats?: DashboardStats; pembayaran?: PembayaranRow[] }) {
  const { currentUser } = useAuth();

  const pending = (pembayaran ?? []).filter((p) => p.status === "menunggu_verifikasi").length;
  const totalTagihan = (pembayaran ?? []).reduce((s, p) => s + Number(p.nominal ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title={`Halo, ${currentUser?.nama?.split(" ")[0] ?? "Mahasiswa"}`} subtitle="Ringkasan hunian dan tagihan Anda" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Status Huni" value={currentUser?.status_huni ?? "calon"} color="green" />
        <StatCard label="Tagihan Pending" value={pending} color="gold" />
        <StatCard label="Total Tagihan" value={formatRupiah(totalTagihan)} color="green" />
      </div>
      <Card className="p-5">
        <h3 className="font-semibold mb-2">Info Kamar</h3>
        <p className="text-sm text-muted">Prodi: {currentUser?.prodi ?? "-"} | Angkatan: {currentUser?.angkatan ?? "-"}</p>
        <p className="text-sm text-muted mt-1">Okupansi asrama: {stats?.okupansi.total_kamar ?? 0} kamar total</p>
      </Card>
    </div>
  );
}
