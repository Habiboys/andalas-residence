import { PageHeader, Card, Table, StatusBadge, TableSkeleton } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { mapTicketStatus } from "../../lib/format";

type AsetRow = { kode_inventaris?: string; nama_aset?: string; kategori?: string; kondisi?: string };
type TiketRow = { nomor_tiket?: string; status?: string; deskripsi?: string };

export default function LaporanAset() {
  const { data: aset, loading: la } = useAndalasApi<AsetRow[]>("/api/andalas/aset");
  const { data: tiket, loading: lt } = useAndalasApi<TiketRow[]>("/api/andalas/tiket");

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Laporan Aset" subtitle="Inventaris dan tiket maintenance" />
      <Card>
        <div className="border-b border-base-300 px-5 py-4 font-semibold">Inventaris Aset</div>
        {la ? <TableSkeleton /> : (
          <Table columns={[
            { key: "kode_inventaris", label: "Kode" },
            { key: "nama_aset", label: "Nama" },
            { key: "kategori", label: "Kategori" },
            { key: "kondisi", label: "Kondisi", render: (r: AsetRow) => <StatusBadge status={r.kondisi ?? "baik"} /> },
          ]} data={aset ?? []} emptyMessage="Tidak ada aset" />
        )}
      </Card>
      <Card>
        <div className="border-b border-base-300 px-5 py-4 font-semibold">Tiket Kerusakan</div>
        {lt ? <TableSkeleton /> : (
          <Table columns={[
            { key: "nomor_tiket", label: "No. Tiket" },
            { key: "deskripsi", label: "Deskripsi" },
            { key: "status", label: "Status", render: (r: TiketRow) => <StatusBadge status={mapTicketStatus(r.status ?? "")} /> },
          ]} data={tiket ?? []} emptyMessage="Tidak ada tiket" />
        )}
      </Card>
    </div>
  );
}
