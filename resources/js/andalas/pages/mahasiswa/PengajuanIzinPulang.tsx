import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Button, FormField, inputClass } from "../../components/ui";
import { andalasApi } from "../../lib/api";

export default function PengajuanIzinPulang() {
  const [form, setForm] = useState({ tanggal_mulai: "", tanggal_kembali: "", alasan: "", tujuan_alamat: "", kontak_darurat: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await andalasApi.post("/api/andalas/pengajuan/izin-pulang", form);
      toast.success("Pengajuan izin pulang berhasil dikirim.");
      setForm({ tanggal_mulai: "", tanggal_kembali: "", alasan: "", tujuan_alamat: "", kontak_darurat: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengajukan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <PageHeader title="Pengajuan Izin Pulang" subtitle="Form izin keluar asrama sementara" />
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Tanggal Mulai"><input type="date" className={inputClass} value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} required /></FormField>
          <FormField label="Tanggal Kembali"><input type="date" className={inputClass} value={form.tanggal_kembali} onChange={(e) => setForm({ ...form, tanggal_kembali: e.target.value })} required /></FormField>
          <FormField label="Alasan"><textarea className={inputClass} rows={3} value={form.alasan} onChange={(e) => setForm({ ...form, alasan: e.target.value })} required /></FormField>
          <FormField label="Tujuan"><input className={inputClass} value={form.tujuan_alamat} onChange={(e) => setForm({ ...form, tujuan_alamat: e.target.value })} /></FormField>
          <FormField label="Kontak Darurat"><input className={inputClass} value={form.kontak_darurat} onChange={(e) => setForm({ ...form, kontak_darurat: e.target.value })} /></FormField>
          <Button type="submit" disabled={busy}>Kirim Pengajuan</Button>
        </form>
      </Card>
    </div>
  );
}
