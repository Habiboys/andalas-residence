import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Button, Modal, FormField, inputClass, DataTable, DataColumn, EmptyState } from "../../components/ui";
import { andalasApi } from "../../lib/api";
import { useAndalasApi } from "../../hooks/useAndalasApi";

type MahasiswaRow = {
  id: string;
  user?: { nim_nip?: string; nama?: string };
  prodi?: { name?: string };
  angkatan?: string;
  status_huni?: string;
};

type PenempatanRow = {
  id: string;
  mahasiswa?: MahasiswaRow;
  kamar?: { nomor_kamar?: string; tipe_kamar?: string };
};

type PreviewItem = {
  mahasiswa_id: string;
  mahasiswa_nama: string;
  kamar_id: string;
  nomor_kamar: string;
};

type KamarOption = {
  id: string;
  nomor_kamar: string;
  kapasitas: number;
  status: string;
  tipe_kamar?: string;
  penempatan_kamar?: unknown[];
};

export default function PenempatanKamar() {
  const { data: mahasiswa, reload: reloadMhs } = useAndalasApi<MahasiswaRow[]>("/api/andalas/mahasiswa");
  const { data: penempatan, reload: reloadPenempatan } = useAndalasApi<PenempatanRow[]>("/api/andalas/penempatan");
  const { data: gedung } = useAndalasApi<Array<{ lantai?: Array<{ kamar?: KamarOption[] }> }>>("/api/andalas/gedung");

  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoPreview, setAutoPreview] = useState<PreviewItem[]>([]);
  const [selectedMhs, setSelectedMhs] = useState("");
  const [selectedKamarId, setSelectedKamarId] = useState("");
  const [busy, setBusy] = useState(false);

  const placedIds = new Set((penempatan ?? []).map((p) => p.mahasiswa?.id).filter(Boolean));
  const unplacedStudents = (mahasiswa ?? []).filter((m) => m.status_huni === "calon" || !placedIds.has(m.id));
  const placedStudents = penempatan ?? [];

  const availableRooms = useMemo(() => {
    const rooms: KamarOption[] = [];
    for (const g of gedung ?? []) {
      for (const l of g.lantai ?? []) {
        for (const k of l.kamar ?? []) {
          const okupansi = k.penempatan_kamar?.length ?? 0;
          if (okupansi < k.kapasitas && k.status !== "maintenance") rooms.push(k);
        }
      }
    }
    return rooms;
  }, [gedung]);

  async function handleAutoAssignClick() {
    setBusy(true);
    try {
      const res = await andalasApi.post<{ preview: PreviewItem[] }>("/api/andalas/auto-placement/preview");
      setAutoPreview(res.preview ?? []);
      setShowAutoModal(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat rencana auto-assign");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmAutoAssign() {
    setBusy(true);
    try {
      await andalasApi.post("/api/andalas/auto-placement/commit");
      setShowAutoModal(false);
      await Promise.all([reloadMhs(), reloadPenempatan()]);
      toast.success("Auto-assign berhasil diterapkan.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menerapkan auto-assign");
    } finally {
      setBusy(false);
    }
  }

  async function handleManualAssign() {
    if (!selectedMhs || !selectedKamarId) return;
    setBusy(true);
    try {
      await andalasApi.post("/api/andalas/penempatan/manual", {
        mahasiswa_id: selectedMhs,
        kamar_id: selectedKamarId,
      });
      setSelectedMhs("");
      setSelectedKamarId("");
      await Promise.all([reloadMhs(), reloadPenempatan()]);
      toast.success("Mahasiswa berhasil ditempatkan ke kamar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menempatkan mahasiswa");
    } finally {
      setBusy(false);
    }
  }

  type Row = Record<string, unknown>;
  const unplacedColumns: DataColumn<Row>[] = [
    { key: "nim", label: "NIM", render: (r) => String((r.user as MahasiswaRow["user"])?.nim_nip ?? "-") },
    { key: "nama", label: "Nama", render: (r) => String((r.user as MahasiswaRow["user"])?.nama ?? "-") },
    { key: "prodi", label: "Prodi", render: (r) => String((r.prodi as MahasiswaRow["prodi"])?.name ?? "-") },
    { key: "angkatan", label: "Angkatan" },
  ];

  const placedColumns: DataColumn<Row>[] = [
    { key: "nim", label: "NIM", render: (r) => String(r.mahasiswa ? (r.mahasiswa as PenempatanRow["mahasiswa"])?.user?.nim_nip : "-") },
    { key: "nama", label: "Nama", render: (r) => String((r.mahasiswa as PenempatanRow["mahasiswa"])?.user?.nama ?? "-") },
    { key: "kamar", label: "Kamar", render: (r) => String((r.kamar as PenempatanRow["kamar"])?.nomor_kamar ?? "-") },
  ];

  return (
    <div className="p-6 space-y-8">
      <PageHeader
        title="Penempatan Kamar"
        subtitle="Kelola penempatan mahasiswa ke kamar asrama"
        actions={
          unplacedStudents.length > 0 ? (
            <Button onClick={handleAutoAssignClick} disabled={busy}>Auto-Assign Semua</Button>
          ) : undefined
        }
      />

      <Card className="p-6">
        <h2 className="text-base font-semibold mb-4">Mahasiswa Belum Ditempatkan ({unplacedStudents.length})</h2>
        {unplacedStudents.length === 0 ? (
          <EmptyState title="Semua mahasiswa sudah ditempatkan" />
        ) : (
          <DataTable columns={unplacedColumns} data={unplacedStudents as unknown as Row[]} searchKeys={["angkatan"]} />
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold mb-4">Override Manual</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <FormField label="Pilih Mahasiswa">
            <select className={`${inputClass} w-full`} value={selectedMhs} onChange={(e) => setSelectedMhs(e.target.value)}>
              <option value="">-- Pilih Mahasiswa --</option>
              {unplacedStudents.map((u) => (
                <option key={u.id} value={u.id}>{u.user?.nama} ({u.user?.nim_nip})</option>
              ))}
            </select>
          </FormField>
          <FormField label="Pilih Kamar">
            <select className={`${inputClass} w-full`} value={selectedKamarId} onChange={(e) => setSelectedKamarId(e.target.value)}>
              <option value="">-- Pilih Kamar --</option>
              {availableRooms.map((k) => (
                <option key={k.id} value={k.id}>{k.nomor_kamar} ({k.tipe_kamar})</option>
              ))}
            </select>
          </FormField>
          <Button onClick={handleManualAssign} disabled={!selectedMhs || !selectedKamarId || busy}>Tempatkan</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold mb-4">Penghuni Terdaftar ({placedStudents.length})</h2>
        <DataTable columns={placedColumns} data={placedStudents as unknown as Row[]} emptyMessage="Belum ada penempatan" />
      </Card>

      <Modal open={showAutoModal} onClose={() => setShowAutoModal(false)} title="Konfirmasi Auto-Assign" width="max-w-2xl">
        <p className="text-sm text-muted mb-4">Rencana penempatan untuk {autoPreview.length} mahasiswa:</p>
        <ul className="text-sm space-y-1 mb-6">
          {autoPreview.map((item) => (
            <li key={item.mahasiswa_id}>{item.mahasiswa_nama} → Kamar {item.nomor_kamar}</li>
          ))}
        </ul>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setShowAutoModal(false)}>Batal</Button>
          <Button onClick={handleConfirmAutoAssign} disabled={busy}>Konfirmasi</Button>
        </div>
      </Modal>
    </div>
  );
}
