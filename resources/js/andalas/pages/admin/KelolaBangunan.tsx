import { useState } from "react";
import { useForm, router } from "@inertiajs/react";
import { PageHeader, Card, Button, Drawer, FormField, inputClass, ConfirmDialog, RowActions } from "../../components/ui";
import { store as gedungStore, destroy as gedungDestroy } from "@/routes/andalas/gedung";
import { store as lantaiStore } from "@/routes/andalas/lantai";
import { store as kamarStore } from "@/routes/andalas/kamar";

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

type Props = { gedung: Gedung[] };

const gedungDefaults = { kode_gedung: "", nama_gedung: "", gender_peruntukan: "laki_laki", alamat: "", deskripsi: "", foto: null as File | null };
const lantaiDefaults = { nomor_lantai: "1", nama_lantai: "" };
const kamarDefaults = { nomor_kamar: "", kapasitas: "2", tipe_kamar: "reguler", status: "kosong", tarif_per_periode: "1500000" };

export default function KelolaBangunan({ gedung }: Props) {
  const [gedungModal, setGedungModal] = useState(false);
  const [lantaiModal, setLantaiModal] = useState<string | null>(null);
  const [kamarModal, setKamarModal] = useState<string | null>(null);
  const [gedungPreview, setGedungPreview] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const gedungForm = useForm(gedungDefaults);
  const lantaiForm = useForm(lantaiDefaults);
  const kamarForm = useForm(kamarDefaults);

  function resetGedungForm() {
    gedungForm.resetAndClearErrors();
    setGedungPreview(null);
  }

  function saveGedung(e: React.FormEvent) {
    e.preventDefault();
    gedungForm.post(gedungStore.url(), {
      onSuccess: () => {
        setGedungModal(false);
        resetGedungForm();
      },
    });
  }

  function saveLantai(e: React.FormEvent) {
    e.preventDefault();
    if (!lantaiModal) return;
    lantaiForm.transform((form) => ({
      ...form,
      gedung_id: lantaiModal,
      nomor_lantai: Number(form.nomor_lantai),
    }));
    lantaiForm.post(lantaiStore.url(), { onSuccess: () => setLantaiModal(null) });
  }

  function saveKamar(e: React.FormEvent) {
    e.preventDefault();
    if (!kamarModal) return;
    kamarForm.transform((form) => ({
      ...form,
      lantai_id: kamarModal,
      kapasitas: Number(form.kapasitas),
      tarif_per_periode: Number(form.tarif_per_periode),
    }));
    kamarForm.post(kamarStore.url(), { onSuccess: () => setKamarModal(null) });
  }

  function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    router.delete(gedungDestroy.url({ id: deleting }), {
      onSuccess: () => setDeleting(null),
      onFinish: () => setDeletingBusy(false),
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kelola Bangunan"
        subtitle="Tambah gedung, lantai, dan kamar"
        actions={<Button onClick={() => setGedungModal(true)}>Tambah Gedung</Button>}
      />
      {(gedung ?? []).map((g) => (
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
              <RowActions onDelete={() => setDeleting(g.id)} />
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
            <Button type="button" variant="secondary" onClick={() => { setGedungModal(false); resetGedungForm(); }}>Batal</Button>
            <Button type="submit" form="gedung-form" disabled={gedungForm.processing}>{gedungForm.processing ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        }
      >
        <form id="gedung-form" onSubmit={saveGedung} className="space-y-3">
          <FormField label="Kode Gedung"><input className={inputClass} value={gedungForm.data.kode_gedung} onChange={(e) => gedungForm.setData("kode_gedung", e.target.value)} required /></FormField>
          {gedungForm.errors.kode_gedung && <p className="text-sm text-error">{gedungForm.errors.kode_gedung}</p>}
          <FormField label="Nama Gedung"><input className={inputClass} value={gedungForm.data.nama_gedung} onChange={(e) => gedungForm.setData("nama_gedung", e.target.value)} required /></FormField>
          {gedungForm.errors.nama_gedung && <p className="text-sm text-error">{gedungForm.errors.nama_gedung}</p>}
          <FormField label="Peruntukan">
            <select className={inputClass} value={gedungForm.data.gender_peruntukan} onChange={(e) => gedungForm.setData("gender_peruntukan", e.target.value)}>
              <option value="laki_laki">Laki-laki</option>
              <option value="perempuan">Perempuan</option>
              <option value="campuran">Campuran</option>
            </select>
            {gedungForm.errors.gender_peruntukan && <p className="text-sm text-error">{gedungForm.errors.gender_peruntukan}</p>}
          </FormField>
          <FormField label="Alamat"><input className={inputClass} value={gedungForm.data.alamat} onChange={(e) => gedungForm.setData("alamat", e.target.value)} placeholder="Alamat gedung / lokasi" /></FormField>
          <FormField label="Deskripsi">
            <textarea rows={4} className={inputClass} value={gedungForm.data.deskripsi} onChange={(e) => gedungForm.setData("deskripsi", e.target.value)} placeholder="Deskripsi singkat gedung" />
          </FormField>
          <FormField label="Foto Gedung">
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                className={inputClass}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  gedungForm.setData("foto", f);
                  setGedungPreview(f ? URL.createObjectURL(f) : null);
                }}
              />
              {gedungPreview && <img src={gedungPreview} alt="Pratinjau" className="w-16 h-14 object-cover rounded-md flex-shrink-0" />}
            </div>
            {gedungForm.errors.foto && <p className="text-sm text-error">{gedungForm.errors.foto}</p>}
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
            <Button type="button" variant="secondary" onClick={() => setLantaiModal(null)}>Batal</Button>
            <Button type="submit" form="lantai-form" disabled={lantaiForm.processing}>{lantaiForm.processing ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        }
      >
        <form id="lantai-form" onSubmit={saveLantai} className="space-y-3">
          <FormField label="Nomor Lantai"><input type="number" className={inputClass} value={lantaiForm.data.nomor_lantai} onChange={(e) => lantaiForm.setData("nomor_lantai", e.target.value)} required /></FormField>
          {lantaiForm.errors.nomor_lantai && <p className="text-sm text-error">{lantaiForm.errors.nomor_lantai}</p>}
          <FormField label="Nama Lantai"><input className={inputClass} value={lantaiForm.data.nama_lantai} onChange={(e) => lantaiForm.setData("nama_lantai", e.target.value)} required /></FormField>
          {lantaiForm.errors.nama_lantai && <p className="text-sm text-error">{lantaiForm.errors.nama_lantai}</p>}
        </form>
      </Drawer>

      <Drawer
        open={!!kamarModal}
        onClose={() => setKamarModal(null)}
        title="Tambah Kamar"
        width="w-full max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setKamarModal(null)}>Batal</Button>
            <Button type="submit" form="kamar-form" disabled={kamarForm.processing}>{kamarForm.processing ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        }
      >
        <form id="kamar-form" onSubmit={saveKamar} className="space-y-3">
          <FormField label="Nomor Kamar"><input className={inputClass} value={kamarForm.data.nomor_kamar} onChange={(e) => kamarForm.setData("nomor_kamar", e.target.value)} required /></FormField>
          {kamarForm.errors.nomor_kamar && <p className="text-sm text-error">{kamarForm.errors.nomor_kamar}</p>}
          <FormField label="Kapasitas"><input type="number" className={inputClass} value={kamarForm.data.kapasitas} onChange={(e) => kamarForm.setData("kapasitas", e.target.value)} required /></FormField>
          {kamarForm.errors.kapasitas && <p className="text-sm text-error">{kamarForm.errors.kapasitas}</p>}
          <FormField label="Tipe Kamar">
            <select className={inputClass} value={kamarForm.data.tipe_kamar} onChange={(e) => kamarForm.setData("tipe_kamar", e.target.value)}>
              <option value="reguler">Reguler</option>
              <option value="vip">VIP</option>
            </select>
            {kamarForm.errors.tipe_kamar && <p className="text-sm text-error">{kamarForm.errors.tipe_kamar}</p>}
          </FormField>
          <FormField label="Status">
            <select className={inputClass} value={kamarForm.data.status} onChange={(e) => kamarForm.setData("status", e.target.value)}>
              <option value="kosong">Kosong</option>
              <option value="terisi_sebagian">Terisi Sebagian</option>
              <option value="penuh">Penuh</option>
              <option value="maintenance">Maintenance</option>
            </select>
            {kamarForm.errors.status && <p className="text-sm text-error">{kamarForm.errors.status}</p>}
          </FormField>
          <FormField label="Tarif per Periode"><input type="number" className={inputClass} value={kamarForm.data.tarif_per_periode} onChange={(e) => kamarForm.setData("tarif_per_periode", e.target.value)} /></FormField>
          {kamarForm.errors.tarif_per_periode && <p className="text-sm text-error">{kamarForm.errors.tarif_per_periode}</p>}
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