import { PageHeader, Card, DataTable, StatusBadge, TableSkeleton } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { mapTicketStatus } from "../../lib/format";

type TiketRow = { id: string; nomor_tiket?: string; deskripsi?: string; status?: string; tanggal_lapor?: string };

export default function TiketMasuk() {
  const { data, loading } = useAndalasApi<TiketRow[]>("/api/andalas/tiket");
  const incoming = (data ?? []).filter((t) => ["menunggu_triage", "didisposisikan"].includes(t.status ?? ""));

  const columns = [
    { key: "nomor_tiket", label: "No. Tiket" },
    { key: "deskripsi", label: "Deskripsi" },
    { key: "status", label: "Status", render: (r: TiketRow) => <StatusBadge status={mapTicketStatus(r.status ?? "")} /> },
    { key: "tanggal_lapor", label: "Tanggal", render: (r: TiketRow) => String(r.tanggal_lapor ?? "").slice(0, 10) },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Tiket Masuk" subtitle="Daftar tiket yang perlu ditangani" />
      <Card className="p-4">{loading ? <TableSkeleton /> : <DataTable columns={columns as never} data={incoming as never} emptyMessage="Tidak ada tiket masuk" />}</Card>
    </div>
  );
}
