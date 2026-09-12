import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Tabs, DataTable, Button, StatusBadge } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";
import { mapPengajuanStatus } from "../../lib/format";

type BebasRow = { id: string; nomor_pengajuan?: string; alasan?: string; status?: string; mahasiswa?: { user?: { nama?: string; nim_nip?: string } } };
type IzinRow = { id: string; tanggal_mulai?: string; tanggal_kembali?: string; alasan?: string; status?: string; mahasiswa?: { user?: { nama?: string } } };

export default function ApprovalPengajuan() {
  const { data, reload } = useAndalasApi<{ bebas_asrama: BebasRow[]; izin_pulang: IzinRow[] }>("/api/andalas/pengajuan");
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  async function approveBebas(id: string, status: "disetujui" | "ditolak") {
    setBusy(id);
    try {
      await andalasApi.post(`/api/andalas/pengajuan/bebas-asrama/${id}/approve`, { status });
      toast.success(status === "disetujui" ? "Pengajuan bebas asrama disetujui." : "Pengajuan bebas asrama ditolak.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses pengajuan");
    } finally {
      setBusy(null);
    }
  }

  async function approveIzin(id: string, status: "disetujui" | "ditolak") {
    setBusy(id);
    try {
      await andalasApi.post(`/api/andalas/pengajuan/izin-pulang/${id}/approve`, { status });
      toast.success(status === "disetujui" ? "Pengajuan izin pulang disetujui." : "Pengajuan izin pulang ditolak.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses pengajuan");
    } finally {
      setBusy(null);
    }
  }

  const bebasCols = [
    { key: "nomor", label: "No.", render: (r: BebasRow) => r.nomor_pengajuan },
    { key: "nama", label: "Mahasiswa", render: (r: BebasRow) => r.mahasiswa?.user?.nama },
    { key: "status", label: "Status", render: (r: BebasRow) => <StatusBadge status={mapPengajuanStatus(r.status ?? "")} /> },
    { key: "aksi", label: "", render: (r: BebasRow) => r.status === "diajukan" ? (
      <div className="flex gap-1"><Button size="sm" disabled={busy === r.id} onClick={() => approveBebas(r.id, "disetujui")}>Setuju</Button><Button size="sm" variant="secondary" disabled={busy === r.id} onClick={() => approveBebas(r.id, "ditolak")}>Tolak</Button></div>
    ) : null },
  ];

  const izinCols = [
    { key: "nama", label: "Mahasiswa", render: (r: IzinRow) => r.mahasiswa?.user?.nama },
    { key: "tanggal_mulai", label: "Mulai" },
    { key: "tanggal_kembali", label: "Kembali" },
    { key: "status", label: "Status", render: (r: IzinRow) => <StatusBadge status={mapPengajuanStatus(r.status ?? "")} /> },
    { key: "aksi", label: "", render: (r: IzinRow) => r.status === "diajukan" ? (
      <div className="flex gap-1"><Button size="sm" disabled={busy === r.id} onClick={() => approveIzin(r.id, "disetujui")}>Setuju</Button><Button size="sm" variant="secondary" disabled={busy === r.id} onClick={() => approveIzin(r.id, "ditolak")}>Tolak</Button></div>
    ) : null },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Approval Pengajuan" subtitle="Bebas asrama dan izin pulang" />
      <Card>
        <Tabs tabs={["Bebas Asrama", "Izin Pulang"]} active={tab} onChange={setTab} />
        {tab === 0 ? <DataTable columns={bebasCols as never} data={(data?.bebas_asrama ?? []) as never} /> : <DataTable columns={izinCols as never} data={(data?.izin_pulang ?? []) as never} />}
      </Card>
    </div>
  );
}
