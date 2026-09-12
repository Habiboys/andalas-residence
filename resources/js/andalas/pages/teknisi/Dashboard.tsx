import { PageHeader, StatCard, Card } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";

type TiketRow = { id: string; status?: string };

export default function TeknisiDashboard() {
  const { data: tiket } = useAndalasApi<TiketRow[]>("/api/andalas/tiket");
  const aktif = (tiket ?? []).filter((t) => !["selesai", "dibatalkan"].includes(t.status ?? "")).length;
  const selesai = (tiket ?? []).filter((t) => t.status === "selesai").length;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Dashboard Teknisi" subtitle="Ringkasan tiket maintenance" />
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <StatCard label="Tiket Aktif" value={aktif} color="red" />
        <StatCard label="Tiket Selesai" value={selesai} color="green" />
      </div>
      <Card className="p-5 text-sm text-muted">Ambil tiket dari menu Tiket Masuk dan update progres di Update Tiket.</Card>
    </div>
  );
}
