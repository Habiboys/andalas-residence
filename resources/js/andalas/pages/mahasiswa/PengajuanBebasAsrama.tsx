import { useForm } from "@inertiajs/react";
import { PageHeader, Card, Button, FormField, inputClass } from "../../components/ui";
import { bebas as bebasRoute } from "@/routes/andalas/pengajuan";

export default function PengajuanBebasAsrama() {
  const { data, setData, post, processing, errors, reset } = useForm({ alasan: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post(bebasRoute.url(), {
      onSuccess: () => reset(),
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader title="Pengajuan Bebas Asrama" subtitle="Ajukan surat keterangan bebas asrama" />
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Alasan">
            <textarea className={inputClass} rows={4} value={data.alasan} onChange={(e) => setData("alasan", e.target.value)} required />
            {errors.alasan && <p className="mt-1 text-sm text-error">{errors.alasan}</p>}
          </FormField>
          <Button type="submit" disabled={processing}>{processing ? "Mengirim..." : "Kirim Pengajuan"}</Button>
        </form>
      </Card>
    </div>
  );
}