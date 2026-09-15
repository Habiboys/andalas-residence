import { useForm } from "@inertiajs/react";
import { PageHeader, Card, Button, FormField, inputClass } from "../../components/ui";
import { store as checkinStore } from "@/routes/andalas/checkin";

export default function Checkin() {
  const { data, setData, post, processing, errors, reset } = useForm({ tanggal_rencana_masuk: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post(checkinStore.url(), {
      onSuccess: () => reset(),
    });
  }

  return (
    <div className="max-w-lg space-y-4">
      <PageHeader title="Proses Check-in" subtitle="Ajukan tanggal rencana masuk asrama" />
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Tanggal Rencana Masuk">
            <input type="date" className={inputClass} value={data.tanggal_rencana_masuk} onChange={(e) => setData("tanggal_rencana_masuk", e.target.value)} required />
            {errors.tanggal_rencana_masuk && <p className="mt-1 text-sm text-error">{errors.tanggal_rencana_masuk}</p>}
          </FormField>
          <Button type="submit" disabled={processing}>{processing ? "Mengirim..." : "Ajukan Check-in"}</Button>
        </form>
      </Card>
    </div>
  );
}