import { Pencil, Trash2 } from 'lucide-react';
import { PhotoCarousel, photoPaths } from '../../components/PhotoGallery';
import { useState, type ReactNode } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { save, destroy } from '@/routes/andalas/residence-management';
import { show as floorShow } from '@/routes/andalas/lantai';
import { show as roomShow } from '@/routes/andalas/kamar';
import { update as buildingUpdate } from '@/routes/andalas/gedung';
import {
    Button,
    IconButton,
    FormField,
    inputClass,
    selectClass,
    StatusBadge,
    ConfirmDialog,
    Drawer,
    Modal,
} from '../../components/ui';
import { formatRupiah } from '../../lib/format';
import FloorAvailability from '../../components/FloorAvailability';
import KelolaBangunan from './KelolaBangunan';

type RoomType = {
    type: string;
    enabled: boolean;
    max_capacity: number | null;
    facilities: string;
};
type Room = {
    id: string;
    nomor_kamar: string;
    kapasitas: number;
    status: string;
    tipe_kamar: string;
    foto?: string | null;
    photos?: string[] | null;
    occupants_count?: number;
    tarif_per_periode?: string;
};
type Floor = {
    id: string;
    nomor_lantai: number;
    nama_lantai: string;
    booking_open?: boolean;
    booking_priority?: number;
    kamar?: Room[];
};
type Facility = {
    id: string;
    nama_fasilitas: string;
    kategori: string;
    kondisi: string;
    lantai_id?: string | null;
};
type Rate = {
    id: string;
    tipe_kamar: string;
    unit: string;
    amount: string;
    student_amount?: string | null;
    room_amount?: string | null;
};
type Building = {
    id: string;
    kode_gedung: string;
    nama_gedung: string;
    foto?: string;
    photos?: string[] | null;
    alamat?: string;
    deskripsi?: string;
    gender_peruntukan?: string;
    allowed_categories?: string[] | null;
    room_types?: RoomType[] | null;
    lantai?: Floor[];
    fasilitas_umum?: Facility[];
};
const types = ['standar', 'medium', 'premium', 'umum', 'umum_vip'];
const categories: Record<string, string> = {
    local_kipk: 'Maba lokal KIP-K',
    local_non_kipk: 'Maba lokal non-KIP-K',
    student: 'Mahasiswa S1 non-maba',
    international_student: 'Internasional/S2/S3 pribadi',
    international_free_facility: 'Internasional/S2/S3 ditanggung',
    non_student: 'Non-mahasiswa',
    summer_course: 'Summer Course',
};
const label = (value: string) =>
    value === 'umum_vip'
        ? 'Umum VIP'
        : value.charAt(0).toUpperCase() + value.slice(1);
const steps = ['Informasi Gedung', 'Lantai & Kamar'];

function Errors({ errors }: { errors: Record<string, string> }) {
    return Object.keys(errors).length > 0 ? (
        <div role="alert" className="alert alert-error">
            <ul>
                {Object.entries(errors).map(([key, message]) => (
                    <li key={key}>{message}</li>
                ))}
            </ul>
        </div>
    ) : null;
}
function Panel({
    title,
    description,
    actions,
    children,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="border-base-200 space-y-3 border-b pb-5 last:border-b-0 last:pb-0">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="font-semibold">{title}</h2>
                    {description && (
                        <p className="text-muted mt-1 text-sm">{description}</p>
                    )}
                </div>
                {actions && (
                    <div className="flex shrink-0 items-center gap-2">
                        {actions}
                    </div>
                )}
            </header>
            {children}
        </section>
    );
}
function CategoriesEditor({
    building,
    onClose,
}: {
    building: Building;
    onClose: () => void;
}) {
    const form = useForm({
        allowed_categories:
            building.allowed_categories ?? Object.keys(categories),
    });
    return (
        <form
            className="space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                form.put(buildingUpdate.url(building.id), {
                    preserveScroll: true,
                    onSuccess: onClose,
                });
            }}
        >
            <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(categories).map(([value, title]) => (
                    <label
                        key={value}
                        className="border-base-300 flex items-center gap-3 rounded-lg border p-3"
                    >
                        <input
                            type="checkbox"
                            className="checkbox checkbox-primary checkbox-sm"
                            checked={form.data.allowed_categories.includes(
                                value,
                            )}
                            onChange={(event) =>
                                form.setData(
                                    'allowed_categories',
                                    event.target.checked
                                        ? [
                                              ...form.data.allowed_categories,
                                              value,
                                          ]
                                        : form.data.allowed_categories.filter(
                                              (category) => category !== value,
                                          ),
                                )
                            }
                        />
                        {title}
                    </label>
                ))}
            </div>
            <p className="text-muted text-sm">
                Tanpa kategori terpilih, gedung tidak menerima pendaftaran
                penghuni.
            </p>
            <Errors errors={form.errors} />
            <div className="flex gap-2">
                <Button type="submit" disabled={form.processing}>
                    Simpan kategori
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    disabled={form.processing}
                >
                    Batal
                </Button>
            </div>
        </form>
    );
}
function TypeEditor({
    building,
    definition,
    onClose,
}: {
    building: Building;
    definition: RoomType;
    onClose: () => void;
}) {
    const form = useForm({
        gedung_id: building.id,
        ...definition,
        max_capacity:
            definition.max_capacity == null
                ? ''
                : String(definition.max_capacity),
    });
    return (
        <form
            className="space-y-3"
            onSubmit={(event) => {
                event.preventDefault();
                form.transform((data) => ({
                    ...data,
                    max_capacity:
                        data.max_capacity === ''
                            ? null
                            : Number(data.max_capacity),
                }));
                form.post(save.url('room-type'), {
                    preserveScroll: true,
                    onSuccess: onClose,
                });
            }}
        >
            <div className="flex items-center justify-between">
                <h3 className="font-semibold">{label(definition.type)}</h3>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={form.data.enabled}
                        onChange={(event) =>
                            form.setData('enabled', event.target.checked)
                        }
                    />
                    Tersedia
                </label>
            </div>
            <FormField
                label="Kapasitas maksimal"
                hint="Kosongkan bila tidak dibatasi."
            >
                <input
                    aria-label={`Kapasitas maksimal ${label(definition.type)}`}
                    className={inputClass}
                    type="number"
                    min={1}
                    max={100}
                    value={form.data.max_capacity}
                    onChange={(event) =>
                        form.setData('max_capacity', event.target.value)
                    }
                />
            </FormField>
            <FormField
                label="Fasilitas master"
                hint="Contoh: Dipan, lemari, meja belajar."
            >
                <textarea
                    aria-label={`Fasilitas ${label(definition.type)}`}
                    className="textarea w-full"
                    rows={2}
                    value={form.data.facilities}
                    onChange={(event) =>
                        form.setData('facilities', event.target.value)
                    }
                />
            </FormField>
            <Errors errors={form.errors} />
            <div className="flex items-center gap-3">
                <Button type="submit" size="sm" disabled={form.processing}>
                    Simpan tipe {label(definition.type)}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={onClose}
                    disabled={form.processing}
                >
                    Batal
                </Button>
                {form.recentlySuccessful && (
                    <span role="status" className="text-success text-sm">
                        Tersimpan
                    </span>
                )}
            </div>
        </form>
    );
}
function RateEditor({
    building,
    rate,
    onClose,
}: {
    building: Building;
    rate?: Rate;
    onClose: () => void;
}) {
    const enabled = types.filter(
        (type) =>
            building.room_types == null ||
            building.room_types.some(
                (definition) => definition.type === type && definition.enabled,
            ),
    );
    const form = useForm({
        gedung_id: building.id,
        tipe_kamar: rate?.tipe_kamar ?? enabled[0] ?? '',
        unit: rate?.unit ?? 'year',
        amount: rate?.amount ?? '',
        student_amount: rate?.student_amount ?? '',
        room_amount: rate?.room_amount ?? '',
    });
    return (
        <form
            className="space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                form.transform((data) => ({
                    ...data,
                    amount: Number(data.amount),
                    student_amount:
                        data.student_amount === ''
                            ? null
                            : Number(data.student_amount),
                    room_amount:
                        data.room_amount === ''
                            ? null
                            : Number(data.room_amount),
                }));
                form.post(save.url('rate'), {
                    preserveScroll: true,
                    onSuccess: onClose,
                });
            }}
        >
            <h3 className="font-semibold">
                {rate ? 'Edit tarif' : 'Tambah tarif'}
            </h3>
            <p className="text-muted text-sm">
                Satu tarif untuk setiap kombinasi tipe dan satuan. Menyimpan
                kombinasi yang sama memperbarui tarifnya.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Tipe kamar">
                    <select
                        aria-label="Tipe tarif"
                        required
                        disabled={!!rate}
                        className={selectClass}
                        value={form.data.tipe_kamar}
                        onChange={(event) =>
                            form.setData('tipe_kamar', event.target.value)
                        }
                    >
                        <option value="">Pilih tipe aktif</option>
                        {Array.from(
                            new Set([
                                ...enabled,
                                ...(rate ? [rate.tipe_kamar] : []),
                            ]),
                        ).map((type) => (
                            <option key={type} value={type}>
                                {label(type)}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Satuan tarif">
                    <select
                        aria-label="Satuan tarif"
                        disabled={!!rate}
                        className={selectClass}
                        value={form.data.unit}
                        onChange={(event) =>
                            form.setData('unit', event.target.value)
                        }
                    >
                        <option value="year">Tahun</option>
                        <option value="month">Bulan</option>
                        <option value="day">Hari</option>
                    </select>
                </FormField>
            </div>
            {(['amount', 'student_amount', 'room_amount'] as const).map(
                (field) => (
                    <FormField
                        key={field}
                        label={
                            {
                                amount: 'Tarif per orang / umum (Rp)',
                                student_amount:
                                    'Tarif harian mahasiswa (Rp, opsional)',
                                room_amount:
                                    'Tarif tahunan per kamar (Rp, opsional)',
                            }[field]
                        }
                    >
                        <input
                            aria-label={field}
                            type="number"
                            min={0}
                            step={1}
                            required={field === 'amount'}
                            className={inputClass}
                            value={form.data[field]}
                            onChange={(event) =>
                                form.setData(field, event.target.value)
                            }
                        />
                    </FormField>
                ),
            )}
            <Errors errors={form.errors} />
            <div className="flex gap-2">
                <Button type="submit" disabled={form.processing}>
                    Simpan tarif
                </Button>
                <Button type="button" variant="secondary" onClick={onClose}>
                    Batal
                </Button>
            </div>
        </form>
    );
}
function FacilityEditor({
    building,
    facility,
    onClose,
}: {
    building: Building;
    facility?: Facility;
    onClose: () => void;
}) {
    const form = useForm({
        id: facility?.id ?? '',
        gedung_id: building.id,
        nama_fasilitas: facility?.nama_fasilitas ?? '',
        kategori: facility?.kategori ?? '',
        kondisi: facility?.kondisi ?? 'baik',
        lantai_id: facility?.lantai_id ?? '',
    });
    return (
        <form
            className="space-y-3"
            onSubmit={(event) => {
                event.preventDefault();
                form.post(save.url('facility'), {
                    preserveScroll: true,
                    onSuccess: onClose,
                });
            }}
        >
            <h3 className="font-semibold">
                {facility ? 'Edit fasilitas' : 'Tambah fasilitas umum'}
            </h3>
            <FormField label="Nama fasilitas">
                <input
                    aria-label="Nama fasilitas"
                    required
                    maxLength={100}
                    className={inputClass}
                    value={form.data.nama_fasilitas}
                    onChange={(event) =>
                        form.setData('nama_fasilitas', event.target.value)
                    }
                />
            </FormField>
            <FormField
                label="Kategori"
                hint="Contoh: Dapur, ruang belajar, area bersama."
            >
                <input
                    aria-label="Kategori fasilitas"
                    required
                    maxLength={50}
                    className={inputClass}
                    value={form.data.kategori}
                    onChange={(event) =>
                        form.setData('kategori', event.target.value)
                    }
                />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Lokasi">
                    <select
                        aria-label="Lokasi fasilitas"
                        className={selectClass}
                        value={form.data.lantai_id}
                        onChange={(event) =>
                            form.setData('lantai_id', event.target.value)
                        }
                    >
                        <option value="">Area gedung</option>
                        {building.lantai?.map((floor) => (
                            <option key={floor.id} value={floor.id}>
                                {floor.nama_lantai}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Kondisi">
                    <select
                        aria-label="Kondisi fasilitas"
                        className={selectClass}
                        value={form.data.kondisi}
                        onChange={(event) =>
                            form.setData('kondisi', event.target.value)
                        }
                    >
                        <option value="baik">Baik</option>
                        <option value="rusak_ringan">Rusak ringan</option>
                        <option value="rusak_berat">Rusak berat</option>
                    </select>
                </FormField>
            </div>
            <Errors errors={form.errors} />
            <div className="flex gap-2">
                <Button type="submit" disabled={form.processing}>
                    Simpan fasilitas
                </Button>
                <Button type="button" variant="secondary" onClick={onClose}>
                    Batal
                </Button>
            </div>
        </form>
    );
}

export default function BuildingWorkspace({
    building,
    rates = [],
    canManage = false,
    canManageAvailability = false,
    initialStep = 0,
}: {
    building: Building;
    rates?: Rate[];
    canManage?: boolean;
    canManageAvailability?: boolean;
    initialStep?: number;
}) {
    const [step, setStep] = useState(initialStep);
    const [editingCategories, setEditingCategories] = useState(false);
    const [editingType, setEditingType] = useState<string | null>(null);
    const [rateTarget, setRateTarget] = useState<Rate | 'new' | null>(null);
    const [facilityTarget, setFacilityTarget] = useState<
        Facility | 'new' | null
    >(null);
    const [deleteTarget, setDeleteTarget] = useState<
        | { kind: 'rate'; value: Rate }
        | { kind: 'facility'; value: Facility }
        | null
    >(null);
    const deletion = useForm({});
    const rooms = building.lantai?.flatMap((floor) => floor.kamar ?? []) ?? [];
    return (
        <div className="space-y-5">
            <nav
                aria-label="Tab informasi gedung"
                role="tablist"
                className="border-base-300 flex gap-5 overflow-x-auto border-b"
            >
                {steps.map((title, index) => (
                    <button
                        key={title}
                        id={`building-tab-${index}`}
                        role="tab"
                        type="button"
                        aria-selected={step === index}
                        aria-controls="building-tab-panel"
                        onClick={() => {
                            setStep(index);
                            setEditingCategories(false);
                            setEditingType(null);
                            setRateTarget(null);
                            setFacilityTarget(null);
                        }}
                        className={`shrink-0 border-b-2 px-1 py-3 text-sm font-medium ${step === index ? 'border-primary text-primary' : 'text-muted hover:text-base-content border-transparent'}`}
                    >
                        {title}
                    </button>
                ))}
            </nav>
            <div
                id="building-tab-panel"
                role="tabpanel"
                aria-labelledby={`building-tab-${step}`}
                className="bg-base-100 border-base-300 space-y-6 rounded-xl border p-4 sm:p-5"
            >
                {step === 0 && (
                    <>
                        <Panel
                            title="Informasi dasar"
                            actions={
                                canManage && (
                                    <KelolaBangunan
                                        gedung={[building]}
                                        detail
                                        infoOnly
                                    />
                                )
                            }
                        >
                            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                                <PhotoCarousel
                                    photos={photoPaths(building)}
                                    title={building.nama_gedung}
                                />
                                <div className="overflow-x-auto">
                                    <table className="table-sm table">
                                        <tbody>
                                            {[
                                                [
                                                    'Kode gedung',
                                                    building.kode_gedung,
                                                ],
                                                [
                                                    'Peruntukan',
                                                    {
                                                        laki_laki: 'Laki-laki',
                                                        perempuan: 'Perempuan',
                                                        campur: 'Campuran',
                                                    }[
                                                        building.gender_peruntukan ??
                                                            'campur'
                                                    ],
                                                ],
                                                [
                                                    'Alamat',
                                                    building.alamat ||
                                                        'Belum diisi',
                                                ],
                                                [
                                                    'Deskripsi',
                                                    building.deskripsi ||
                                                        'Belum diisi',
                                                ],
                                            ].map(([title, value]) => (
                                                <tr key={title}>
                                                    <th
                                                        scope="row"
                                                        className="text-muted w-44 align-top font-medium"
                                                    >
                                                        {title}
                                                    </th>
                                                    <td className="whitespace-pre-wrap">
                                                        {value}
                                                    </td>
                                                    <td />
                                                </tr>
                                            ))}
                                            <tr>
                                                <th
                                                    scope="row"
                                                    className="text-muted align-top font-medium"
                                                >
                                                    Kategori penghuni
                                                </th>
                                                <td>
                                                    {building.allowed_categories ==
                                                    null
                                                        ? 'Semua kategori (belum dibatasi).'
                                                        : building.allowed_categories
                                                              .map(
                                                                  (category) =>
                                                                      categories[
                                                                          category
                                                                      ] ??
                                                                      category,
                                                              )
                                                              .join(' / ') ||
                                                          'Tidak menerima kategori penghuni.'}
                                                </td>
                                                <td className="text-right">
                                                    {canManage && (
                                                        <IconButton
                                                            label="Edit kategori"
                                                            icon={Pencil}
                                                            tone="text-warning hover:bg-warning/10"
                                                            onClick={() =>
                                                                setEditingCategories(
                                                                    true,
                                                                )
                                                            }
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                            <tr>
                                                <th
                                                    scope="row"
                                                    className="text-muted font-medium"
                                                >
                                                    Jumlah lantai
                                                </th>
                                                <td colSpan={2}>
                                                    {building.lantai?.length ??
                                                        0}
                                                </td>
                                            </tr>
                                            <tr>
                                                <th
                                                    scope="row"
                                                    className="text-muted font-medium"
                                                >
                                                    Jumlah kamar
                                                </th>
                                                <td colSpan={2}>
                                                    {rooms.length}
                                                </td>
                                            </tr>
                                            <tr>
                                                <th
                                                    scope="row"
                                                    className="text-muted font-medium"
                                                >
                                                    Kapasitas penghuni
                                                </th>
                                                <td colSpan={2}>
                                                    {rooms.reduce(
                                                        (sum, room) =>
                                                            sum +
                                                            room.kapasitas,
                                                        0,
                                                    )}{' '}
                                                    orang
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Panel>
                        <Panel title="Master tipe kamar">
                            <div className="overflow-x-auto">
                                <table className="table-sm table">
                                    <thead>
                                        <tr>
                                            <th>Tipe</th>
                                            <th>Tersedia</th>
                                            <th>Kapasitas maksimal</th>
                                            <th>Fasilitas master</th>
                                            {canManage && (
                                                <th className="text-right">
                                                    Aksi
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {types.map((type) => {
                                            const definition =
                                                building.room_types?.find(
                                                    (item) =>
                                                        item.type === type,
                                                ) ?? {
                                                    type,
                                                    enabled:
                                                        building.room_types ==
                                                        null,
                                                    max_capacity: null,
                                                    facilities: '',
                                                };
                                            return (
                                                <tr key={type}>
                                                    <td className="font-medium">
                                                        {label(type)}
                                                    </td>
                                                    <td>
                                                        {definition.enabled
                                                            ? 'Ya'
                                                            : 'Tidak'}
                                                    </td>
                                                    <td>
                                                        {definition.max_capacity ==
                                                        null
                                                            ? 'Belum dibatasi'
                                                            : `${definition.max_capacity} orang`}
                                                    </td>
                                                    <td className="max-w-sm whitespace-pre-wrap">
                                                        {definition.facilities ||
                                                            'Belum diisi'}
                                                    </td>
                                                    {canManage && (
                                                        <td className="text-right">
                                                            <IconButton
                                                                label={`Edit tipe ${label(type)}`}
                                                                icon={Pencil}
                                                                tone="text-warning hover:bg-warning/10"
                                                                onClick={() =>
                                                                    setEditingType(
                                                                        type,
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>
                        <Panel
                            title="Tarif hunian"
                            actions={
                                canManage && (
                                    <Button
                                        size="sm"
                                        onClick={() => setRateTarget('new')}
                                    >
                                        Tambah tarif
                                    </Button>
                                )
                            }
                        >
                            <div className="overflow-x-auto">
                                <table className="table-sm table">
                                    <thead>
                                        <tr>
                                            <th>Tipe</th>
                                            <th>Satuan</th>
                                            <th className="text-right">
                                                Per orang / umum
                                            </th>
                                            <th className="text-right">
                                                Harian mahasiswa
                                            </th>
                                            <th className="text-right">
                                                Tahunan per kamar
                                            </th>
                                            {canManage && (
                                                <th className="text-right">
                                                    Aksi
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rates.length ? (
                                            rates.map((rate) => (
                                                <tr key={rate.id}>
                                                    <td>
                                                        {label(rate.tipe_kamar)}
                                                    </td>
                                                    <td>
                                                        {
                                                            {
                                                                year: 'Tahun',
                                                                month: 'Bulan',
                                                                day: 'Hari',
                                                            }[rate.unit]
                                                        }
                                                    </td>
                                                    <td className="text-right tabular-nums">
                                                        {formatRupiah(
                                                            Number(rate.amount),
                                                        )}
                                                    </td>
                                                    <td className="text-right tabular-nums">
                                                        {rate.student_amount ==
                                                        null
                                                            ? 'Belum diisi'
                                                            : formatRupiah(
                                                                  Number(
                                                                      rate.student_amount,
                                                                  ),
                                                              )}
                                                    </td>
                                                    <td className="text-right tabular-nums">
                                                        {rate.room_amount ==
                                                        null
                                                            ? 'Belum diisi'
                                                            : formatRupiah(
                                                                  Number(
                                                                      rate.room_amount,
                                                                  ),
                                                              )}
                                                    </td>
                                                    {canManage && (
                                                        <td>
                                                            <div className="flex justify-end gap-1">
                                                                <IconButton
                                                                    label="Edit tarif"
                                                                    icon={
                                                                        Pencil
                                                                    }
                                                                    tone="text-warning hover:bg-warning/10"
                                                                    onClick={() =>
                                                                        setRateTarget(
                                                                            rate,
                                                                        )
                                                                    }
                                                                />
                                                                <IconButton
                                                                    label="Hapus"
                                                                    icon={
                                                                        Trash2
                                                                    }
                                                                    tone="text-error hover:bg-error/10"
                                                                    onClick={() =>
                                                                        setDeleteTarget(
                                                                            {
                                                                                kind: 'rate',
                                                                                value: rate,
                                                                            },
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan={canManage ? 6 : 5}
                                                    className="text-muted"
                                                >
                                                    Belum ada tarif tercatat.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>
                        <Panel
                            title="Fasilitas umum"
                            actions={
                                canManage && (
                                    <Button
                                        size="sm"
                                        onClick={() => setFacilityTarget('new')}
                                    >
                                        Tambah fasilitas
                                    </Button>
                                )
                            }
                        >
                            <div className="overflow-x-auto">
                                <table className="table-sm table">
                                    <thead>
                                        <tr>
                                            <th>Nama fasilitas</th>
                                            <th>Kategori</th>
                                            <th>Lokasi</th>
                                            <th>Kondisi</th>
                                            {canManage && (
                                                <th className="text-right">
                                                    Aksi
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {building.fasilitas_umum?.length ? (
                                            building.fasilitas_umum.map(
                                                (facility) => (
                                                    <tr key={facility.id}>
                                                        <td className="font-medium">
                                                            {
                                                                facility.nama_fasilitas
                                                            }
                                                        </td>
                                                        <td>
                                                            {facility.kategori}
                                                        </td>
                                                        <td>
                                                            {building.lantai?.find(
                                                                (floor) =>
                                                                    floor.id ===
                                                                    facility.lantai_id,
                                                            )?.nama_lantai ??
                                                                'Area gedung'}
                                                        </td>
                                                        <td>
                                                            <StatusBadge
                                                                status={
                                                                    facility.kondisi
                                                                }
                                                            />
                                                        </td>
                                                        {canManage && (
                                                            <td>
                                                                <div className="flex justify-end gap-1">
                                                                    <IconButton
                                                                        label="Edit fasilitas"
                                                                        icon={
                                                                            Pencil
                                                                        }
                                                                        tone="text-warning hover:bg-warning/10"
                                                                        onClick={() =>
                                                                            setFacilityTarget(
                                                                                facility,
                                                                            )
                                                                        }
                                                                    />
                                                                    <IconButton
                                                                        label="Hapus"
                                                                        icon={
                                                                            Trash2
                                                                        }
                                                                        tone="text-error hover:bg-error/10"
                                                                        onClick={() =>
                                                                            setDeleteTarget(
                                                                                {
                                                                                    kind: 'facility',
                                                                                    value: facility,
                                                                                },
                                                                            )
                                                                        }
                                                                    />
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ),
                                            )
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan={canManage ? 5 : 4}
                                                    className="text-muted"
                                                >
                                                    Belum ada fasilitas umum
                                                    yang didata.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>
                    </>
                )}
                {step === 1 &&
                    (canManage ? (
                        <KelolaBangunan gedung={[building]} detail />
                    ) : (
                        <>
                            {canManageAvailability ? (
                                <FloorAvailability
                                    floors={building.lantai ?? []}
                                />
                            ) : (
                                <Panel title="Lantai">
                                    <div className="overflow-x-auto">
                                        <table className="table-sm table">
                                            <thead>
                                                <tr>
                                                    <th>Lantai</th>
                                                    <th>Jumlah kamar</th>
                                                    <th>Kapasitas</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {building.lantai?.length ? (
                                                    building.lantai.map(
                                                        (floor) => (
                                                            <tr key={floor.id}>
                                                                <td>
                                                                    <Link
                                                                        className="link link-primary"
                                                                        href={floorShow.url(
                                                                            floor.id,
                                                                        )}
                                                                    >
                                                                        {
                                                                            floor.nama_lantai
                                                                        }
                                                                    </Link>
                                                                </td>
                                                                <td>
                                                                    {floor.kamar
                                                                        ?.length ??
                                                                        0}
                                                                </td>
                                                                <td>
                                                                    {floor.kamar?.reduce(
                                                                        (
                                                                            sum,
                                                                            room,
                                                                        ) =>
                                                                            sum +
                                                                            room.kapasitas,
                                                                        0,
                                                                    ) ?? 0}
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )
                                                ) : (
                                                    <tr>
                                                        <td
                                                            colSpan={3}
                                                            className="text-muted"
                                                        >
                                                            Belum ada lantai
                                                            tercatat.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Panel>
                            )}
                            <Panel title="Kamar">
                                <div className="overflow-x-auto">
                                    <table className="table-sm table">
                                        <thead>
                                            <tr>
                                                <th>Kamar</th>
                                                <th>Lantai</th>
                                                <th>Tipe</th>
                                                <th>Kapasitas</th>
                                                <th>Penghuni aktif</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rooms.length ? (
                                                building.lantai?.flatMap(
                                                    (floor) =>
                                                        (floor.kamar ?? []).map(
                                                            (room) => (
                                                                <tr
                                                                    key={
                                                                        room.id
                                                                    }
                                                                >
                                                                    <td>
                                                                        <div className="flex items-center gap-2">
                                                                            {room.foto && (
                                                                                <img
                                                                                    src={`/storage/${room.foto}`}
                                                                                    alt={`Kamar ${room.nomor_kamar}`}
                                                                                    className="size-10 rounded object-cover"
                                                                                />
                                                                            )}
                                                                            <Link
                                                                                className="link link-primary"
                                                                                href={roomShow.url(
                                                                                    room.id,
                                                                                )}
                                                                            >
                                                                                {
                                                                                    room.nomor_kamar
                                                                                }
                                                                            </Link>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        {
                                                                            floor.nama_lantai
                                                                        }
                                                                    </td>
                                                                    <td>
                                                                        {label(
                                                                            room.tipe_kamar,
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        {
                                                                            room.kapasitas
                                                                        }
                                                                    </td>
                                                                    <td>
                                                                        {room.occupants_count ??
                                                                            0}
                                                                    </td>
                                                                    <td>
                                                                        <StatusBadge
                                                                            status={
                                                                                room.status
                                                                            }
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        ),
                                                )
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan={6}
                                                        className="text-muted"
                                                    >
                                                        Belum ada kamar
                                                        tercatat.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Panel>
                        </>
                    ))}
            </div>
            {canManage && editingCategories && (
                <Drawer
                    open
                    onClose={() => setEditingCategories(false)}
                    title="Edit kategori penghuni"
                    width="max-w-xl"
                >
                    <CategoriesEditor
                        building={building}
                        onClose={() => setEditingCategories(false)}
                    />
                </Drawer>
            )}
            {canManage && editingType && (
                <Modal
                    open
                    onClose={() => setEditingType(null)}
                    title="Edit tipe kamar"
                    width="max-w-xl"
                >
                    <TypeEditor
                        key={editingType}
                        building={building}
                        definition={
                            building.room_types?.find(
                                (item) => item.type === editingType,
                            ) ?? {
                                type: editingType,
                                enabled: building.room_types == null,
                                max_capacity: null,
                                facilities: '',
                            }
                        }
                        onClose={() => setEditingType(null)}
                    />
                </Modal>
            )}
            {canManage && rateTarget && (
                <Drawer
                    open
                    onClose={() => setRateTarget(null)}
                    title={rateTarget === 'new' ? 'Tambah tarif' : 'Edit tarif'}
                    width="max-w-xl"
                >
                    <RateEditor
                        key={rateTarget === 'new' ? 'new' : rateTarget.id}
                        building={building}
                        rate={rateTarget === 'new' ? undefined : rateTarget}
                        onClose={() => setRateTarget(null)}
                    />
                </Drawer>
            )}
            {canManage && facilityTarget && (
                <Modal
                    open
                    onClose={() => setFacilityTarget(null)}
                    title={
                        facilityTarget === 'new'
                            ? 'Tambah fasilitas'
                            : 'Edit fasilitas'
                    }
                    width="max-w-xl"
                >
                    <FacilityEditor
                        key={
                            facilityTarget === 'new' ? 'new' : facilityTarget.id
                        }
                        building={building}
                        facility={
                            facilityTarget === 'new'
                                ? undefined
                                : facilityTarget
                        }
                        onClose={() => setFacilityTarget(null)}
                    />
                </Modal>
            )}
            <Errors errors={deletion.errors} />
            <ConfirmDialog
                open={!!deleteTarget}
                title={
                    deleteTarget?.kind === 'facility'
                        ? 'Hapus fasilitas?'
                        : 'Hapus tarif?'
                }
                message="Data ini akan dihapus. Pastikan sudah tidak diperlukan."
                loading={deletion.processing}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => {
                    if (!deleteTarget) return;
                    deletion.transform(() =>
                        deleteTarget.kind === 'rate'
                            ? {
                                  gedung_id: building.id,
                                  tipe_kamar: deleteTarget.value.tipe_kamar,
                                  unit: deleteTarget.value.unit,
                              }
                            : {
                                  gedung_id: building.id,
                                  id: deleteTarget.value.id,
                              },
                    );
                    deletion.delete(destroy.url(deleteTarget.kind), {
                        preserveScroll: true,
                        onSuccess: () => setDeleteTarget(null),
                        onError: () => setDeleteTarget(null),
                    });
                }}
            />
        </div>
    );
}
