import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { PageHeader, Card, Tabs, DataTable, Button, Drawer } from "../../components/ui";
import { TechnicianAssessment, type KuesionerPertanyaan } from "../../components/molecules/TechnicianAssessment";
import { PerformanceSummary } from "../../components/molecules/PerformanceSummary";
import { store as penilaianStore } from "@/routes/andalas/penilaian";
import { mapTicketStatus } from "../../lib/format";

type TiketRow = { id: string; nomor_tiket?: string; status?: string; teknisi?: { nama?: string }; penilaian?: unknown[] };
type Kuesioner = { pertanyaan?: KuesionerPertanyaan[] };
type TeknisiStat = { teknisi_id: string; nama: string; nim_nip: string; rata_skor: number | null; total_tiket: number; total_penilaian: number };

export default function PenilaianTeknisi({ tiket = [], kuesioner = [], performance = [] }: { tiket?: TiketRow[]; kuesioner?: Kuesioner[]; performance?: TeknisiStat[] }) {
  const { data: formData, setData, post, processing, errors, reset } = useForm<{ answers: Record<string, { nilai_skor?: number; jawaban_teks?: string }> }>({ answers: {} });
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const activeKuesioner = kuesioner[0];
  const belumDinilai = tiket.filter((t) => t.status === "selesai" && !(t.penilaian?.length));

  function submitPenilaian() {
    if (!selected) return;
    post(penilaianStore.url({ id: selected }), {
      onSuccess: () => {
        setSelected(null);
        reset();
      },
    });
  }

  const tiketCols = [
    { key: "nomor_tiket", label: "No. Tiket" },
    { key: "teknisi", label: "Teknisi", render: (r: TiketRow) => r.teknisi?.nama ?? "-" },
    { key: "status", label: "Status", render: (r: TiketRow) => mapTicketStatus(r.status ?? "") },
    { key: "aksi", label: "", render: (r: TiketRow) => <Button size="sm" onClick={() => setSelected(r.id)}>Nilai</Button> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Penilaian Teknisi" subtitle="Kuesioner dinamis penilaian kinerja teknisi" />
      <Card className="p-4">
        <Tabs tabs={["Tiket Belum Dinilai", "Rekap Performa"]} active={tab} onChange={setTab} />
        {tab === 0 ? (
          <DataTable columns={tiketCols as never} data={belumDinilai as never} emptyMessage="Semua tiket sudah dinilai" />
        ) : (
          <PerformanceSummary stats={performance} />
        )}
      </Card>
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Penilaian Kuesioner"
        footer={<div className="flex gap-2 justify-end"><Button variant="secondary" onClick={() => setSelected(null)}>Batal</Button><Button onClick={submitPenilaian} disabled={processing}>Simpan</Button></div>}>
        {activeKuesioner?.pertanyaan && (
          <TechnicianAssessment pertanyaan={activeKuesioner.pertanyaan} answers={formData.answers} onChange={(id, val) => setData("answers", { ...formData.answers, [id]: val })} />
        )}
        {errors.answers && <p className="mt-3 text-sm text-error">{errors.answers}</p>}
      </Drawer>
    </div>
  );
}