import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { PageHeader, Card, DataTable, Drawer, Button, Tabs, StatusBadge } from "../../components/ui";
import { verify as verifyPembayaran, bukti as buktiPembayaran } from "@/routes/andalas/pembayaran";
import { formatRupiah, mapPaymentStatus } from "../../lib/format";

type PembayaranRow = {
  id: string;
  jenis_pembayaran?: string;
  nominal?: number;
  status?: string;
  created_at?: string;
  bukti_transfer_path?: string | null;
  mahasiswa?: { user?: { nim_nip?: string; nama?: string } };
};

export default function VerifikasiPembayaran({ pembayaran = [] }: { pembayaran?: PembayaranRow[] }) {
  const [activeTab, setActiveTab] = useState(0);
  const [selected, setSelected] = useState<PembayaranRow | null>(null);
  const { data, setData, post, processing, errors, reset, transform } = useForm({ catatan_verifikasi: "" });

  const filtered = pembayaran.filter((p) => {
    if (activeTab === 1) return p.status === "menunggu_verifikasi";
    if (activeTab === 2) return p.status === "lunas";
    return true;
  });

  function verify(status: "lunas" | "ditolak") {
    if (!selected) return;
    transform((d) => ({ ...d, status }));
    post(verifyPembayaran.url({ pembayaran: selected.id }), {
      onSuccess: () => {
        setSelected(null);
        reset();
      },
    });
  }

  const columns = [
    { key: "nim", label: "NIM", render: (r: PembayaranRow) => r.mahasiswa?.user?.nim_nip ?? "-" },
    { key: "nama", label: "Nama", render: (r: PembayaranRow) => r.mahasiswa?.user?.nama ?? "-" },
    { key: "jenis_pembayaran", label: "Jenis" },
    { key: "nominal", label: "Jumlah", render: (r: PembayaranRow) => formatRupiah(Number(r.nominal ?? 0)) },
    { key: "status", label: "Status", render: (r: PembayaranRow) => <StatusBadge status={mapPaymentStatus(r.status ?? "")} /> },
    { key: "aksi", label: "", render: (r: PembayaranRow) => r.status === "menunggu_verifikasi" ? <Button size="sm" onClick={() => setSelected(r)}>Review</Button> : null },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Verifikasi Pembayaran" subtitle="Tinjau bukti transfer mahasiswa" />
      <Card className="p-4">
        <Tabs tabs={["Semua", "Pending", "Lunas"]} active={activeTab} onChange={setActiveTab} />
        <DataTable columns={columns as never} data={filtered as never} emptyMessage="Tidak ada data pembayaran" />
      </Card>
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Verifikasi Pembayaran"
        footer={<div className="flex gap-2 justify-end"><Button variant="secondary" onClick={() => setSelected(null)}>Batal</Button><Button variant="secondary" onClick={() => verify("ditolak")} disabled={processing}>Tolak</Button><Button onClick={() => verify("lunas")} disabled={processing}>Verifikasi</Button></div>}>
        {selected && (
          <div className="space-y-3 text-sm">
            <p><strong>Mahasiswa:</strong> {selected.mahasiswa?.user?.nama}</p>
            <p><strong>Nominal:</strong> {formatRupiah(Number(selected.nominal ?? 0))}</p>
            {selected.bukti_transfer_path && (
              <div>
                <p className="font-medium mb-1">Bukti Transfer:</p>
                <a
                  href={buktiPembayaran.url({ pembayaran: selected.id })}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline text-sm"
                >
                  Lihat bukti pembayaran
                </a>
              </div>
            )}
            <textarea className="textarea w-full" rows={3} placeholder="Catatan verifikasi" value={data.catatan_verifikasi} onChange={(e) => setData("catatan_verifikasi", e.target.value)} />
            {errors.catatan_verifikasi && <p className="mt-1 text-sm text-error">{errors.catatan_verifikasi}</p>}
          </div>
        )}
      </Drawer>
    </div>
  );
}