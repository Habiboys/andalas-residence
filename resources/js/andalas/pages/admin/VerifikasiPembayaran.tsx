import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, DataTable, Drawer, Button, Tabs, StatusBadge } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";
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

export default function VerifikasiPembayaran() {
  const { data, reload } = useAndalasApi<PembayaranRow[]>("/api/andalas/pembayaran");
  const [activeTab, setActiveTab] = useState(0);
  const [selected, setSelected] = useState<PembayaranRow | null>(null);
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = data ?? [];
  const filtered = rows.filter((p) => {
    if (activeTab === 1) return p.status === "menunggu_verifikasi";
    if (activeTab === 2) return p.status === "lunas";
    return true;
  });

  async function verify(status: "lunas" | "ditolak") {
    if (!selected) return;
    setBusy(true);
    try {
      await andalasApi.post(`/api/andalas/pembayaran/${selected.id}/verify`, { status, catatan_verifikasi: catatan });
      toast.success(status === "lunas" ? "Pembayaran disetujui / ditandai lunas." : "Pembayaran ditolak.");
      setSelected(null);
      setCatatan("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memverifikasi pembayaran");
    } finally {
      setBusy(false);
    }
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
    <div className="p-6">
      <PageHeader title="Verifikasi Pembayaran" subtitle="Tinjau bukti transfer mahasiswa" />
      <Card>
        <Tabs tabs={["Semua", "Pending", "Lunas"]} active={activeTab} onChange={setActiveTab} />
        <DataTable columns={columns as never} data={filtered as never} emptyMessage="Tidak ada data pembayaran" />
      </Card>
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Verifikasi Pembayaran"
        footer={<div className="flex gap-2 justify-end"><Button variant="secondary" onClick={() => setSelected(null)}>Batal</Button><Button variant="secondary" onClick={() => verify("ditolak")} disabled={busy}>Tolak</Button><Button onClick={() => verify("lunas")} disabled={busy}>Verifikasi</Button></div>}>
        {selected && (
          <div className="space-y-3 text-sm">
            <p><strong>Mahasiswa:</strong> {selected.mahasiswa?.user?.nama}</p>
            <p><strong>Nominal:</strong> {formatRupiah(Number(selected.nominal ?? 0))}</p>
            {selected.bukti_transfer_path && (
              <div>
                <p className="font-medium mb-1">Bukti Transfer:</p>
                <a
                  href={`/api/andalas/pembayaran/${selected.id}/bukti`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline text-sm"
                >
                  Lihat bukti pembayaran
                </a>
              </div>
            )}
            <textarea className="textarea w-full" rows={3} placeholder="Catatan verifikasi" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </div>
        )}
      </Drawer>
    </div>
  );
}
