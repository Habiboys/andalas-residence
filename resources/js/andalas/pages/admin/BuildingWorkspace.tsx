import { useState, type ReactNode } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { Building2, BedDouble, ChevronRight } from 'lucide-react';
import { save, destroy } from '@/routes/andalas/residence-management';
import { show as floorShow } from '@/routes/andalas/lantai';
import { show as roomShow } from '@/routes/andalas/kamar';
import { update as buildingUpdate } from '@/routes/andalas/gedung';
import {
    Button,
    Card,
    FormField,
    inputClass,
    selectClass,
    StatusBadge,
    ConfirmDialog,
} from '../../components/ui';
import { formatRupiah } from '../../lib/format';
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
    occupants_count?: number;
    tarif_per_periode?: string;
};
type Floor = {
    id: string;
    nomor_lantai: number;
    nama_lantai: string;
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
const steps = [
    'Informasi dasar',
    'Penghuni & tipe',
    'Tarif hunian',
    'Fasilitas umum',
    'Lantai & kamar',
];

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
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <Card className="space-y-5 p-5">
            <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="text-muted mt-1 text-sm">{description}</p>
            </div>
            {children}
        </Card>
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
                <Button disabled={form.processing}>Simpan kategori</Button>
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
            className="border-base-300 space-y-3 rounded-xl border p-4"
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
                <Button size="sm" disabled={form.processing}>
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
            className="bg-base-200 space-y-4 rounded-xl p-4"
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
                <Button disabled={form.processing}>Simpan tarif</Button>
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
            className="bg-base-200 space-y-3 rounded-xl p-4"
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
                <Button disabled={form.processing}>Simpan fasilitas</Button>
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
    initialStep = 0,
}: {
    building: Building;
    rates?: Rate[];
    canManage?: boolean;
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
    const completed = [
        !!building.nama_gedung,
        !!building.allowed_categories?.length &&
            !!building.room_types?.some((type) => type.enabled),
        rates.length > 0,
        !!building.fasilitas_umum?.length,
        rooms.length > 0,
    ];
    return (
        <div className="space-y-5">
            <Card className="overflow-hidden">
                <div className="grid md:grid-cols-3">
                    {building.foto ? (
                        <img
                            src={`/storage/${building.foto}`}
                            alt={building.nama_gedung}
                            className="h-56 w-full object-cover md:h-full"
                        />
                    ) : (
                        <div className="bg-base-200 text-base-content/30 flex min-h-44 items-center justify-center">
                            <Building2
                                className="size-16"
                                aria-label="Foto gedung belum tersedia"
                            />
                        </div>
                    )}
                    <div className="space-y-4 p-6 md:col-span-2">
                        <span className="badge badge-outline">
                            Gedung {building.kode_gedung}
                        </span>
                        <h2 className="text-2xl font-semibold">
                            {building.nama_gedung}
                        </h2>
                        <p className="text-muted">
                            {building.alamat || 'Alamat belum diisi'}
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                [building.lantai?.length ?? 0, 'Lantai'],
                                [rooms.length, 'Kamar'],
                                [
                                    rooms.reduce(
                                        (sum, room) => sum + room.kapasitas,
                                        0,
                                    ),
                                    'Kapasitas',
                                ],
                            ].map(([value, title]) => (
                                <div
                                    key={title}
                                    className="bg-base-200 rounded-lg p-3"
                                >
                                    <p className="text-xl font-semibold">
                                        {value}
                                    </p>
                                    <p className="text-muted text-xs">
                                        {title}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>
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
                className="space-y-5"
            >
                {step === 0 && (
                    <Panel
                        title="Informasi dasar"
                        description="Identitas gedung dan ringkasan kesiapan pengaturan."
                    >
                        <p className="whitespace-pre-wrap">
                            {building.deskripsi || 'Deskripsi belum diisi.'}
                        </p>
                        <p>
                            Peruntukan:{' '}
                            {
                                {
                                    laki_laki: 'Laki-laki',
                                    perempuan: 'Perempuan',
                                    campur: 'Campuran',
                                }[building.gender_peruntukan ?? 'campur']
                            }
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {steps.slice(1).map((title, index) => (
                                <button
                                    key={title}
                                    className="border-base-300 flex items-center justify-between rounded-lg border p-4 text-left"
                                    onClick={() => setStep(index + 1)}
                                >
                                    <span>
                                        {title}
                                        <span className="text-muted mt-1 block text-xs">
                                            {completed[index + 1]
                                                ? 'Sudah tercatat · lihat atau ubah'
                                                : 'Belum lengkap · lengkapi pengaturan'}
                                        </span>
                                    </span>
                                    <ChevronRight className="size-4" />
                                </button>
                            ))}
                        </div>
                        {canManage && (
                            <KelolaBangunan
                                gedung={[building]}
                                detail
                                infoOnly
                            />
                        )}
                    </Panel>
                )}
                {step === 1 && (
                    <>
                        <Panel
                            title="Kategori penghuni"
                            description="Tentukan siapa yang boleh mendaftar di gedung ini."
                        >
                            {canManage && editingCategories ? (
                                <CategoriesEditor
                                    building={building}
                                    onClose={() => setEditingCategories(false)}
                                />
                            ) : (
                                <>
                                    <div className="flex flex-wrap gap-2">
                                        {building.allowed_categories == null ? (
                                            <p className="text-muted text-sm">
                                                Semua kategori (belum dibatasi).
                                            </p>
                                        ) : building.allowed_categories
                                              .length ? (
                                            building.allowed_categories.map(
                                                (category) => (
                                                    <span
                                                        key={category}
                                                        className="badge badge-ghost h-auto py-2"
                                                    >
                                                        {categories[category] ??
                                                            category}
                                                    </span>
                                                ),
                                            )
                                        ) : (
                                            <p className="text-muted text-sm">
                                                Tidak menerima kategori
                                                penghuni.
                                            </p>
                                        )}
                                    </div>
                                    {canManage && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() =>
                                                setEditingCategories(true)
                                            }
                                        >
                                            Edit kategori
                                        </Button>
                                    )}
                                </>
                            )}
                        </Panel>
                        <Panel
                            title="Master tipe kamar"
                            description="Aktifkan tipe dan tentukan kapasitas serta fasilitas sebelum menambahkan kamar. Fasilitas master adalah standar layanan; inventaris fisik dicatat di menu aset."
                        >
                            <div className="overflow-x-auto">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Tipe kamar</th>
                                            <th>Tersedia</th>
                                            <th>Kapasitas maksimal</th>
                                            <th>Fasilitas master</th>
                                            {canManage && (
                                                <th>
                                                    <span className="sr-only">
                                                        Aksi
                                                    </span>
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
                                                        <span
                                                            className={
                                                                definition.enabled
                                                                    ? 'badge badge-success badge-soft'
                                                                    : 'badge badge-ghost'
                                                            }
                                                        >
                                                            {definition.enabled
                                                                ? 'Ya'
                                                                : 'Tidak'}
                                                        </span>
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
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() =>
                                                                    setEditingType(
                                                                        type,
                                                                    )
                                                                }
                                                                aria-label={`Edit tipe ${label(type)}`}
                                                            >
                                                                Edit
                                                            </Button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {canManage && editingType && (
                                <TypeEditor
                                    key={editingType}
                                    building={building}
                                    definition={
                                        building.room_types?.find(
                                            (item) => item.type === editingType,
                                        ) ?? {
                                            type: editingType,
                                            enabled:
                                                building.room_types == null,
                                            max_capacity: null,
                                            facilities: '',
                                        }
                                    }
                                    onClose={() => setEditingType(null)}
                                />
                            )}
                        </Panel>
                    </>
                )}
                {step === 2 && (
                    <Panel
                        title="Tarif hunian"
                        description="Kelola tarif per tipe kamar dan satuan waktu. Angka dalam rupiah tanpa titik atau koma."
                    >
                        {canManage && (
                            <Button onClick={() => setRateTarget('new')}>
                                Tambah tarif
                            </Button>
                        )}
                        {rateTarget && (
                            <RateEditor
                                key={
                                    rateTarget === 'new' ? 'new' : rateTarget.id
                                }
                                building={building}
                                rate={
                                    rateTarget === 'new'
                                        ? undefined
                                        : rateTarget
                                }
                                onClose={() => setRateTarget(null)}
                            />
                        )}
                        <div className="grid gap-4 lg:grid-cols-2">
                            {rates.map((rate) => (
                                <div
                                    key={rate.id}
                                    className="border-base-300 space-y-3 rounded-xl border p-4"
                                >
                                    <h3 className="font-semibold">
                                        {label(rate.tipe_kamar)}{' '}
                                        <span className="badge badge-ghost">
                                            {
                                                {
                                                    year: 'Tahunan',
                                                    month: 'Bulanan',
                                                    day: 'Harian',
                                                }[rate.unit]
                                            }
                                        </span>
                                    </h3>
                                    <p className="text-primary text-2xl font-semibold">
                                        {formatRupiah(Number(rate.amount))}
                                        <span className="text-muted text-xs font-normal">
                                            {' '}
                                            / orang ·{' '}
                                            {
                                                {
                                                    year: 'tahun',
                                                    month: 'bulan',
                                                    day: 'hari',
                                                }[rate.unit]
                                            }
                                        </span>
                                    </p>
                                    <p className="text-sm">
                                        Harian mahasiswa:{' '}
                                        {rate.student_amount == null
                                            ? 'Belum diisi'
                                            : formatRupiah(
                                                  Number(rate.student_amount),
                                              )}
                                    </p>
                                    <p className="text-sm">
                                        Tahunan per kamar:{' '}
                                        {rate.room_amount == null
                                            ? 'Belum diisi'
                                            : formatRupiah(
                                                  Number(rate.room_amount),
                                              )}
                                    </p>
                                    {canManage && (
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() =>
                                                    setRateTarget(rate)
                                                }
                                            >
                                                Edit tarif
                                            </Button>
                                            <button
                                                className="btn btn-ghost btn-sm text-error"
                                                onClick={() =>
                                                    setDeleteTarget({
                                                        kind: 'rate',
                                                        value: rate,
                                                    })
                                                }
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {rates.length === 0 && (
                            <p className="text-muted">
                                Belum ada tarif. Aktifkan tipe kamar pada tahap
                                sebelumnya, lalu tambahkan tarif.
                            </p>
                        )}
                    </Panel>
                )}
                {step === 3 && (
                    <Panel
                        title="Fasilitas umum"
                        description="Catat fasilitas bersama di gedung atau lantai, seperti dapur, ruang belajar, dan ruang ibadah."
                    >
                        {canManage && (
                            <Button onClick={() => setFacilityTarget('new')}>
                                Tambah fasilitas
                            </Button>
                        )}
                        {facilityTarget && (
                            <FacilityEditor
                                key={
                                    facilityTarget === 'new'
                                        ? 'new'
                                        : facilityTarget.id
                                }
                                building={building}
                                facility={
                                    facilityTarget === 'new'
                                        ? undefined
                                        : facilityTarget
                                }
                                onClose={() => setFacilityTarget(null)}
                            />
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                            {building.fasilitas_umum?.map((facility) => (
                                <div
                                    key={facility.id}
                                    className="border-base-300 space-y-3 rounded-xl border p-4"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="font-semibold">
                                            {facility.nama_fasilitas}
                                        </h3>
                                        <StatusBadge
                                            status={facility.kondisi}
                                        />
                                    </div>
                                    <p className="text-muted text-sm">
                                        {facility.kategori} ·{' '}
                                        {building.lantai?.find(
                                            (floor) =>
                                                floor.id === facility.lantai_id,
                                        )?.nama_lantai ?? 'Area gedung'}
                                    </p>
                                    {canManage && (
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() =>
                                                    setFacilityTarget(facility)
                                                }
                                            >
                                                Edit fasilitas
                                            </Button>
                                            <button
                                                className="btn btn-ghost btn-sm text-error"
                                                onClick={() =>
                                                    setDeleteTarget({
                                                        kind: 'facility',
                                                        value: facility,
                                                    })
                                                }
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {!building.fasilitas_umum?.length && (
                            <p className="text-muted">
                                Belum ada fasilitas umum yang didata.
                            </p>
                        )}
                    </Panel>
                )}
                {step === 4 && (
                    <Panel
                        title="Lantai dan kamar"
                        description="Tambahkan lantai, lalu kamar beserta foto dan kapasitasnya. Buka detail kamar untuk melihat fasilitas, aset, dan penghuni."
                    >
                        {canManage ? (
                            <KelolaBangunan gedung={[building]} detail />
                        ) : (
                            building.lantai?.map((floor) => (
                                <div key={floor.id} className="space-y-3">
                                    <Link
                                        className="link link-primary font-semibold"
                                        href={floorShow.url(floor.id)}
                                    >
                                        {floor.nama_lantai}
                                    </Link>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {floor.kamar?.map((room) => (
                                            <Link
                                                key={room.id}
                                                href={roomShow.url(room.id)}
                                                className="border-base-300 overflow-hidden rounded-xl border"
                                            >
                                                {room.foto ? (
                                                    <img
                                                        src={`/storage/${room.foto}`}
                                                        alt={`Kamar ${room.nomor_kamar}`}
                                                        className="h-40 w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="bg-base-200 text-base-content/30 flex h-32 items-center justify-center">
                                                        <BedDouble className="size-10" />
                                                    </div>
                                                )}
                                                <div className="space-y-2 p-4">
                                                    <h3 className="font-semibold">
                                                        Kamar {room.nomor_kamar}
                                                    </h3>
                                                    <p className="text-muted text-sm">
                                                        {label(room.tipe_kamar)}{' '}
                                                        · {room.kapasitas} orang
                                                    </p>
                                                    <StatusBadge
                                                        status={room.status}
                                                    />
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                        {!building.lantai?.length && !canManage && (
                            <p>Belum ada lantai tercatat.</p>
                        )}
                    </Panel>
                )}
            </div>
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
