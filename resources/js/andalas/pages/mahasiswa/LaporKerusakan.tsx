import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Button, FormField, inputClass } from "../../components/ui";
import { andalasApi } from "../../lib/api";

export default function LaporKerusakan() {
  const [deskripsi, setDeskripsi] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await andalasApi.post<{ nomor_tiket?: string }>("/api/andalas/laporan-kerusakan", { deskripsi });
      toast.success(`Tiket ${res.nomor_tiket ?? ""} berhasil dibuat.`);
      setDeskripsi("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal melaporkan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <PageHeader title="Laporkan Kerusakan" subtitle="Buat tiket laporan kerusakan fasilitas/kamar" />
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Deskripsi Kerusakan">
            <textarea className={inputClass} rows={5} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} required placeholder="Jelaskan kerusakan secara detail..." />
          </FormField>
          <Button type="submit" disabled={busy}>Kirim Laporan</Button>
        </form>
      </Card>
    </div>
  );
}
