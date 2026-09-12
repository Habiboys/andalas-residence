import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Button, FormField, inputClass } from "../../components/ui";
import { andalasApi } from "../../lib/api";

export default function Checkin() {
  const [tanggal, setTanggal] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await andalasApi.post("/api/andalas/checkin", { tanggal_rencana_masuk: tanggal });
      toast.success("Check-in berhasil diajukan. Lanjutkan pembayaran untuk verifikasi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengajukan check-in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-lg">
      <PageHeader title="Proses Check-in" subtitle="Ajukan tanggal rencana masuk asrama" />
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Tanggal Rencana Masuk">
            <input type="date" className={inputClass} value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
          </FormField>
          <Button type="submit" disabled={busy}>{busy ? "Mengirim..." : "Ajukan Check-in"}</Button>
        </form>
      </Card>
    </div>
  );
}
