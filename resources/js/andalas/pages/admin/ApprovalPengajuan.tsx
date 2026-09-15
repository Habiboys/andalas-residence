import { useForm } from "@inertiajs/react";
import { PageHeader, Card, DataTable, Button, StatusBadge } from "../../components/ui";
import { approve as approveBebas } from "@/routes/andalas/pengajuan/bebas";
import { approve as approveIzin } from "@/routes/andalas/pengajuan/izin";
import { mapPengajuanStatus } from "../../lib/format";

type BebasRow = { id: string; nomor_pengajuan?: string; alasan?: string; status?: string; mahasiswa?: { user?: { nama?: string; nim_nip?: string } } };
type IzinRow = { id: string; tanggal_mulai?: string; tanggal_kembali?: string; alasan?: string; status?: string; mahasiswa?: { user?: { nama?: string } } };

type Props = { page: string; bebas_asrama?: BebasRow[]; izin_pulang?: IzinRow[] };

export default function ApprovalPengajuan({ page, bebas_asrama, izin_pulang }: Props) {
  const { post, processing, transform } = useForm({ status: "disetujui" });

  const showBebas = page === "approval-bebas-asrama" ? true : page === "approval-izin-pulang" ? false : !!bebas_asrama;

  function approveBebasRow(id: string, status: "disetujui" | "ditolak") {
    transform(() => ({ status }));
    post(approveBebas.url({ pengajuan: id }));
  }

  function approveIzinRow(id: string, status: "disetujui" | "ditolak") {
    transform(() => ({ status }));
    post(approveIzin.url({ pengajuan: id }));
  }

  const bebasCols = [
    { key: "nomor", label: "No.", render: (r: BebasRow) => r.nomor_pengajuan },
    { key: "nama", label: "Mahasiswa", render: (r: BebasRow) => r.mahasiswa?.user?.nama },
    { key: "status", label: "Status", render: (r: BebasRow) => <StatusBadge status={mapPengajuanStatus(r.status ?? "")} /> },
    { key: "aksi", label: "", render: (r: BebasRow) => r.status === "diajukan" ? (
      <div className="flex gap-1"><Button size="sm" disabled={processing} onClick={() => approveBebasRow(r.id, "disetujui")}>Setuju</Button><Button size="sm" variant="secondary" disabled={processing} onClick={() => approveBebasRow(r.id, "ditolak")}>Tolak</Button></div>
    ) : null },
  ];

  const izinCols = [
    { key: "nama", label: "Mahasiswa", render: (r: IzinRow) => r.mahasiswa?.user?.nama },
    { key: "tanggal_mulai", label: "Mulai" },
    { key: "tanggal_kembali", label: "Kembali" },
    { key: "status", label: "Status", render: (r: IzinRow) => <StatusBadge status={mapPengajuanStatus(r.status ?? "")} /> },
    { key: "aksi", label: "", render: (r: IzinRow) => r.status === "diajukan" ? (
      <div className="flex gap-1"><Button size="sm" disabled={processing} onClick={() => approveIzinRow(r.id, "disetujui")}>Setuju</Button><Button size="sm" variant="secondary" disabled={processing} onClick={() => approveIzinRow(r.id, "ditolak")}>Tolak</Button></div>
    ) : null },
  ];

  const columns = showBebas ? bebasCols : izinCols;
  const rows = showBebas ? (bebas_asrama ?? []) : (izin_pulang ?? []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Approval Pengajuan"
        subtitle={showBebas ? "Bebas asrama" : "Izin pulang"}
      />
      <Card>
        <DataTable columns={columns as never} data={rows as never} />
      </Card>
    </div>
  );
}