import { useForm } from "@inertiajs/react";
import { PageHeader, Card, Button, FormField, inputClass } from "../../components/ui";
import { store as laporanStore } from "@/routes/andalas/laporan";

export default function LaporKerusakan() {
  const { data, setData, post, processing, errors, reset } = useForm({ deskripsi: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post(laporanStore.url(), {
      onSuccess: () => reset(),
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader title="Laporkan Kerusakan" subtitle="Buat tiket laporan kerusakan fasilitas/kamar" />
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Deskripsi Kerusakan">
            <textarea className={inputClass} rows={5} value={data.deskripsi} onChange={(e) => setData("deskripsi", e.target.value)} required placeholder="Jelaskan kerusakan secara detail..." />
            {errors.deskripsi && <p className="mt-1 text-sm text-error">{errors.deskripsi}</p>}
          </FormField>
          <Button type="submit" disabled={processing}>{processing ? "Mengirim..." : "Kirim Laporan"}</Button>
        </form>
      </Card>
    </div>
  );
}