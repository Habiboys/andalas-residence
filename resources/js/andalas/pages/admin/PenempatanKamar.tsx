import { useEffect, useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import { PageHeader, Card, Button, Modal, FormField, inputClass, DataTable, type DataColumn, EmptyState } from "../../components/ui";
import { preview as autoPlacementPreview, commit as autoPlacementCommit } from "@/routes/andalas/auto-placement";
import { manual as penempatanManual } from "@/routes/andalas/penempatan";

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

type AutoPreviewResult = {
  assigned: number;
  skipped: string[];
  preview?: PreviewItem[];
};

type KamarOption = {
  id: string;
  nomor_kamar: string;
  kapasitas: number;
  status: string;
  tipe_kamar?: string;
  penempatan_kamar?: unknown[];
};

type GedungShape = {
  lantai?: Array<{ kamar?: KamarOption[] }>;
};

export default function PenempatanKamar({ mahasiswa = [], penempatan = [], gedung = [], auto_preview = null }: { mahasiswa?: MahasiswaRow[]; penempatan?: PenempatanRow[]; gedung?: GedungShape[]; auto_preview?: AutoPreviewResult | null }) {
  const { data: manualData, setData: setManualData, post: postManual, processing: manualProcessing, errors: manualErrors } = useForm({ mahasiswa_id: "", kamar_id: "" });
  const previewForm = useForm<Record<string, string>>({});
  const commitForm = useForm<Record<string, string>>({});

  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoPreview, setAutoPreview] = useState<PreviewItem[]>([]);

  const placedIds = new Set(penempatan.map((p) => p.mahasiswa?.id).filter(Boolean));
  const unplacedStudents = mahasiswa.filter((m) => m.status_huni === "calon" || !placedIds.has(m.id));
  const placedStudents = penempatan;

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

  useEffect(() => {
    if (auto_preview) {
      setAutoPreview(auto_preview.preview ?? []);
      setShowAutoModal(true);
    } else {
      setShowAutoModal(false);
    }
  }, [auto_preview]);

  function handleAutoAssignClick() {
    previewForm.post(autoPlacementPreview.url());
  }

  function handleConfirmAutoAssign() {
    commitForm.post(autoPlacementCommit.url());
  }

  function handleManualAssign() {
    if (!manualData.mahasiswa_id || !manualData.kamar_id) return;
    postManual(penempatanManual.url(), {
      onSuccess: () => {
        setManualData({ mahasiswa_id: "", kamar_id: "" });
      },
    });
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
    <div className="space-y-8">
      <PageHeader
        title="Penempatan Kamar"
        subtitle="Kelola penempatan mahasiswa ke kamar asrama"
        actions={
          unplacedStudents.length > 0 ? (
            <Button onClick={handleAutoAssignClick} disabled={previewForm.processing}>Auto-Assign Semua</Button>
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
            <select className={`${inputClass} w-full`} value={manualData.mahasiswa_id} onChange={(e) => setManualData("mahasiswa_id", e.target.value)}>
              <option value="">-- Pilih Mahasiswa --</option>
              {unplacedStudents.map((u) => (
                <option key={u.id} value={u.id}>{u.user?.nama} ({u.user?.nim_nip})</option>
              ))}
            </select>
            {manualErrors.mahasiswa_id && <p className="mt-1 text-sm text-error">{manualErrors.mahasiswa_id}</p>}
          </FormField>
          <FormField label="Pilih Kamar">
            <select className={`${inputClass} w-full`} value={manualData.kamar_id} onChange={(e) => setManualData("kamar_id", e.target.value)}>
              <option value="">-- Pilih Kamar --</option>
              {availableRooms.map((k) => (
                <option key={k.id} value={k.id}>{k.nomor_kamar} ({k.tipe_kamar})</option>
              ))}
            </select>
            {manualErrors.kamar_id && <p className="mt-1 text-sm text-error">{manualErrors.kamar_id}</p>}
          </FormField>
          <Button onClick={handleManualAssign} disabled={!manualData.mahasiswa_id || !manualData.kamar_id || manualProcessing}>Tempatkan</Button>
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
          <Button onClick={handleConfirmAutoAssign} disabled={commitForm.processing}>Konfirmasi</Button>
        </div>
      </Modal>
    </div>
  );
}