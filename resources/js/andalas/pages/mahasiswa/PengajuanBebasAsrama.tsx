import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Button, FormField, inputClass } from "../../components/ui";
import { andalasApi } from "../../lib/api";

export default function PengajuanBebasAsrama() {
  const [alasan, setAlasan] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await andalasApi.post<{ nomor_pengajuan?: string }>("/api/andalas/pengajuan/bebas-asrama", { alasan });
      toast.success(`Pengajuan berhasil: ${res.nomor_pengajuan ?? ""}`);
      setAlasan("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengajukan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <PageHeader title="Pengajuan Bebas Asrama" subtitle="Ajukan surat keterangan bebas asrama" />
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Alasan">
            <textarea className={inputClass} rows={4} value={alasan} onChange={(e) => setAlasan(e.target.value)} required />
          </FormField>
          <Button type="submit" disabled={busy}>Kirim Pengajuan</Button>
        </form>
      </Card>
    </div>
  );
}
