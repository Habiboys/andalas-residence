import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm, router } from '@inertiajs/react';
import {
    PageHeader,
    DataTable,
    Badge,
    StatusBadge,
    Button,
    Drawer,
    FormField,
    inputClass,
    selectClass,
    ConfirmDialog,
    RowActions,
    IconButton,
    EmptyState,
    type DataColumn,
} from '../../components/ui';
import {
    store as gedungStore,
    update as gedungUpdate,
    destroy as gedungDestroy,
} from '@/routes/andalas/gedung';
import {
    store as lantaiStore,
    update as lantaiUpdate,
    destroy as lantaiDestroy,
} from '@/routes/andalas/lantai';
import {
    store as kamarStore,
    update as kamarUpdate,
    destroy as kamarDestroy,
} from '@/routes/andalas/kamar';
import { formatRupiah } from '../../lib/format';
import { Building2, ChevronDown, Pencil, Trash2 } from 'lucide-react';

type Kamar = {
    id: string;
    nomor_kamar?: string;
    kapasitas?: number;
    status?: string;
    tipe_kamar?: string;
    tarif_per_periode?: number;
};

type Lantai = {
    id: string;
    gedung_id?: string;
    nomor_lantai?: number;
    nama_lantai?: string;
    kamar?: Kamar[];
};

type Gedung = {
    id: string;
    kode_gedung?: string;
    nama_gedung?: string;
    gender_peruntukan?: string;
    alamat?: string;
    deskripsi?: string;
    foto?: string;
    lantai?: Lantai[];
};

type GedungRow = Gedung & { jumlah_lantai: number; jumlah_kamar: number };

type DeleteTarget =
    | { kind: 'gedung'; gedung: Gedung }
    | { kind: 'lantai'; lantai: Lantai }
    | { kind: 'kamar'; kamar: Kamar };

type LantaiTarget = { gedung_id: string; lantai: Lantai | null };
type KamarTarget = { lantai_id: string; kamar: Kamar | null };

type Props = { gedung: Gedung[] };

const gedungDefaults = {
    kode_gedung: '',
    nama_gedung: '',
    gender_peruntukan: 'laki_laki',
    alamat: '',
    deskripsi: '',
    foto: null as File | null,
};
const lantaiDefaults = { nomor_lantai: '1', nama_lantai: '' };
const kamarDefaults = {
    nomor_kamar: '',
    kapasitas: '2',
    tipe_kamar: 'reguler',
    status: 'kosong',
    tarif_per_periode: '',
};

function peruntukanLabel(value: string | undefined): string {
    return (
        {
            laki_laki: 'Laki-laki',
            perempuan: 'Perempuan',
            campur: 'Campuran',
        }[value ?? ''] ??
        value ??
        '—'
    );
}

function lantaiLabel(lantai: Lantai): string {
    return lantai.nama_lantai ?? `Lantai ${lantai.nomor_lantai}`;
}

function RowMenu({
    gedung,
    onManage,
    onEdit,
    onDelete,
}: {
    gedung: Gedung;
    onManage: (gedung: Gedung) => void;
    onEdit: (gedung: Gedung) => void;
    onDelete: (gedung: Gedung) => void;
}) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<{
        top: number;
        right: number;
    } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    function toggle() {
        const trigger = triggerRef.current;
        if (!open && trigger) {
            const rect = trigger.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 6,
                right: window.innerWidth - rect.right,
            });
        }
        setOpen((value) => !value);
    }

    useEffect(() => {
        if (!open) {
            return;
        }

        function onOutsideClick(event: MouseEvent) {
            if (!triggerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function onScroll() {
            setOpen(false);
        }

        function onKey(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        document.addEventListener('click', onOutsideClick);
        document.addEventListener('scroll', onScroll, true);
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('click', onOutsideClick);
            document.removeEventListener('scroll', onScroll, true);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={open}
                className="btn btn-sm btn-outline gap-1"
            >
                Kelola
                <ChevronDown
                    className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>
            {open &&
                position &&
                createPortal(
                    <ul
                        role="menu"
                        aria-label={`Aksi untuk ${gedung.nama_gedung}`}
                        style={{ top: position.top, right: position.right }}
                        className="menu menu-sm rounded-box border-base-300 bg-base-100 fixed z-[100] w-52 border p-2 shadow-lg"
                    >
                        <li>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setOpen(false);
                                    onManage(gedung);
                                }}
                            >
                                <Building2
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Kelola Lantai &amp; Kamar
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setOpen(false);
                                    onEdit(gedung);
                                }}
                            >
                                <Pencil className="size-4" aria-hidden="true" />
                                Edit Gedung
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setOpen(false);
                                    onDelete(gedung);
                                }}
                                className="text-error"
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                                Hapus Gedung
                            </button>
                        </li>
                    </ul>,
                    document.body,
                )}
        </>
    );
}

export default function KelolaBangunan({ gedung }: Props) {
    const [gedungOpen, setGedungOpen] = useState(false);
    const [editingGedung, setEditingGedung] = useState<Gedung | null>(null);
    const [gedungPreview, setGedungPreview] = useState<string | null>(null);
    const [manageGedung, setManageGedung] = useState<Gedung | null>(null);
    const [lantaiTarget, setLantaiTarget] = useState<LantaiTarget | null>(null);
    const [kamarTarget, setKamarTarget] = useState<KamarTarget | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);

    const gedungForm = useForm(gedungDefaults);
    const lantaiForm = useForm(lantaiDefaults);
    const kamarForm = useForm(kamarDefaults);

    function openGedungForm(gedung?: Gedung) {
        setEditingGedung(gedung ?? null);
        gedungForm.resetAndClearErrors();
        gedungForm.setData({
            kode_gedung: gedung?.kode_gedung ?? '',
            nama_gedung: gedung?.nama_gedung ?? '',
            gender_peruntukan: gedung?.gender_peruntukan ?? 'laki_laki',
            alamat: gedung?.alamat ?? '',
            deskripsi: gedung?.deskripsi ?? '',
            foto: null,
        });
        setGedungPreview(gedung?.foto ? `/storage/${gedung.foto}` : null);
        setGedungOpen(true);
    }

    function closeGedungForm() {
        setGedungOpen(false);
        setEditingGedung(null);
        setGedungPreview(null);
    }

    function saveGedung(event: React.FormEvent) {
        event.preventDefault();
        const options = {
            transform: (form: typeof gedungDefaults) => {
                const { foto, ...rest } = form;
                return foto instanceof File ? { ...rest, foto } : rest;
            },
            onSuccess: closeGedungForm,
        };
        if (editingGedung) {
            gedungForm.put(gedungUpdate.url({ id: editingGedung.id }), options);
        } else {
            gedungForm.post(gedungStore.url(), options);
        }
    }

    function openLantaiForm(gedungId: string, lantai?: Lantai) {
        lantaiForm.resetAndClearErrors();
        if (lantai) {
            lantaiForm.setData({
                nomor_lantai: String(lantai.nomor_lantai ?? ''),
                nama_lantai: lantai.nama_lantai ?? '',
            });
        }
        setLantaiTarget({ gedung_id: gedungId, lantai: lantai ?? null });
    }

    function saveLantai(event: React.FormEvent) {
        event.preventDefault();
        if (!lantaiTarget) {
            return;
        }
        lantaiForm.transform((form) => {
            const base = {
                nomor_lantai: Number(form.nomor_lantai),
                nama_lantai: form.nama_lantai,
            };
            return lantaiTarget.lantai
                ? base
                : { ...base, gedung_id: lantaiTarget.gedung_id };
        });
        const onSuccess = () => setLantaiTarget(null);
        if (lantaiTarget.lantai) {
            lantaiForm.put(lantaiUpdate.url({ id: lantaiTarget.lantai.id }), {
                onSuccess,
            });
        } else {
            lantaiForm.post(lantaiStore.url(), { onSuccess });
        }
    }

    function openKamarForm(lantaiId: string, kamar?: Kamar) {
        kamarForm.resetAndClearErrors();
        if (kamar) {
            kamarForm.setData({
                nomor_kamar: kamar.nomor_kamar ?? '',
                kapasitas: String(kamar.kapasitas ?? '2'),
                tipe_kamar: kamar.tipe_kamar ?? 'reguler',
                status: kamar.status ?? 'kosong',
                tarif_per_periode:
                    kamar.tarif_per_periode != null
                        ? String(kamar.tarif_per_periode)
                        : '',
            });
        }
        setKamarTarget({ lantai_id: lantaiId, kamar: kamar ?? null });
    }

    function saveKamar(event: React.FormEvent) {
        event.preventDefault();
        if (!kamarTarget) {
            return;
        }
        kamarForm.transform((form) => {
            const base = {
                nomor_kamar: form.nomor_kamar,
                kapasitas: Number(form.kapasitas),
                tipe_kamar: form.tipe_kamar,
                status: form.status,
                tarif_per_periode:
                    form.tarif_per_periode === ''
                        ? null
                        : Number(form.tarif_per_periode),
            };
            return kamarTarget.kamar
                ? base
                : { ...base, lantai_id: kamarTarget.lantai_id };
        });
        const onSuccess = () => setKamarTarget(null);
        if (kamarTarget.kamar) {
            kamarForm.put(kamarUpdate.url({ id: kamarTarget.kamar.id }), {
                onSuccess,
            });
        } else {
            kamarForm.post(kamarStore.url(), { onSuccess });
        }
    }

    function confirmDelete() {
        if (!deleteTarget) {
            return;
        }
        setDeletingBusy(true);
        const url =
            deleteTarget.kind === 'gedung'
                ? gedungDestroy.url({ id: deleteTarget.gedung.id })
                : deleteTarget.kind === 'lantai'
                  ? lantaiDestroy.url({ id: deleteTarget.lantai.id })
                  : kamarDestroy.url({ id: deleteTarget.kamar.id });
        router.delete(url, {
            onSuccess: () => setDeleteTarget(null),
            onFinish: () => setDeletingBusy(false),
        });
    }

    const rows: GedungRow[] = (gedung ?? []).map((gedung) => ({
        ...gedung,
        jumlah_lantai: (gedung.lantai ?? []).length,
        jumlah_kamar: (gedung.lantai ?? []).reduce(
            (total, lantai) => total + (lantai.kamar?.length ?? 0),
            0,
        ),
    }));

    const columns: DataColumn<GedungRow>[] = [
        {
            key: 'kode_gedung',
            label: 'Kode',
            width: 'w-28',
            render: (row) => (
                <span className="text-identifier">
                    {row.kode_gedung ?? '—'}
                </span>
            ),
        },
        { key: 'nama_gedung', label: 'Nama Gedung' },
        {
            key: 'gender_peruntukan',
            label: 'Peruntukan',
            width: 'w-40',
            render: (row) => (
                <Badge>{peruntukanLabel(row.gender_peruntukan)}</Badge>
            ),
            filter: {
                type: 'select',
                options: [
                    { value: 'laki_laki', label: 'Laki-laki' },
                    { value: 'perempuan', label: 'Perempuan' },
                    { value: 'campur', label: 'Campuran' },
                ],
            },
        },
        { key: 'jumlah_lantai', label: 'Lantai', width: 'w-24' },
        { key: 'jumlah_kamar', label: 'Kamar', width: 'w-24' },
        {
            key: 'aksi',
            label: 'Aksi',
            action: true,
            render: (row) => (
                <div className="flex justify-end">
                    <RowMenu
                        gedung={row}
                        onManage={setManageGedung}
                        onEdit={openGedungForm}
                        onDelete={(gedung) =>
                            setDeleteTarget({ kind: 'gedung', gedung })
                        }
                    />
                </div>
            ),
        },
    ];

    const manage = manageGedung;

    let deleteTitle = 'Hapus Data';
    let deleteMessage =
        'Data ini akan dihapus. Tindakan ini tidak dapat dibatalkan.';
    if (deleteTarget?.kind === 'gedung') {
        deleteTitle = 'Hapus Gedung';
        deleteMessage = `Hapus gedung "${deleteTarget.gedung.nama_gedung}" beserta seluruh lantai dan kamarnya? Tindakan ini tidak dapat dibatalkan.`;
    } else if (deleteTarget?.kind === 'lantai') {
        deleteTitle = 'Hapus Lantai';
        deleteMessage = `Hapus lantai "${lantaiLabel(deleteTarget.lantai)}" beserta semua kamar di dalamnya? Tindakan ini tidak dapat dibatalkan.`;
    } else if (deleteTarget?.kind === 'kamar') {
        deleteTitle = 'Hapus Kamar';
        deleteMessage = `Hapus kamar "${deleteTarget.kamar.nomor_kamar}"? Tindakan ini tidak dapat dibatalkan.`;
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="Kelola Bangunan"
                subtitle="Tambah dan atur gedung, lantai, serta kamar asrama"
                actions={
                    <Button onClick={() => openGedungForm()}>
                        Tambah Gedung
                    </Button>
                }
            />

            <DataTable<GedungRow>
                columns={columns}
                data={rows}
                searchKeys={['kode_gedung', 'nama_gedung', 'alamat']}
                searchPlaceholder="Cari gedung…"
                defaultPerPage={10}
                emptyMessage="Belum ada gedung. Tambahkan gedung pertama untuk mulai mengatur lantai dan kamar."
            />

            <Drawer
                open={gedungOpen}
                onClose={closeGedungForm}
                title={editingGedung ? 'Edit Gedung' : 'Tambah Gedung'}
                width="w-full max-w-xl"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={closeGedungForm}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            form="gedung-form"
                            disabled={gedungForm.processing}
                        >
                            {gedungForm.processing ? 'Menyimpan…' : 'Simpan'}
                        </Button>
                    </div>
                }
            >
                <form
                    id="gedung-form"
                    onSubmit={saveGedung}
                    className="space-y-3"
                >
                    <FormField label="Kode Gedung">
                        <input
                            className={inputClass}
                            value={gedungForm.data.kode_gedung}
                            onChange={(event) =>
                                gedungForm.setData(
                                    'kode_gedung',
                                    event.target.value,
                                )
                            }
                            placeholder="mis. TMP-A"
                            required
                        />
                        {gedungForm.errors.kode_gedung && (
                            <p className="text-error text-sm">
                                {gedungForm.errors.kode_gedung}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Nama Gedung">
                        <input
                            className={inputClass}
                            value={gedungForm.data.nama_gedung}
                            onChange={(event) =>
                                gedungForm.setData(
                                    'nama_gedung',
                                    event.target.value,
                                )
                            }
                            required
                        />
                        {gedungForm.errors.nama_gedung && (
                            <p className="text-error text-sm">
                                {gedungForm.errors.nama_gedung}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Peruntukan">
                        <select
                            className={selectClass}
                            value={gedungForm.data.gender_peruntukan}
                            onChange={(event) =>
                                gedungForm.setData(
                                    'gender_peruntukan',
                                    event.target.value,
                                )
                            }
                        >
                            <option value="laki_laki">Laki-laki</option>
                            <option value="perempuan">Perempuan</option>
                            <option value="campur">Campuran</option>
                        </select>
                        {gedungForm.errors.gender_peruntukan && (
                            <p className="text-error text-sm">
                                {gedungForm.errors.gender_peruntukan}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Alamat">
                        <input
                            className={inputClass}
                            value={gedungForm.data.alamat}
                            onChange={(event) =>
                                gedungForm.setData('alamat', event.target.value)
                            }
                            placeholder="Alamat gedung / lokasi"
                        />
                    </FormField>
                    <FormField label="Deskripsi">
                        <textarea
                            rows={4}
                            className={inputClass}
                            value={gedungForm.data.deskripsi}
                            onChange={(event) =>
                                gedungForm.setData(
                                    'deskripsi',
                                    event.target.value,
                                )
                            }
                            placeholder="Deskripsi singkat gedung"
                        />
                    </FormField>
                    <FormField
                        label="Foto Gedung"
                        hint={
                            editingGedung?.foto
                                ? 'Kosongkan bila ingin mempertahankan foto yang ada.'
                                : undefined
                        }
                    >
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className={inputClass}
                                onChange={(event) => {
                                    const file =
                                        event.target.files?.[0] ?? null;
                                    gedungForm.setData('foto', file);
                                    setGedungPreview(
                                        file
                                            ? URL.createObjectURL(file)
                                            : editingGedung?.foto
                                              ? `/storage/${editingGedung.foto}`
                                              : null,
                                    );
                                }}
                            />
                            {gedungPreview && (
                                <img
                                    src={gedungPreview}
                                    alt="Pratinjau foto gedung"
                                    className="h-14 w-16 flex-shrink-0 rounded-md object-cover"
                                />
                            )}
                        </div>
                        {gedungForm.errors.foto && (
                            <p className="text-error text-sm">
                                {gedungForm.errors.foto}
                            </p>
                        )}
                    </FormField>
                </form>
            </Drawer>

            <Drawer
                open={!!manage}
                onClose={() => setManageGedung(null)}
                title="Kelola Lantai & Kamar"
                subtitle={
                    manage
                        ? `${manage.kode_gedung ?? ''} · ${peruntukanLabel(manage.gender_peruntukan)}`
                        : undefined
                }
                width="w-full max-w-2xl"
            >
                {manage && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-muted text-sm">
                                {(manage.lantai ?? []).length} lantai ·{' '}
                                {(manage.lantai ?? []).reduce(
                                    (total, lantai) =>
                                        total + (lantai.kamar?.length ?? 0),
                                    0,
                                )}{' '}
                                kamar
                            </p>
                            <Button
                                size="sm"
                                onClick={() => openLantaiForm(manage.id)}
                            >
                                Tambah Lantai
                            </Button>
                        </div>

                        {(manage.lantai ?? []).length === 0 ? (
                            <EmptyState
                                title="Belum ada lantai"
                                desc="Mulai dengan menambah lantai pertama untuk gedung ini."
                                action={
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                            openLantaiForm(manage.id)
                                        }
                                    >
                                        Tambah Lantai
                                    </Button>
                                }
                            />
                        ) : (
                            (manage.lantai ?? []).map((lantai) => (
                                <section
                                    key={lantai.id}
                                    className="rounded-box border-base-300 bg-base-100 border"
                                >
                                    <header className="border-base-200 flex items-center justify-between gap-2 border-b px-4 py-2.5">
                                        <h3 className="min-w-0 truncate text-sm font-medium">
                                            {lantaiLabel(lantai)}
                                        </h3>
                                        <RowActions
                                            onEdit={() =>
                                                openLantaiForm(
                                                    manage.id,
                                                    lantai,
                                                )
                                            }
                                            onDelete={() =>
                                                setDeleteTarget({
                                                    kind: 'lantai',
                                                    lantai,
                                                })
                                            }
                                        />
                                    </header>
                                    <div className="p-2">
                                        {(lantai.kamar ?? []).length === 0 ? (
                                            <p className="text-muted px-2 py-3 text-sm">
                                                Belum ada kamar di lantai ini.
                                            </p>
                                        ) : (
                                            <ul className="divide-base-200 divide-y">
                                                {(lantai.kamar ?? []).map(
                                                    (kamar) => (
                                                        <li
                                                            key={kamar.id}
                                                            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-2"
                                                        >
                                                            <span className="text-identifier w-16 text-sm font-medium">
                                                                {
                                                                    kamar.nomor_kamar
                                                                }
                                                            </span>
                                                            <Badge
                                                                color={
                                                                    kamar.tipe_kamar ===
                                                                    'vip'
                                                                        ? 'yellow'
                                                                        : 'gray'
                                                                }
                                                            >
                                                                {{
                                                                    reguler:
                                                                        'Reguler',
                                                                    medium: 'Medium',
                                                                    vip: 'VIP',
                                                                    premium:
                                                                        'Premium',
                                                                }[
                                                                    kamar.tipe_kamar ??
                                                                        'reguler'
                                                                ] ??
                                                                    kamar.tipe_kamar}
                                                            </Badge>
                                                            <StatusBadge
                                                                status={
                                                                    kamar.status ??
                                                                    ''
                                                                }
                                                            />
                                                            <span className="text-muted text-sm">
                                                                {kamar.kapasitas ??
                                                                    '—'}{' '}
                                                                org
                                                            </span>
                                                            {kamar.tarif_per_periode !=
                                                                null &&
                                                                kamar.tarif_per_periode >
                                                                    0 && (
                                                                    <span className="text-muted text-sm">
                                                                        {formatRupiah(
                                                                            kamar.tarif_per_periode,
                                                                        )}
                                                                    </span>
                                                                )}
                                                            <div className="ml-auto flex items-center gap-0.5">
                                                                <IconButton
                                                                    label="Ubah kamar"
                                                                    icon={
                                                                        Pencil
                                                                    }
                                                                    tone="text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                                                    onClick={() =>
                                                                        openKamarForm(
                                                                            lantai.id,
                                                                            kamar,
                                                                        )
                                                                    }
                                                                />
                                                                <IconButton
                                                                    label="Hapus kamar"
                                                                    icon={
                                                                        Trash2
                                                                    }
                                                                    tone="text-error hover:bg-error/10"
                                                                    onClick={() =>
                                                                        setDeleteTarget(
                                                                            {
                                                                                kind: 'kamar',
                                                                                kamar,
                                                                            },
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        )}
                                        <div className="border-base-200 mt-1 border-t px-2 pt-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() =>
                                                    openKamarForm(lantai.id)
                                                }
                                            >
                                                Tambah Kamar
                                            </Button>
                                        </div>
                                    </div>
                                </section>
                            ))
                        )}
                    </div>
                )}
            </Drawer>

            <Drawer
                open={!!lantaiTarget}
                onClose={() => setLantaiTarget(null)}
                title={lantaiTarget?.lantai ? 'Edit Lantai' : 'Tambah Lantai'}
                width="w-full max-w-xl"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setLantaiTarget(null)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            form="lantai-form"
                            disabled={lantaiForm.processing}
                        >
                            {lantaiForm.processing ? 'Menyimpan…' : 'Simpan'}
                        </Button>
                    </div>
                }
            >
                <form
                    id="lantai-form"
                    onSubmit={saveLantai}
                    className="space-y-3"
                >
                    <FormField label="Nomor Lantai">
                        <input
                            type="number"
                            className={inputClass}
                            value={lantaiForm.data.nomor_lantai}
                            onChange={(event) =>
                                lantaiForm.setData(
                                    'nomor_lantai',
                                    event.target.value,
                                )
                            }
                            required
                        />
                        {lantaiForm.errors.nomor_lantai && (
                            <p className="text-error text-sm">
                                {lantaiForm.errors.nomor_lantai}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Nama Lantai">
                        <input
                            className={inputClass}
                            value={lantaiForm.data.nama_lantai}
                            onChange={(event) =>
                                lantaiForm.setData(
                                    'nama_lantai',
                                    event.target.value,
                                )
                            }
                            placeholder="mis. Lantai 1"
                            required
                        />
                        {lantaiForm.errors.nama_lantai && (
                            <p className="text-error text-sm">
                                {lantaiForm.errors.nama_lantai}
                            </p>
                        )}
                    </FormField>
                </form>
            </Drawer>

            <Drawer
                open={!!kamarTarget}
                onClose={() => setKamarTarget(null)}
                title={kamarTarget?.kamar ? 'Edit Kamar' : 'Tambah Kamar'}
                width="w-full max-w-xl"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setKamarTarget(null)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            form="kamar-form"
                            disabled={kamarForm.processing}
                        >
                            {kamarForm.processing ? 'Menyimpan…' : 'Simpan'}
                        </Button>
                    </div>
                }
            >
                <form
                    id="kamar-form"
                    onSubmit={saveKamar}
                    className="space-y-3"
                >
                    <FormField label="Nomor Kamar">
                        <input
                            className={inputClass}
                            value={kamarForm.data.nomor_kamar}
                            onChange={(event) =>
                                kamarForm.setData(
                                    'nomor_kamar',
                                    event.target.value,
                                )
                            }
                            placeholder="mis. 101"
                            required
                        />
                        {kamarForm.errors.nomor_kamar && (
                            <p className="text-error text-sm">
                                {kamarForm.errors.nomor_kamar}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Kapasitas">
                        <input
                            type="number"
                            className={inputClass}
                            value={kamarForm.data.kapasitas}
                            onChange={(event) =>
                                kamarForm.setData(
                                    'kapasitas',
                                    event.target.value,
                                )
                            }
                            min={1}
                            max={10}
                            required
                        />
                        {kamarForm.errors.kapasitas && (
                            <p className="text-error text-sm">
                                {kamarForm.errors.kapasitas}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Tipe Kamar">
                        <select
                            className={selectClass}
                            value={kamarForm.data.tipe_kamar}
                            onChange={(event) =>
                                kamarForm.setData(
                                    'tipe_kamar',
                                    event.target.value,
                                )
                            }
                        >
                            <option value="reguler">Reguler</option>
                            <option value="medium">Medium</option>
                            <option value="vip">VIP</option>
                            <option value="premium">Premium</option>
                        </select>
                        {kamarForm.errors.tipe_kamar && (
                            <p className="text-error text-sm">
                                {kamarForm.errors.tipe_kamar}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Status">
                        <select
                            className={selectClass}
                            value={kamarForm.data.status}
                            onChange={(event) =>
                                kamarForm.setData('status', event.target.value)
                            }
                        >
                            <option value="kosong">Kosong</option>
                            <option value="terisi_sebagian">
                                Terisi Sebagian
                            </option>
                            <option value="penuh">Penuh</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                        {kamarForm.errors.status && (
                            <p className="text-error text-sm">
                                {kamarForm.errors.status}
                            </p>
                        )}
                    </FormField>
                    <FormField
                        label="Tarif per Periode"
                        hint="Kosongkan bila belum ditetapkan."
                    >
                        <input
                            type="number"
                            className={inputClass}
                            value={kamarForm.data.tarif_per_periode}
                            onChange={(event) =>
                                kamarForm.setData(
                                    'tarif_per_periode',
                                    event.target.value,
                                )
                            }
                            min={0}
                        />
                        {kamarForm.errors.tarif_per_periode && (
                            <p className="text-error text-sm">
                                {kamarForm.errors.tarif_per_periode}
                            </p>
                        )}
                    </FormField>
                </form>
            </Drawer>

            <ConfirmDialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                loading={deletingBusy}
                title={deleteTitle}
                message={deleteMessage}
            />
        </div>
    );
}
