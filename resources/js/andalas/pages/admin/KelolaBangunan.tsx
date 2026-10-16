import { useState, useEffect, type ReactNode } from 'react';

import { Link, useForm, router } from '@inertiajs/react';
import {
    create as buildingCreate,
    show as buildingShow,
} from '@/routes/andalas/gedung';
import { show as floorShow } from '@/routes/andalas/lantai';
import { show as roomShow } from '@/routes/andalas/kamar';
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
import { kelolaBangunan } from '@/routes/admin';
import { formatRupiah } from '../../lib/format';
import { Pencil, Trash2 } from 'lucide-react';

type Kamar = {
    id: string;
    nomor_kamar?: string;
    kapasitas?: number;
    status?: string;
    tipe_kamar?: string;
    tarif_per_periode?: number | string;
    foto?: string | null;
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
    allowed_categories?: string[] | null;
    room_types?: Array<{
        type: string;
        enabled: boolean;
        max_capacity: number | null;
        facilities: string;
    }> | null;
};

type GedungRow = Gedung & { jumlah_lantai: number; jumlah_kamar: number };

type DeleteTarget =
    | { kind: 'gedung'; gedung: Gedung }
    | { kind: 'lantai'; lantai: Lantai }
    | { kind: 'kamar'; kamar: Kamar };

type LantaiTarget = { gedung_id: string; lantai: Lantai | null };
type KamarTarget = { lantai_id: string; kamar: Kamar | null };

type Props = {
    gedung: Gedung[];
    detail?: boolean;
    floorOnly?: boolean;
    infoOnly?: boolean;
    createPage?: boolean;
    createReturnUrl?: string;
};

const gedungDefaults = {
    kode_gedung: '',
    nama_gedung: '',
    gender_peruntukan: 'laki_laki',
    alamat: '',
    deskripsi: '',
    foto: null as File | null,
    allowed_categories: [
        'local_kipk',
        'local_non_kipk',
        'student',
        'international_student',
        'international_free_facility',
        'non_student',
        'summer_course',
    ],
    continue_setup: true,
    configure_categories: true,
};
const lantaiDefaults = { nomor_lantai: '1', nama_lantai: '' };
const kamarDefaults = {
    nomor_kamar: '',
    kapasitas: '2',
    tipe_kamar: 'standar',
    status: 'kosong',
    tarif_per_periode: '',
    foto: null as File | null,
    remove_foto: false,
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

function BuildingActions({
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
    return (
        <RowActions
            onDetail={() => onManage(gedung)}
            onEdit={() => onEdit(gedung)}
            onDelete={() => onDelete(gedung)}
        />
    );
}
function BuildingFormSurface({
    standalone,
    open,
    onClose,
    title,
    children,
    footer,
}: {
    standalone: boolean;
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer: ReactNode;
}) {
    if (standalone)
        return (
            <div className="space-y-5">
                <PageHeader
                    title={title}
                    subtitle="Lengkapi identitas dan kategori penghuni, lalu lanjutkan pengaturan layanan di detail gedung."
                />
                <div className="bg-base-100 border-base-300 rounded-xl border p-5">
                    {children}
                    <div className="border-base-300 mt-6 border-t pt-5">
                        {footer}
                    </div>
                </div>
            </div>
        );
    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={title}
            width="w-full max-w-xl"
            footer={footer}
        >
            {children}
        </Drawer>
    );
}
export default function KelolaBangunan({
    gedung,
    detail = false,
    floorOnly = false,
    infoOnly = false,
    createPage = false,
    createReturnUrl,
}: Props) {
    const [gedungStep, setGedungStep] = useState(0);
    const [gedungOpen, setGedungOpen] = useState(createPage);
    const [editingGedung, setEditingGedung] = useState<Gedung | null>(null);
    const [gedungPreview, setGedungPreview] = useState<string | null>(null);
    const [lantaiTarget, setLantaiTarget] = useState<LantaiTarget | null>(null);
    const [kamarTarget, setKamarTarget] = useState<KamarTarget | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);

    const gedungForm = useForm(gedungDefaults);
    const lantaiForm = useForm(lantaiDefaults);
    const kamarForm = useForm(kamarDefaults);

    useEffect(() => {
        if (!gedungForm.data.foto) return;
        const url = URL.createObjectURL(gedungForm.data.foto);
        setGedungPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [gedungForm.data.foto]);

    function openGedungForm(gedung?: Gedung) {
        setGedungStep(0);
        setEditingGedung(gedung ?? null);
        gedungForm.resetAndClearErrors();
        gedungForm.setData({
            kode_gedung: gedung?.kode_gedung ?? '',
            nama_gedung: gedung?.nama_gedung ?? '',
            gender_peruntukan: gedung?.gender_peruntukan ?? 'laki_laki',
            alamat: gedung?.alamat ?? '',
            deskripsi: gedung?.deskripsi ?? '',
            foto: null,
            allowed_categories: gedung?.allowed_categories ?? [
                'local_kipk',
                'local_non_kipk',
                'student',
                'international_student',
                'international_free_facility',
                'non_student',
                'summer_course',
            ],
            continue_setup: !gedung,
            configure_categories: true,
        });
        setGedungPreview(gedung?.foto ? `/storage/${gedung.foto}` : null);
        setGedungOpen(true);
    }

    function closeGedungForm() {
        if (createPage) {
            router.visit(createReturnUrl ?? kelolaBangunan.url());
            return;
        }
        setGedungOpen(false);
        setEditingGedung(null);
        setGedungPreview(null);
    }

    function saveGedung(event: React.FormEvent) {
        event.preventDefault();
        gedungForm.transform(({ foto, ...rest }) => ({
            ...rest,
            ...(foto instanceof File ? { foto } : {}),
            ...(editingGedung ? { _method: 'put' } : {}),
        }));
        gedungForm.post(
            editingGedung
                ? gedungUpdate.url({ id: editingGedung.id })
                : gedungStore.url(),
            {
                onSuccess: () => {
                    if (!createPage) closeGedungForm();
                },
                onError: (errors) =>
                    setGedungStep(
                        Object.keys(errors).some((key) =>
                            key.startsWith('allowed_categories'),
                        )
                            ? 1
                            : 0,
                    ),
            },
        );
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
        if (!kamar) {
            const building = gedung.find((item) =>
                item.lantai?.some((floor) => floor.id === lantaiId),
            );
            const definition = building?.room_types?.find(
                (type) => type.enabled,
            );
            kamarForm.setData({
                ...kamarDefaults,
                tipe_kamar:
                    building?.room_types == null
                        ? 'standar'
                        : (definition?.type ?? ''),
                kapasitas: String(Math.min(2, definition?.max_capacity ?? 2)),
            });
        }
        if (kamar) {
            kamarForm.setData({
                foto: null,
                remove_foto: false,
                nomor_kamar: kamar.nomor_kamar ?? '',
                kapasitas: String(kamar.kapasitas ?? '2'),
                tipe_kamar: kamar.tipe_kamar ?? 'standar',
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
                ...(form.foto ? { foto: form.foto } : {}),
                remove_foto: form.remove_foto,
                ...(kamarTarget.kamar ? { _method: 'put' } : {}),
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
            kamarForm.post(kamarUpdate.url({ id: kamarTarget.kamar.id }), {
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
            render: (row) => (
                <span className="text-identifier">
                    {row.kode_gedung ?? '—'}
                </span>
            ),
        },
        {
            key: 'nama_gedung',
            label: 'Nama Gedung',
            render: (row) => (
                <Link
                    className="link link-primary"
                    href={buildingShow.url(row.id)}
                >
                    {row.nama_gedung}
                </Link>
            ),
        },
        {
            key: 'gender_peruntukan',
            label: 'Peruntukan',
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
        { key: 'jumlah_lantai', label: 'Lantai' },
        { key: 'jumlah_kamar', label: 'Kamar' },
        {
            key: 'aksi',
            label: 'Aksi',
            action: true,
            render: (row) => (
                <div className="flex justify-end">
                    <BuildingActions
                        gedung={row}
                        onManage={(building) =>
                            router.visit(buildingShow.url(building.id))
                        }
                        onEdit={openGedungForm}
                        onDelete={(gedung) =>
                            setDeleteTarget({ kind: 'gedung', gedung })
                        }
                    />
                </div>
            ),
        },
    ];

    const manage = detail ? gedung[0] : null;

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
            {!detail && !createPage && (
                <>
                    <PageHeader
                        title="Kelola Bangunan"
                        subtitle="Tambah dan atur gedung, lantai, serta kamar asrama"
                        actions={
                            <Link
                                className="btn btn-primary"
                                href={buildingCreate.url()}
                            >
                                Tambah Gedung
                            </Link>
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
                </>
            )}
            {gedungOpen && (
                <BuildingFormSurface
                    standalone={createPage}
                    open={gedungOpen}
                    onClose={closeGedungForm}
                    title={editingGedung ? 'Edit Gedung' : 'Tambah Gedung'}
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
                                {gedungForm.processing
                                    ? 'Menyimpan…'
                                    : editingGedung
                                      ? 'Simpan perubahan'
                                      : 'Simpan & lanjutkan pengaturan'}
                            </Button>
                        </div>
                    }
                >
                    <form
                        id="gedung-form"
                        onSubmit={saveGedung}
                        onInvalidCapture={() => setGedungStep(0)}
                        className="space-y-3"
                    >
                        <div
                            className="flex gap-2"
                            aria-label="Langkah tambah gedung"
                        >
                            {['1. Informasi dasar', '2. Kategori penghuni'].map(
                                (label, index) => (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => setGedungStep(index)}
                                        aria-pressed={gedungStep === index}
                                        className={`btn btn-sm ${gedungStep === index ? 'btn-primary' : 'btn-ghost'}`}
                                    >
                                        {label}
                                    </button>
                                ),
                            )}
                        </div>
                        <p className="text-muted text-sm">
                            Mulai dari identitas gedung dan kategori penghuni.
                            Tipe kamar, tarif, fasilitas, dan lantai dikelola
                            setelah gedung disimpan.
                        </p>
                        <div hidden={gedungStep !== 0} className="space-y-3">
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
                                        gedungForm.setData(
                                            'alamat',
                                            event.target.value,
                                        )
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
                                                    ? gedungPreview
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
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setGedungStep(1)}
                            >
                                Lanjut: kategori penghuni
                            </Button>
                        </div>
                        <div hidden={gedungStep !== 1} className="space-y-3">
                            <h3 className="font-semibold">
                                Siapa yang boleh menghuni gedung ini?
                            </h3>
                            <p className="text-muted text-sm">
                                Pilih kategori yang diterima. Tanpa pilihan,
                                gedung tidak menerima pendaftaran penghuni.
                            </p>
                            {Object.entries({
                                local_kipk: 'Maba lokal KIP-K',
                                local_non_kipk: 'Maba lokal non-KIP-K',
                                student: 'Mahasiswa S1 non-maba',
                                international_student:
                                    'Internasional/S2/S3 pribadi',
                                international_free_facility:
                                    'Internasional/S2/S3 ditanggung',
                                non_student: 'Non-mahasiswa',
                                summer_course: 'Summer Course',
                            }).map(([value, label]) => (
                                <label
                                    key={value}
                                    className="border-base-300 flex items-center gap-3 rounded-lg border p-3"
                                >
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary checkbox-sm"
                                        checked={gedungForm.data.allowed_categories.includes(
                                            value,
                                        )}
                                        onChange={(event) =>
                                            gedungForm.setData(
                                                'allowed_categories',
                                                event.target.checked
                                                    ? [
                                                          ...gedungForm.data
                                                              .allowed_categories,
                                                          value,
                                                      ]
                                                    : gedungForm.data.allowed_categories.filter(
                                                          (category) =>
                                                              category !==
                                                              value,
                                                      ),
                                            )
                                        }
                                    />
                                    <span>{label}</span>
                                </label>
                            ))}
                            {gedungForm.errors.allowed_categories && (
                                <p className="text-error text-sm">
                                    {gedungForm.errors.allowed_categories}
                                </p>
                            )}
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setGedungStep(0)}
                            >
                                Kembali ke informasi dasar
                            </Button>
                        </div>
                    </form>
                </BuildingFormSurface>
            )}

            {infoOnly && manage && (
                <Button
                    variant="secondary"
                    onClick={() => openGedungForm(manage)}
                >
                    Edit informasi dasar
                </Button>
            )}
            {!infoOnly && (
                <section aria-label="Kelola lantai dan kamar">
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
                                {!floorOnly && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => openGedungForm(manage)}
                                    >
                                        Edit informasi & kategori
                                    </Button>
                                )}
                                {!floorOnly && (
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            openLantaiForm(manage.id)
                                        }
                                    >
                                        Tambah Lantai
                                    </Button>
                                )}
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
                                                <Link
                                                    className="link link-primary"
                                                    href={floorShow.url(
                                                        lantai.id,
                                                    )}
                                                >
                                                    {lantaiLabel(lantai)}
                                                </Link>
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
                                            {(lantai.kamar ?? []).length ===
                                            0 ? (
                                                <p className="text-muted px-2 py-3 text-sm">
                                                    Belum ada kamar di lantai
                                                    ini.
                                                </p>
                                            ) : (
                                                <ul className="grid gap-3 p-2 sm:grid-cols-2 xl:grid-cols-3">
                                                    {(lantai.kamar ?? []).map(
                                                        (kamar) => (
                                                            <li
                                                                key={kamar.id}
                                                                className="border-base-300 flex flex-wrap items-center gap-3 overflow-hidden rounded-xl border p-3"
                                                            >
                                                                {kamar.foto && (
                                                                    <img
                                                                        src={`/storage/${kamar.foto}`}
                                                                        alt={`Kamar ${kamar.nomor_kamar}`}
                                                                        className="h-36 w-full rounded-lg object-cover"
                                                                    />
                                                                )}
                                                                <Link
                                                                    href={roomShow.url(
                                                                        kamar.id,
                                                                    )}
                                                                    className="link link-primary text-identifier w-16 text-sm font-medium"
                                                                >
                                                                    {
                                                                        kamar.nomor_kamar
                                                                    }
                                                                </Link>
                                                                <Badge
                                                                    color={
                                                                        kamar.tipe_kamar ===
                                                                        'premium'
                                                                            ? 'yellow'
                                                                            : 'gray'
                                                                    }
                                                                >
                                                                    {{
                                                                        standar:
                                                                            'Standar',
                                                                        medium: 'Medium',
                                                                        premium:
                                                                            'Premium',
                                                                    }[
                                                                        kamar.tipe_kamar ??
                                                                            'standar'
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
                                                                    Number(
                                                                        kamar.tarif_per_periode,
                                                                    ) > 0 && (
                                                                        <span className="text-muted text-sm">
                                                                            {formatRupiah(
                                                                                Number(
                                                                                    kamar.tarif_per_periode,
                                                                                ),
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                <div className="ml-auto inline-flex shrink-0 items-center gap-1">
                                                                    <IconButton
                                                                        label="Ubah kamar"
                                                                        icon={
                                                                            Pencil
                                                                        }
                                                                        tone="text-warning hover:bg-warning/10"
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
                </section>
            )}

            {lantaiTarget && (
                <Drawer
                    open={!!lantaiTarget}
                    onClose={() => setLantaiTarget(null)}
                    title={
                        lantaiTarget?.lantai ? 'Edit Lantai' : 'Tambah Lantai'
                    }
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
                                {lantaiForm.processing
                                    ? 'Menyimpan…'
                                    : 'Simpan'}
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
            )}

            {kamarTarget && (
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
                        <p className="text-muted text-sm">
                            Tentukan identitas dan tipe kamar, lalu tambahkan
                            foto. Fasilitas dan tarif utama mengikuti pengaturan
                            tipe gedung.
                        </p>
                        <FormField
                            label="Foto kamar"
                            hint="JPG, PNG, atau WebP. Maksimal 2 MB."
                        >
                            <input
                                aria-label="Foto kamar"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="file-input w-full"
                                onChange={(event) => {
                                    kamarForm.setData(
                                        'foto',
                                        event.target.files?.[0] ?? null,
                                    );
                                    kamarForm.setData('remove_foto', false);
                                }}
                            />
                            {kamarTarget?.kamar?.foto &&
                                !kamarForm.data.remove_foto && (
                                    <img
                                        src={`/storage/${kamarTarget.kamar.foto}`}
                                        alt="Foto kamar saat ini"
                                        className="h-36 w-full rounded-lg object-cover"
                                    />
                                )}
                            {kamarTarget?.kamar?.foto && (
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-sm"
                                        checked={kamarForm.data.remove_foto}
                                        onChange={(event) => {
                                            kamarForm.setData(
                                                'remove_foto',
                                                event.target.checked,
                                            );
                                            if (event.target.checked)
                                                kamarForm.setData('foto', null);
                                        }}
                                    />
                                    Hapus foto lama
                                </label>
                            )}
                            {kamarForm.errors.foto && (
                                <p className="text-error text-sm">
                                    {kamarForm.errors.foto}
                                </p>
                            )}
                        </FormField>
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
                                <option value="">Pilih tipe aktif</option>
                                {[
                                    'standar',
                                    'medium',
                                    'premium',
                                    'umum',
                                    'umum_vip',
                                ]
                                    .filter((type) => {
                                        const building = gedung.find((b) =>
                                            b.lantai?.some(
                                                (floor) =>
                                                    floor.id ===
                                                    kamarTarget?.lantai_id,
                                            ),
                                        );
                                        return (
                                            building?.room_types == null ||
                                            building.room_types.some(
                                                (definition) =>
                                                    definition.type === type &&
                                                    definition.enabled,
                                            )
                                        );
                                    })
                                    .map((type) => (
                                        <option key={type} value={type}>
                                            {type === 'umum_vip'
                                                ? 'Umum VIP'
                                                : type.charAt(0).toUpperCase() +
                                                  type.slice(1)}
                                        </option>
                                    ))}
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
                                    kamarForm.setData(
                                        'status',
                                        event.target.value,
                                    )
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
                            label="Tarif khusus kamar per tahun (opsional)"
                            hint="Kosongkan untuk memakai tarif master tipe gedung. Isi hanya bila kamar ini memiliki tarif khusus."
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
            )}

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
