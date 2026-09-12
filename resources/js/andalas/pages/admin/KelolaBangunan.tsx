import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Button, Drawer, FormField, inputClass, CardSkeleton, ConfirmDialog } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";

type Gedung = {
  id: string;
  kode_gedung?: string;
  nama_gedung?: string;
  gender_peruntukan?: string;
  alamat?: string;
  deskripsi?: string;
  foto?: string;
  lantai?: Array<{ id: string; nama_lantai?: string; nomor_lantai?: number; kamar?: Kamar[] }>;
};
type Kamar = { id: string; nomor_kamar?: string; kapasitas?: number; status?: string; tipe_kamar?: string };

export default function KelolaBangunan() {
  const { data, loading, reload } = useAndalasApi<Gedung[]>("/api/andalas/gedung");
  const [gedungModal, setGedungModal] = useState(false);
  const [lantaiModal, setLantaiModal] = useState<string | null>(null);
  const [kamarModal, setKamarModal] = useState<string | null>(null);
  const [gedungForm, setGedungForm] = useState({ kode_gedung: "", nama_gedung: "", gender_peruntukan: "laki_laki", alamat: "", deskripsi: "" });
  const [gedungFile, setGedungFile] = useState<File | null>(null);
  const [gedungPreview, setGedungPreview] = useState<string | null>(null);
  const [lantaiForm, setLantaiForm] = useState({ nomor_lantai: "1", nama_lantai: "" });
  const [kamarForm, setKamarForm] = useState({ nomor_kamar: "", kapasitas: "2", tipe_kamar: "reguler", status: "kosong", tarif_per_periode: "1500000" });
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  async function saveGedung(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("kode_gedung", gedungForm.kode_gedung);
      fd.append("nama_gedung", gedungForm.nama_gedung);
      fd.append("gender_peruntukan", gedungForm.gender_peruntukan);
      fd.append("alamat", gedungForm.alamat);
      fd.append("deskripsi", gedungForm.deskripsi);
      if (gedungFile) fd.append("foto", gedungFile);
      await andalasApi.post("/api/andalas/gedung", fd);
      setGedungModal(false);
      resetGedungForm();
      await reload();
      toast.success("Gedung berhasil ditambahkan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan gedung");
    } finally {
      setBusy(false);
    }
  }

  function resetGedungForm() {
    setGedungForm({ kode_gedung: "", nama_gedung: "", gender_peruntukan: "laki_laki", alamat: "", deskripsi: "" });
    setGedungFile(null);
    setGedungPreview(null);
  }

  async function saveLantai(e: React.FormEvent) {
    e.preventDefault();
    if (!lantaiModal) return;
    setBusy(true);
    try {
      await andalasApi.post("/api/andalas/lantai", { ...lantaiForm, gedung_id: lantaiModal, nomor_lantai: Number(lantaiForm.nomor_lantai) });
      setLantaiModal(null);
      await reload();
      toast.success("Lantai berhasil ditambahkan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan lantai");
    } finally {
      setBusy(false);
    }
  }

  async function saveKamar(e: React.FormEvent) {
    e.preventDefault();
    if (!kamarModal) return;
    setBusy(true);
    try {
      await andalasApi.post("/api/andalas/kamar", {
        ...kamarForm,
        lantai_id: kamarModal,
        kapasitas: Number(kamarForm.kapasitas),
        tarif_per_periode: Number(kamarForm.tarif_per_periode),
      });
      setKamarModal(null);
      await reload();
      toast.success("Kamar berhasil ditambahkan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan kamar");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await andalasApi.delete(`/api/andalas/gedung/${deleting}`);
      toast.success("Gedung berhasil dihapus.");
      setDeleting(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus gedung");
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Kelola Bangunan"
        subtitle="Tambah gedung, lantai, dan kamar"
        actions={<Button onClick={() => setGedungModal(true)}>Tambah Gedung</Button>}
      />
      {loading && <CardSkeleton items={3} />}
      {(data ?? []).map((g) => (
        <Card key={g.id} className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="flex gap-4">
              {g.foto && (
                <img src={`/storage/${g.foto}`} alt={g.nama_gedung} className="w-24 h-20 object-cover rounded-lg flex-shrink-0" />
              )}
              <div>
                <h3 className="font-semibold text-primary">{g.nama_gedung} ({g.kode_gedung})</h3>
                <p className="text-sm text-muted capitalize">Peruntukan: {g.gender_peruntukan?.replace("_", " ")}</p>
                {g.alamat && <p className="text-sm text-muted">{g.alamat}</p>}
                {g.deskripsi && <p className="text-sm text-muted line-clamp-2 mt-1">{g.deskripsi}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setLantaiModal(g.id)}>+ Lantai</Button>
              <Button size="sm" variant="danger" onClick={() => setDeleting(g.id)}>Hapus</Button>
            </div>
          </div>
          <ul className="text-sm space-y-2">
            {(g.lantai ?? []).map((l) => (
              <li key={l.id} className="rounded-box border border-base-300 bg-base-200 p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{l.nama_lantai ?? `Lantai ${l.nomor_lantai}`}</span>
                  <Button size="sm" variant="secondary" onClick={() => setKamarModal(l.id)}>+ Kamar</Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(l.kamar ?? []).map((k) => (
                    <span key={k.id} className="text-xs bg-base-200 px-2 py-1 rounded">
                      {k.nomor_kamar} ({k.status})
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Drawer
        open={gedungModal}
        onClose={() => setGedungModal(false)}
        title="Tambah Gedung"
        width="w-full max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setGedungModal(false); resetGedungForm(); }}>Batal</Button>
            <Button type="submit" form="gedung-form" disabled={busy}>Simpan</Button>
          </div>
        }
      >
        <form id="gedung-form" onSubmit={saveGedung} className="space-y-3">
          <FormField label="Kode Gedung"><input className={inputClass} value={gedungForm.kode_gedung} onChange={(e) => setGedungForm({ ...gedungForm, kode_gedung: e.target.value })} required /></FormField>
          <FormField label="Nama Gedung"><input className={inputClass} value={gedungForm.nama_gedung} onChange={(e) => setGedungForm({ ...gedungForm, nama_gedung: e.target.value })} required /></FormField>
          <FormField label="Peruntukan">
            <select className={inputClass} value={gedungForm.gender_peruntukan} onChange={(e) => setGedungForm({ ...gedungForm, gender_peruntukan: e.target.value })}>
              <option value="laki_laki">Laki-laki</option>
              <option value="perempuan">Perempuan</option>
              <option value="campuran">Campuran</option>
            </select>
          </FormField>
          <FormField label="Alamat"><input className={inputClass} value={gedungForm.alamat} onChange={(e) => setGedungForm({ ...gedungForm, alamat: e.target.value })} placeholder="Alamat gedung / lokasi" /></FormField>
          <FormField label="Deskripsi">
            <textarea rows={4} className={inputClass} value={gedungForm.deskripsi} onChange={(e) => setGedungForm({ ...gedungForm, deskripsi: e.target.value })} placeholder="Deskripsi singkat gedung" />
          </FormField>
          <FormField label="Foto Gedung">
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                className={inputClass}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setGedungFile(f);
                  setGedungPreview(f ? URL.createObjectURL(f) : null);
                }}
              />
              {gedungPreview && <img src={gedungPreview} alt="Pratinjau" className="w-16 h-14 object-cover rounded-md flex-shrink-0" />}
            </div>
          </FormField>
        </form>
      </Drawer>

      <Drawer
        open={!!lantaiModal}
        onClose={() => setLantaiModal(null)}
        title="Tambah Lantai"
        width="w-full max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setLantaiModal(null)}>Batal</Button>
            <Button type="submit" form="lantai-form" disabled={busy}>Simpan</Button>
          </div>
        }
      >
        <form id="lantai-form" onSubmit={saveLantai} className="space-y-3">
          <FormField label="Nomor Lantai"><input type="number" className={inputClass} value={lantaiForm.nomor_lantai} onChange={(e) => setLantaiForm({ ...lantaiForm, nomor_lantai: e.target.value })} required /></FormField>
          <FormField label="Nama Lantai"><input className={inputClass} value={lantaiForm.nama_lantai} onChange={(e) => setLantaiForm({ ...lantaiForm, nama_lantai: e.target.value })} required /></FormField>
        </form>
      </Drawer>

      <Drawer
        open={!!kamarModal}
        onClose={() => setKamarModal(null)}
        title="Tambah Kamar"
        width="w-full max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setKamarModal(null)}>Batal</Button>
            <Button type="submit" form="kamar-form" disabled={busy}>Simpan</Button>
          </div>
        }
      >
        <form id="kamar-form" onSubmit={saveKamar} className="space-y-3">
          <FormField label="Nomor Kamar"><input className={inputClass} value={kamarForm.nomor_kamar} onChange={(e) => setKamarForm({ ...kamarForm, nomor_kamar: e.target.value })} required /></FormField>
          <FormField label="Kapasitas"><input type="number" className={inputClass} value={kamarForm.kapasitas} onChange={(e) => setKamarForm({ ...kamarForm, kapasitas: e.target.value })} required /></FormField>
          <FormField label="Tipe Kamar">
            <select className={inputClass} value={kamarForm.tipe_kamar} onChange={(e) => setKamarForm({ ...kamarForm, tipe_kamar: e.target.value })}>
              <option value="reguler">Reguler</option>
              <option value="vip">VIP</option>
            </select>
          </FormField>
          <FormField label="Status">
            <select className={inputClass} value={kamarForm.status} onChange={(e) => setKamarForm({ ...kamarForm, status: e.target.value })}>
              <option value="kosong">Kosong</option>
              <option value="terisi_sebagian">Terisi Sebagian</option>
              <option value="penuh">Penuh</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </FormField>
          <FormField label="Tarif per Periode"><input type="number" className={inputClass} value={kamarForm.tarif_per_periode} onChange={(e) => setKamarForm({ ...kamarForm, tarif_per_periode: e.target.value })} /></FormField>
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingBusy}
        title="Hapus Gedung"
        message="Hapus gedung beserta seluruh lantai dan kamarnya? Tindakan ini tidak dapat dibatalkan."
      />
    </div>
  );
}
