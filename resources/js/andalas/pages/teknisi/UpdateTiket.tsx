import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, FormField, inputClass, Button, StatusBadge } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";
import { mapTicketStatus } from "../../lib/format";

type TiketRow = { id: string; nomor_tiket?: string; deskripsi?: string; status?: string };

export default function UpdateTiket() {
  const { data, reload } = useAndalasApi<TiketRow[]>("/api/andalas/tiket");
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("sedang_dikerjakan");
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);

  const aktif = (data ?? []).filter((t) => !["selesai", "dibatalkan"].includes(t.status ?? ""));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await andalasApi.put(`/api/andalas/tiket/${selected}`, { status, catatan_penyelesaian: catatan });
      toast.success("Tiket berhasil diperbarui.");
      setSelected("");
      setCatatan("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memperbarui tiket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
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
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="sedang_dikerjakan">Sedang Dikerjakan</option>
              <option value="selesai">Selesai</option>
              <option value="dibatalkan">Dibatalkan</option>
            </select>
          </FormField>
          <FormField label="Catatan"><textarea className={inputClass} rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} /></FormField>
          <Button type="submit" disabled={!selected || busy}>Simpan Update</Button>
        </form>
      </Card>
    </div>
  );
}
