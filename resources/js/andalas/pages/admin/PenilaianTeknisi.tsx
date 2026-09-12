import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Tabs, DataTable, Button, Drawer } from "../../components/ui";
import { TechnicianAssessment } from "../../components/molecules/TechnicianAssessment";
import { PerformanceSummary } from "../../components/molecules/PerformanceSummary";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";
import { mapTicketStatus } from "../../lib/format";

type TiketRow = { id: string; nomor_tiket?: string; status?: string; teknisi?: { nama?: string }; penilaian?: unknown[] };
type Kuesioner = { pertanyaan?: Array<{ id: string; kode_pertanyaan: string; teks_pertanyaan: string; tipe_jawaban: string; bobot: number; skor_minimal: number; skor_maksimal: number; wajib: boolean }> };
type TeknisiStat = { teknisi_id: string; nama: string; nim_nip: string; rata_skor: number | null; total_tiket: number; total_penilaian: number };

export default function PenilaianTeknisi() {
  const { data: tiket, reload: reloadTiket } = useAndalasApi<TiketRow[]>("/api/andalas/tiket");
  const { data: kuesionerList } = useAndalasApi<Kuesioner[]>("/api/andalas/kuesioner");
  const { data: performance } = useAndalasApi<TeknisiStat[]>("/api/andalas/teknisi/performance");
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, { nilai_skor?: number }>>({});
  const [busy, setBusy] = useState(false);

  const kuesioner = kuesionerList?.find((k) => true);
  const belumDinilai = (tiket ?? []).filter((t) => t.status === "selesai" && !(t.penilaian?.length));

  async function submitPenilaian() {
    if (!selected) return;
    setBusy(true);
    try {
      await andalasApi.post(`/api/andalas/penilaian/${selected}`, { answers });
      toast.success("Penilaian berhasil disimpan.");
      setSelected(null);
      setAnswers({});
      await reloadTiket();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan penilaian");
    } finally {
      setBusy(false);
    }
  }

  const tiketCols = [
    { key: "nomor_tiket", label: "No. Tiket" },
    { key: "teknisi", label: "Teknisi", render: (r: TiketRow) => r.teknisi?.nama ?? "-" },
    { key: "status", label: "Status", render: (r: TiketRow) => mapTicketStatus(r.status ?? "") },
    { key: "aksi", label: "", render: (r: TiketRow) => <Button size="sm" onClick={() => setSelected(r.id)}>Nilai</Button> },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Penilaian Teknisi" subtitle="Kuesioner dinamis penilaian kinerja teknisi" />
      <Card>
        <Tabs tabs={["Tiket Belum Dinilai", "Rekap Performa"]} active={tab} onChange={setTab} />
        {tab === 0 ? (
          <DataTable columns={tiketCols as never} data={belumDinilai as never} emptyMessage="Semua tiket sudah dinilai" />
        ) : (
          <PerformanceSummary stats={performance ?? []} />
        )}
      </Card>
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Penilaian Kuesioner"
        footer={<div className="flex gap-2 justify-end"><Button variant="secondary" onClick={() => setSelected(null)}>Batal</Button><Button onClick={submitPenilaian} disabled={busy}>Simpan</Button></div>}>
        {kuesioner?.pertanyaan && (
          <TechnicianAssessment pertanyaan={kuesioner.pertanyaan} answers={answers} onChange={(id, val) => setAnswers({ ...answers, [id]: val })} />
        )}
      </Drawer>
    </div>
  );
}
