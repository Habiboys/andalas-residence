import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { PageHeader, Card, StatusBadge, Table, Button, FormField, inputClass } from "../../components/ui";
import { store as pembayaranStore } from "@/routes/andalas/pembayaran";
import { formatRupiah, mapPaymentStatus } from "../../lib/format";
import { useAuth } from "../../context/AppContext";

type PembayaranRow = {
  id: string;
  jenis_pembayaran?: string;
  nominal?: number;
  metode_pembayaran?: string;
  status?: string;
  created_at?: string;
  termin_ke?: number;
};

export default function Tagihan({ pembayaran = [] }: { pembayaran?: PembayaranRow[] }) {
  const { currentUser } = useAuth();
  const rows = pembayaran;
  const [showForm, setShowForm] = useState(false);
  const { data, setData, post, processing, errors, reset } = useForm({
    jenis_pembayaran: "sewa_asrama",
    nominal: "1500000",
    termin_ke: "1",
    atas_nama_pengirim: "",
    bukti_transfer: null as File | null,
  });

  const totalTagihan = rows.reduce((acc, p) => acc + Number(p.nominal ?? 0), 0);
  const totalLunas = rows.filter((p) => p.status === "lunas").reduce((acc, p) => acc + Number(p.nominal ?? 0), 0);
  const totalPending = rows.filter((p) => p.status === "menunggu_verifikasi").reduce((acc, p) => acc + Number(p.nominal ?? 0), 0);

  function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    post(pembayaranStore.url(), {
      onSuccess: () => {
        setShowForm(false);
        reset();
      },
    });
  }

  const columns = [
    { key: "termin", label: "Termin", render: (r: PembayaranRow) => `Termin ${r.termin_ke ?? 1}` },
    { key: "jenis_pembayaran", label: "Jenis" },
    { key: "nominal", label: "Jumlah", render: (r: PembayaranRow) => formatRupiah(Number(r.nominal ?? 0)) },
    { key: "metode_pembayaran", label: "Metode" },
    { key: "status", label: "Status", render: (r: PembayaranRow) => <StatusBadge status={mapPaymentStatus(r.status ?? "")} /> },
    { key: "created_at", label: "Tanggal", render: (r: PembayaranRow) => String(r.created_at ?? "").slice(0, 10) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tagihan & Pembayaran"
        subtitle="Ajukan pembayaran biaya hunian, diverifikasi admin"
        actions={<Button onClick={() => setShowForm(!showForm)}>{showForm ? "Tutup Form" : "Ajukan Pembayaran"}</Button>}
      />

      {showForm && (
        <Card className="p-6 mb-6">
          <h3 className="font-semibold mb-4">Form Pengajuan Pembayaran</h3>
          <p className="mb-4 text-sm text-muted">Integrasi VA akan ditambahkan. Saat ini admin akan memverifikasi pembayaran Anda.</p>
          <form onSubmit={submitPayment} className="grid md:grid-cols-2 gap-4">
            <FormField label="Jenis Pembayaran">
              <select className={inputClass} value={data.jenis_pembayaran} onChange={(e) => setData("jenis_pembayaran", e.target.value)}>
                <option value="sewa_asrama">Sewa Asrama</option>
                <option value="cicilan">Cicilan</option>
                <option value="denda_kerusakan">Denda Kerusakan</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </FormField>
            <FormField label="Termin"><input type="number" min={1} className={inputClass} value={data.termin_ke} onChange={(e) => setData("termin_ke", e.target.value)} /></FormField>
            <FormField label="Nominal (Rp)"><input type="number" className={inputClass} value={data.nominal} onChange={(e) => setData("nominal", e.target.value)} required />
              {errors.nominal && <p className="mt-1 text-sm text-error">{errors.nominal}</p>}
            </FormField>
            <FormField label="Atas Nama / Catatan"><input className={inputClass} value={data.atas_nama_pengirim} onChange={(e) => setData("atas_nama_pengirim", e.target.value)} /></FormField>
            <FormField label="Bukti Transfer (opsional)">
              <input type="file" accept="image/*,.pdf" onChange={(e) => setData("bukti_transfer", e.target.files?.[0] ?? null)} className="file-input w-full" />
              {errors.bukti_transfer && <p className="mt-1 text-sm text-error">{errors.bukti_transfer}</p>}
            </FormField>
            <div className="md:col-span-2"><Button type="submit" disabled={processing}>{processing ? "Mengirim..." : "Kirim Pengajuan"}</Button></div>
          </form>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="mb-1 text-xs uppercase text-muted">Total Tagihan</p><p className="text-lg font-bold">{formatRupiah(totalTagihan)}</p></Card>
        <Card className="p-4"><p className="mb-1 text-xs uppercase text-muted">Total Lunas</p><p className="text-lg font-bold text-success">{formatRupiah(totalLunas)}</p></Card>
        <Card className="p-4"><p className="mb-1 text-xs uppercase text-muted">Menunggu Verifikasi</p><p className="text-lg font-bold text-warning">{formatRupiah(totalPending)}</p></Card>
      </div>
      <Card>
        <div className="border-b border-base-300 px-5 py-4"><h2 className="text-sm font-semibold">Daftar Pembayaran</h2><p className="text-xs text-muted">NIM {currentUser?.nim}</p></div>
        <Table columns={columns} data={rows} emptyMessage="Belum ada riwayat pembayaran" />
      </Card>
    </div>
  );
}