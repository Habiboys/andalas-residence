import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { PageHeader, Card, FormField, inputClass, Button, StatusBadge } from "../../components/ui";
import { mapTicketStatus } from "../../lib/format";
import { update as tiketUpdate } from "@/routes/andalas/tiket";

type TiketRow = { id: string; nomor_tiket?: string; deskripsi?: string; status?: string };

type Props = {
  tiket: TiketRow[];
};

export default function UpdateTiket({ tiket = [] }: Props) {
  const [selected, setSelected] = useState("");
  const { data, setData, put, processing, errors } = useForm({ status: "sedang_dikerjakan", catatan_penyelesaian: "" });

  const aktif = tiket.filter((t) => !["selesai", "dibatalkan"].includes(t.status ?? ""));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    put(tiketUpdate.url({ laporan: selected }), {
      onSuccess: () => {
        setSelected("");
        setData("catatan_penyelesaian", "");
      },
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Update Tiket" subtitle="Perbarui status pengerjaan tiket" />
      <Card className="p-6 mb-4 space-y-2">
        {aktif.map((t) => (
          <button key={t.id} type="button" onClick={() => setSelected(t.id)} className={`w-full text-left border rounded p-3 text-sm ${selected === t.id ? "border-accent bg-accent/5" : ""}`}>
            <div className="flex justify-between"><strong>{t.nomor_tiket}</strong><StatusBadge status={mapTicketStatus(t.status ?? "")} /></div>
            <p className="text-muted mt-1">{t.deskripsi}</p>
          </button>
        ))}
      </Card>
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Status">
            <select className={inputClass} value={data.status} onChange={(e) => setData("status", e.target.value)}>
              <option value="sedang_dikerjakan">Sedang Dikerjakan</option>
              <option value="selesai">Selesai</option>
              <option value="dibatalkan">Dibatalkan</option>
            </select>
            {errors.status && <p className="mt-1 text-sm text-error">{errors.status}</p>}
          </FormField>
          <FormField label="Catatan"><textarea className={inputClass} rows={3} value={data.catatan_penyelesaian} onChange={(e) => setData("catatan_penyelesaian", e.target.value)} />
            {errors.catatan_penyelesaian && <p className="mt-1 text-sm text-error">{errors.catatan_penyelesaian}</p>}
          </FormField>
          <Button type="submit" disabled={!selected || processing}>Simpan Update</Button>
        </form>
      </Card>
    </div>
  );
}