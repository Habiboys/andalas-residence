import { PageHeader, Card, DataTable, StatusBadge } from "../../components/ui";
import { mapTicketStatus } from "../../lib/format";

type TiketRow = { id: string; nomor_tiket?: string; deskripsi?: string; status?: string; tanggal_lapor?: string };

type Props = {
  tiket: TiketRow[];
};

export default function TiketMasuk({ tiket = [] }: Props) {
  const incoming = tiket.filter((t) => ["menunggu_triage", "didisposisikan"].includes(t.status ?? ""));

  const columns = [
    { key: "nomor_tiket", label: "No. Tiket" },
    { key: "deskripsi", label: "Deskripsi" },
    { key: "status", label: "Status", render: (r: TiketRow) => <StatusBadge status={mapTicketStatus(r.status ?? "")} /> },
    { key: "tanggal_lapor", label: "Tanggal", render: (r: TiketRow) => String(r.tanggal_lapor ?? "").slice(0, 10) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Tiket Masuk" subtitle="Daftar tiket yang perlu ditangani" />
      <Card className="p-4"><DataTable columns={columns as never} data={incoming as never} emptyMessage="Tidak ada tiket masuk" /></Card>
    </div>
  );
}