import { PageHeader, Card, Table, TableSkeleton } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";

type KegiatanRow = { judul?: string; tanggal_mulai?: string; lokasi?: string; status?: string };

export default function JadwalKegiatan() {
  const { data: kegiatan, loading } = useAndalasApi<KegiatanRow[]>("/api/andalas/kegiatan");

  return (
    <div className="p-6">
      <PageHeader title="Jadwal Kegiatan" subtitle="Kegiatan dan pengumuman asrama" />
      <Card>
        {loading ? <TableSkeleton /> : (
          <Table
            columns={[
              { key: "judul", label: "Kegiatan" },
              { key: "tanggal_mulai", label: "Tanggal", render: (r: KegiatanRow) => String(r.tanggal_mulai ?? "").slice(0, 10) },
              { key: "lokasi", label: "Lokasi" },
              { key: "status", label: "Status" },
            ]}
            data={kegiatan ?? []}
            emptyMessage="Belum ada kegiatan"
          />
        )}
      </Card>
    </div>
  );
}
