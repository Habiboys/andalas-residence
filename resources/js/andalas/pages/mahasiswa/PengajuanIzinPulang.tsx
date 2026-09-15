import { useForm } from "@inertiajs/react";
import { PageHeader, Card, Button, FormField, inputClass } from "../../components/ui";
import { izin as izinRoute } from "@/routes/andalas/pengajuan";

export default function PengajuanIzinPulang() {
  const { data, setData, post, processing, errors, reset } = useForm({
    tanggal_mulai: "",
    tanggal_kembali: "",
    alasan: "",
    tujuan_alamat: "",
    kontak_darurat: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post(izinRoute.url(), {
      onSuccess: () => reset(),
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader title="Pengajuan Izin Pulang" subtitle="Form izin keluar asrama sementara" />
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Tanggal Mulai"><input type="date" className={inputClass} value={data.tanggal_mulai} onChange={(e) => setData("tanggal_mulai", e.target.value)} required /></FormField>
          <FormField label="Tanggal Kembali"><input type="date" className={inputClass} value={data.tanggal_kembali} onChange={(e) => setData("tanggal_kembali", e.target.value)} required />
            {errors.tanggal_kembali && <p className="mt-1 text-sm text-error">{errors.tanggal_kembali}</p>}
          </FormField>
          <FormField label="Alasan"><textarea className={inputClass} rows={3} value={data.alasan} onChange={(e) => setData("alasan", e.target.value)} required />
            {errors.alasan && <p className="mt-1 text-sm text-error">{errors.alasan}</p>}
          </FormField>
          <FormField label="Tujuan"><input className={inputClass} value={data.tujuan_alamat} onChange={(e) => setData("tujuan_alamat", e.target.value)} /></FormField>
          <FormField label="Kontak Darurat"><input className={inputClass} value={data.kontak_darurat} onChange={(e) => setData("kontak_darurat", e.target.value)} /></FormField>
          <Button type="submit" disabled={processing}>{processing ? "Mengirim..." : "Kirim Pengajuan"}</Button>
        </form>
      </Card>
    </div>
  );
}