import { useState } from "react";
import { useForm, router } from "@inertiajs/react";
import {
    PageHeader,
    Card,
    DataTable,
    StatusBadge,
    Button,
    Drawer,
    FormField,
    inputClass,
    ConfirmDialog,
    RowActions,
} from "../../components/ui";
import {
    store as asetStore,
    update as asetUpdate,
    destroy as asetDestroy,
    importMethod as importAssets,
    template,
} from "@/routes/andalas/aset";

type Stock = {
    id: string;
    kode: string;
    nama: string;
    kategori: string;
    jumlah_total: number;
    jumlah_ditempatkan: number | null;
};
type AsetRow = {
    stok_aset_id?: string;
    jumlah?: number;
    id: string;
    kode_inventaris?: string;
    nama_aset?: string;
    kategori?: string;
    kondisi?: string;
    nilai_aset?: string;
    fasilitas_umum_id?: string;
    fasilitas_umum?: {
        id?: string;
        nama_fasilitas?: string;
        gedung_id?: string;
        gedung?: { id?: string; nama_gedung?: string };
    };
    kamar?: {
        id?: string;
        nomor_kamar?: string;
        lantai?: { gedung?: { id?: string; nama_gedung?: string } };
    };
};
type KamarOption = {
    id: string;
    nomor_kamar?: string;
    lantai?: { gedung?: { kode_gedung?: string } };
};
type LantaiOption = {
    id?: string;
    nomor_lantai?: number;
    nama_lantai?: string;
    kamar?: KamarOption[];
};
type GedungRow = {
    id: string;
    kode_gedung?: string;
    nama_gedung?: string;
    lantai?: LantaiOption[];
};

type Props = {
    stok?: Stock[];
    aset: AsetRow[];
    gedung: GedungRow[];
    fasilitas_umum?: Array<{
        id: string;
        nama_fasilitas: string;
        gedung_id?: string;
        gedung?: { nama_gedung?: string };
    }>;
};

const emptyForm = {
    gedung_id: "",
    stok_aset_id: "",
    jumlah: 1,
    kode_inventaris: "",
    nama_aset: "",
    kategori: "",
    kondisi: "baik",
    kamar_id: "",
    fasilitas_umum_id: "",
    nilai_aset: "",
};

export default function KelolaAset({
    aset,
    gedung,
    fasilitas_umum = [],
    stok = [],
}: Props) {
    const [open, setOpen] = useState(false);
    const importForm = useForm({ file: null as File | null });
    const [editing, setEditing] = useState<AsetRow | null>(null);
    const [deleting, setDeleting] = useState<AsetRow | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);
    const {
        data,
        setData,
        post,
        put,
        transform,
        errors,
        processing,
        resetAndClearErrors,
        clearErrors,
    } = useForm(emptyForm);

    const selectedGedung = (gedung ?? []).find((g) => g.id === data.gedung_id);
    const floorLabel = (lantai: LantaiOption) =>
        lantai.nama_lantai ?? `Lantai ${lantai.nomor_lantai}`;
    const facilityOptions =
        (data.gedung_id
            ? fasilitas_umum.filter((f) => f.gedung_id === data.gedung_id)
            : []) ?? [];

    const buildingId = (row: AsetRow) =>
        row.kamar?.lantai?.gedung?.id ?? row.fasilitas_umum?.gedung?.id ?? "";

    function openCreate() {
        setEditing(null);
        resetAndClearErrors();
        setOpen(true);
    }

    function openEdit(row: AsetRow) {
        setEditing(row);
        setData({
            gedung_id: buildingId(row),
            stok_aset_id: row.stok_aset_id ?? "",
            jumlah: row.jumlah ?? 1,
            kode_inventaris: row.kode_inventaris ?? "",
            nama_aset: row.nama_aset ?? "",
            kategori: row.kategori ?? "",
            kondisi: row.kondisi ?? "baik",
            kamar_id: row.kamar?.id ?? "",
            fasilitas_umum_id: row.fasilitas_umum_id ?? "",
            nilai_aset: row.nilai_aset ?? "",
        });
        clearErrors();
        setOpen(true);
    }

    function save(e: React.FormEvent) {
        e.preventDefault();
        transform((form) => {
            const { gedung_id: _gedungId, ...rest } = form;
            return {
                ...rest,
                kamar_id: rest.kamar_id || null,
                fasilitas_umum_id: rest.fasilitas_umum_id || null,
                nilai_aset: rest.nilai_aset ? Number(rest.nilai_aset) : null,
            };
        });
        if (editing) {
            put(asetUpdate.url({ id: editing.id }), {
                onSuccess: () => setOpen(false),
            });
        } else {
            post(asetStore.url(), { onSuccess: () => setOpen(false) });
        }
    }

    function confirmDelete() {
        if (!deleting) return;
        setDeletingBusy(true);
        router.delete(asetDestroy.url({ id: deleting.id }), {
            onSuccess: () => setDeleting(null),
            onFinish: () => setDeletingBusy(false),
        });
    }

    const columns = [
        { key: "kode_inventaris", label: "Kode" },
        { key: "nama_aset", label: "Nama Aset" },
        { key: "kategori", label: "Kategori" },
        {
            key: "kamar",
            label: "Lokasi",
            render: (r: AsetRow) =>
                r.kamar
                    ? [
                          r.kamar.lantai?.gedung?.nama_gedung,
                          "Kamar " + r.kamar.nomor_kamar,
                      ].join(" / ")
                    : [
                          r.fasilitas_umum?.gedung?.nama_gedung,
                          r.fasilitas_umum?.nama_fasilitas,
                      ]
                          .filter(Boolean)
                          .join(" / ") || "Belum ditentukan",
        },
        {
            key: "jumlah",
            label: "Jumlah",
            render: (r: AsetRow) => r.jumlah ?? 1,
        },
        {
            key: "kondisi",
            label: "Kondisi",
            render: (r: AsetRow) => (
                <StatusBadge status={r.kondisi ?? "baik"} />
            ),
            filter: {
                type: "select",
                options: ["baik", "rusak_ringan", "rusak_berat", "hilang"],
            },
        },
        {
            key: "aksi",
            label: "",
            render: (r: AsetRow) => (
                <RowActions
                    onEdit={() => openEdit(r)}
                    onDelete={() => setDeleting(r)}
                />
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Kelola Aset"
                subtitle="Inventaris aset asrama"
                actions={<Button onClick={openCreate}>Tambah Aset</Button>}
            />
            <Card className="p-4">
                <details>
                    <summary className="cursor-pointer text-sm font-medium">
                        Impor aset per kamar dari Excel / CSV
                    </summary>
                    <form
                        className="mt-4 flex flex-wrap items-end gap-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            importForm.post(importAssets.url(), {
                                forceFormData: true,
                                onSuccess: () => importForm.reset(),
                            });
                        }}
                    >
                        <FormField label="Berkas Excel / CSV">
                            <input
                                required
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className={inputClass}
                                onChange={(event) =>
                                    importForm.setData(
                                        "file",
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                            />
                        </FormField>
                        <Button type="submit" disabled={importForm.processing}>
                            {importForm.processing ? "Mengimpor…" : "Impor"}
                        </Button>
                        <a
                            className="text-primary py-2 text-sm underline"
                            href={template.url()}
                        >
                            Unduh template CSV
                        </a>
                    </form>
                    <p className="text-muted mt-3 text-xs">
                        Satu sheet, maksimal 500 baris / 5 MB. Isi kode gedung,
                        nomor lantai, nomor kamar, kode stok, jumlah, kode
                        inventaris, dan kondisi. Seluruh impor dibatalkan jika
                        ada baris tidak valid.
                    </p>
                    {importForm.errors.file && (
                        <p role="alert" className="text-error mt-2 text-sm">
                            {importForm.errors.file}
                        </p>
                    )}
                </details>
            </Card>
            <Card className="p-4">
                <DataTable
                    columns={columns as never}
                    data={(aset ?? []) as never}
                />
            </Card>

            <Drawer
                open={open}
                onClose={() => setOpen(false)}
                title={editing ? "Edit Aset" : "Tambah Aset"}
                width="w-full max-w-xl"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            form="kelola-aset-form"
                            disabled={processing}
                        >
                            {processing ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </div>
                }
            >
                <form
                    id="kelola-aset-form"
                    onSubmit={save}
                    className="space-y-3"
                >
                    <FormField label="Kode Inventaris">
                        <input
                            className={inputClass}
                            value={data.kode_inventaris}
                            onChange={(e) =>
                                setData("kode_inventaris", e.target.value)
                            }
                            required
                        />
                    </FormField>
                    {errors.kode_inventaris && (
                        <p className="text-error text-sm">
                            {errors.kode_inventaris}
                        </p>
                    )}
                    <FormField label="Jenis stok aset">
                        <select
                            className={inputClass}
                            required
                            disabled={!!editing?.stok_aset_id}
                            value={data.stok_aset_id}
                            onChange={(event) => {
                                const selected = stok.find(
                                    (item) => item.id === event.target.value,
                                );
                                setData((values) => ({
                                    ...values,
                                    stok_aset_id: event.target.value,
                                    nama_aset: selected?.nama ?? "",
                                    kategori: selected?.kategori ?? "",
                                }));
                            }}
                        >
                            <option value="">Pilih jenis stok</option>
                            {stok.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.kode} — {item.nama} (tersedia:{" "}
                                    {item.jumlah_total -
                                        Number(item.jumlah_ditempatkan ?? 0)}
                                    )
                                </option>
                            ))}
                        </select>
                    </FormField>
                    <FormField label="Jumlah di lokasi">
                        <input
                            required
                            type="number"
                            min={1}
                            step={1}
                            className={inputClass}
                            value={data.jumlah}
                            onChange={(event) =>
                                setData("jumlah", Number(event.target.value))
                            }
                        />
                    </FormField>
                    {Object.entries(errors)
                        .filter(([field]) =>
                            ["stok_aset_id", "jumlah"].includes(field),
                        )
                        .map(([field, error]) => (
                            <p key={field} className="text-error text-sm">
                                {error}
                            </p>
                        ))}
                    <FormField label="Gedung">
                        <select
                            required
                            className={inputClass}
                            value={data.gedung_id}
                            onChange={(event) =>
                                setData({
                                    ...data,
                                    gedung_id: event.target.value,
                                    kamar_id: "",
                                    fasilitas_umum_id: "",
                                })
                            }
                        >
                            <option value="">Pilih gedung</option>
                            {(gedung ?? []).map((gedung) => (
                                <option key={gedung.id} value={gedung.id}>
                                    {gedung.nama_gedung} ({gedung.kode_gedung})
                                </option>
                            ))}
                        </select>
                        {errors.gedung_id && (
                            <p className="text-error text-sm">
                                {errors.gedung_id}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Kamar">
                        <select
                            className={inputClass}
                            disabled={!selectedGedung}
                            value={data.kamar_id}
                            onChange={(e) => {
                                setData("kamar_id", e.target.value);
                                setData("fasilitas_umum_id", "");
                            }}
                        >
                            <option value="">Fasilitas Umum</option>
                            {(selectedGedung?.lantai ?? []).map((lantai) => (
                                <optgroup
                                    key={lantai.id}
                                    label={floorLabel(lantai)}
                                >
                                    {(lantai.kamar ?? []).map((kamar) => (
                                        <option key={kamar.id} value={kamar.id}>
                                            Kamar {kamar.nomor_kamar}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        {errors.kamar_id && (
                            <p className="text-error text-sm">
                                {errors.kamar_id}
                            </p>
                        )}
                    </FormField>
                    {!data.kamar_id && data.gedung_id && (
                        <FormField
                            label="Lokasi fasilitas umum"
                            hint={
                                facilityOptions.length === 0
                                    ? "Belum ada fasilitas umum terdaftar di gedung ini."
                                    : undefined
                            }
                        >
                            <select
                                required
                                disabled={facilityOptions.length === 0}
                                className={inputClass}
                                value={data.fasilitas_umum_id}
                                onChange={(e) =>
                                    setData("fasilitas_umum_id", e.target.value)
                                }
                            >
                                <option value="">Pilih fasilitas</option>
                                {facilityOptions.map((facility) => (
                                    <option
                                        key={facility.id}
                                        value={facility.id}
                                    >
                                        {facility.nama_fasilitas}
                                    </option>
                                ))}
                            </select>
                            {errors.fasilitas_umum_id && (
                                <p className="text-error text-sm">
                                    {errors.fasilitas_umum_id}
                                </p>
                            )}
                        </FormField>
                    )}
                    <FormField label="Kondisi">
                        <select
                            className={inputClass}
                            value={data.kondisi}
                            onChange={(e) => setData("kondisi", e.target.value)}
                        >
                            <option value="baik">Baik</option>
                            <option value="rusak_ringan">Rusak Ringan</option>
                            <option value="rusak_berat">Rusak Berat</option>
                            <option value="hilang">Hilang</option>
                        </select>
                        {errors.kondisi && (
                            <p className="text-error text-sm">
                                {errors.kondisi}
                            </p>
                        )}
                    </FormField>
                </form>
            </Drawer>

            <ConfirmDialog
                open={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                loading={deletingBusy}
                title="Hapus Aset"
                message={`Hapus aset ${deleting?.nama_aset ?? ""}? Tindakan ini tidak dapat dibatalkan.`}
            />
        </div>
    );
}
