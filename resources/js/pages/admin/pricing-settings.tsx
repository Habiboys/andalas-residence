import { Head, router, useForm } from '@inertiajs/react';
import {
    Banknote,
    Building2,
    Calculator,
    Pencil,
    Save,
    Trash2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
    Button,
    ConfirmDialog,
    FormField,
    inputClass,
    selectClass,
} from '@/andalas/components/ui';
import { formatRupiah } from '@/andalas/lib/format';

type RoomTypeOption = {
    code: string;
    name: string;
    has_rooms?: boolean;
};

type BuildingOption = {
    id: string;
    kode_gedung: string;
    nama_gedung: string;
    gender: string;
    room_types: RoomTypeOption[];
};

type RateRow = {
    id: string;
    gedung_id: string;
    kode_gedung: string;
    nama_gedung: string;
    category: string;
    tipe_kamar: string;
    unit: string;
    amount: number;
    room_amount: number | null;
    student_amount: number | null;
};

type CategoryOption = {
    value: string;
    label: string;
};

const UNIT_LABELS: Record<string, string> = {
    day: 'Harian',
    month: 'Bulanan',
    semester: 'Per 6 Bulan',
    year: 'Tahunan',
};

const GENDER_LABELS: Record<string, string> = {
    laki_laki: 'Putra',
    perempuan: 'Putri',
    campur: 'Campur',
};

function findComboRates(
    rates: RateRow[],
    gedungId: string,
    tipeKamar: string,
    category: string,
) {
    const byUnit: Record<string, RateRow | undefined> = {};
    for (const unit of ['day', 'month', 'semester', 'year']) {
        byUnit[unit] = rates.find(
            (r) =>
                r.gedung_id === gedungId &&
                r.tipe_kamar === tipeKamar &&
                r.category === category &&
                r.unit === unit,
        );
    }
    return byUnit;
}

export default function PricingSettings({
    buildings = [],
    roomTypes = [],
    rates = [],
    categories = [],
}: {
    buildings?: BuildingOption[];
    roomTypes?: RoomTypeOption[];
    rates?: RateRow[];
    categories?: CategoryOption[];
}) {
    const editorRef = useRef<HTMLElement | null>(null);
    const [matrixCategory, setMatrixCategory] = useState('default');
    const [matrixSearch, setMatrixSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterBuilding, setFilterBuilding] = useState('all');
    const [filterUnit, setFilterUnit] = useState('all');
    const [deleteTarget, setDeleteTarget] = useState<RateRow | null>(null);

    const firstBuilding = buildings[0];
    const initialGedungId = firstBuilding?.id ?? '';
    const initialType =
        firstBuilding?.room_types[0]?.code ?? roomTypes[0]?.code ?? '';
    const initialRates = findComboRates(
        rates,
        initialGedungId,
        initialType,
        'default',
    );

    const form = useForm({
        category: 'default',
        gedung_id: initialGedungId,
        tipe_kamar: initialType,
        day_amount: initialRates.day ? String(initialRates.day.amount) : '',
        day_student_amount:
            initialRates.day?.student_amount != null
                ? String(initialRates.day.student_amount)
                : '',
        day_room_amount:
            initialRates.day?.room_amount != null
                ? String(initialRates.day.room_amount)
                : '',
        month_amount: initialRates.month
            ? String(initialRates.month.amount)
            : '',
        month_room_amount:
            initialRates.month?.room_amount != null
                ? String(initialRates.month.room_amount)
                : '',
        semester_amount: initialRates.semester
            ? String(initialRates.semester.amount)
            : '',
        semester_room_amount:
            initialRates.semester?.room_amount != null
                ? String(initialRates.semester.room_amount)
                : '',
        year_amount: initialRates.year ? String(initialRates.year.amount) : '',
        year_room_amount:
            initialRates.year?.room_amount != null
                ? String(initialRates.year.room_amount)
                : '',
        auto_fill_semester: true,
        sync_policies: true,
    });

    const categoryLabelMap = useMemo(
        () => Object.fromEntries(categories.map((c) => [c.value, c.label])),
        [categories],
    );
    const typeLabelMap = useMemo(
        () => Object.fromEntries(roomTypes.map((t) => [t.code, t.name])),
        [roomTypes],
    );

    const selectedBuilding = buildings.find(
        (b) => b.id === form.data.gedung_id,
    );
    const selectableTypes =
        selectedBuilding && selectedBuilding.room_types.length > 0
            ? selectedBuilding.room_types
            : roomTypes;

    const loadComboIntoEditor = (
        gedungId: string,
        tipeKamar: string,
        category: string,
        scrollToEditor = false,
    ) => {
        const combo = findComboRates(rates, gedungId, tipeKamar, category);
        form.setData((prev) => ({
            ...prev,
            category,
            gedung_id: gedungId,
            tipe_kamar: tipeKamar,
            day_amount: combo.day ? String(combo.day.amount) : '',
            day_student_amount:
                combo.day?.student_amount != null
                    ? String(combo.day.student_amount)
                    : '',
            day_room_amount:
                combo.day?.room_amount != null
                    ? String(combo.day.room_amount)
                    : '',
            month_amount: combo.month ? String(combo.month.amount) : '',
            month_room_amount:
                combo.month?.room_amount != null
                    ? String(combo.month.room_amount)
                    : '',
            semester_amount: combo.semester
                ? String(combo.semester.amount)
                : '',
            semester_room_amount:
                combo.semester?.room_amount != null
                    ? String(combo.semester.room_amount)
                    : '',
            year_amount: combo.year ? String(combo.year.amount) : '',
            year_room_amount:
                combo.year?.room_amount != null
                    ? String(combo.year.room_amount)
                    : '',
            auto_fill_semester: !combo.semester,
        }));
        if (scrollToEditor) {
            editorRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }
    };

    const buildingMatrixRows = useMemo(() => {
        const q = matrixSearch.trim().toLowerCase();
        const items: Array<{
            key: string;
            building: BuildingOption;
            typeCode: string;
            typeName: string;
            day: RateRow | undefined;
            month: RateRow | undefined;
            semester: RateRow | undefined;
            year: RateRow | undefined;
            derivedSemesterAmount: number | null;
            derivedSemesterRoom: number | null;
        }> = [];

        for (const building of buildings) {
            if (
                matrixCategory === 'asn' &&
                building.kode_gedung.toUpperCase() !== 'ASN'
            ) {
                continue;
            }
            if (
                q &&
                !`${building.nama_gedung} ${building.kode_gedung}`
                    .toLowerCase()
                    .includes(q)
            ) {
                continue;
            }
            const typesToShow =
                building.room_types.length > 0
                    ? building.room_types
                    : roomTypes;
            for (const rt of typesToShow) {
                const pick = (unit: string) => {
                    const specific = rates.find(
                        (r) =>
                            r.gedung_id === building.id &&
                            r.tipe_kamar === rt.code &&
                            r.category === matrixCategory &&
                            r.unit === unit,
                    );
                    if (specific) return specific;
                    if (matrixCategory !== 'default') {
                        return rates.find(
                            (r) =>
                                r.gedung_id === building.id &&
                                r.tipe_kamar === rt.code &&
                                r.category === 'default' &&
                                r.unit === unit,
                        );
                    }
                    return undefined;
                };

                const day = pick('day');
                const month = pick('month');
                const semester = pick('semester');
                const year = pick('year');
                const derivedSemesterAmount =
                    !semester &&
                    year &&
                    year.amount > 0 &&
                    !['local_kipk', 'summer_course'].includes(matrixCategory)
                        ? Math.round(year.amount / 2)
                        : null;
                const derivedSemesterRoom =
                    !semester &&
                    year?.room_amount &&
                    year.room_amount > 0 &&
                    !['local_kipk', 'summer_course'].includes(matrixCategory)
                        ? Math.round(year.room_amount / 2)
                        : null;

                items.push({
                    key: `${building.id}-${rt.code}`,
                    building,
                    typeCode: rt.code,
                    typeName: rt.name,
                    day,
                    month,
                    semester,
                    year,
                    derivedSemesterAmount,
                    derivedSemesterRoom,
                });
            }
        }

        return items;
    }, [buildings, roomTypes, rates, matrixCategory, matrixSearch]);

    const filteredRates = useMemo(
        () =>
            rates.filter((row) => {
                if (
                    filterCategory !== 'all' &&
                    row.category !== filterCategory
                ) {
                    return false;
                }
                if (
                    filterBuilding !== 'all' &&
                    row.gedung_id !== filterBuilding
                ) {
                    return false;
                }
                if (filterUnit !== 'all' && row.unit !== filterUnit) {
                    return false;
                }

                return true;
            }),
        [rates, filterCategory, filterBuilding, filterUnit],
    );

    const handleBatchSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        form.post('/admin/pengaturan-harga/batch', {
            preserveScroll: true,
        });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        router.delete(`/admin/pengaturan-harga/${deleteTarget.id}`, {
            preserveScroll: true,
            onFinish: () => setDeleteTarget(null),
        });
    };

    const computedHalfYearPerson =
        Number(form.data.year_amount) > 0
            ? Math.round(Number(form.data.year_amount) / 2)
            : 0;
    const computedHalfYearRoom =
        Number(form.data.year_room_amount) > 0
            ? Math.round(Number(form.data.year_room_amount) / 2)
            : 0;

    return (
        <div className="space-y-6">
            <Head title="Pengaturan Harga Gedung" />

            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold">
                        <Banknote className="text-primary size-6" />
                        Pengaturan Harga Gedung
                    </h1>
                    <p className="text-base-content/70 mt-1 max-w-3xl text-sm">
                        Kelola seluruh harga gedung (Per Hari, Per Bulan, Per 6
                        Bulan, dan Per Tahun) beserta skema Per Orang maupun
                        Eksklusif 1 Kamar langsung dari satu halaman tanpa perlu
                        masuk ke detail masing-masing gedung.
                    </p>
                </div>
            </div>

            <div className="alert alert-info text-xs sm:text-sm">
                <Calculator className="size-4 shrink-0" />
                <div>
                    <strong>
                        Sinkronisasi otomatis ke Beranda &amp; Pendaftaran:
                    </strong>{' '}
                    Tarif <strong>Default (Semua Kategori)</strong> digunakan
                    sebagai acuan seluruh kategori kecuali Anda menambahkan
                    tarif khusus per kategori. Tarif{' '}
                    <strong>Per 6 Bulan</strong> otomatis bernilai{' '}
                    <strong>Tahunan ÷ 2</strong> untuk mahasiswa hunian
                    (non-maba) bila tidak diisi secara khusus.
                </div>
            </div>

            {/* Section 1: Matriks Ringkasan Harga per Gedung */}
            <section className="border-base-300 bg-base-100 space-y-4 rounded-2xl border p-5 shadow-xs">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="flex items-center gap-2 text-base font-semibold">
                            <Building2 className="text-primary size-4" />
                            Matriks Harga per Gedung
                        </h2>
                        <p className="text-base-content/60 text-xs">
                            Klik <strong>Atur Harga</strong> pada baris gedung
                            untuk langsung mengisi atau mengubah tarif Harian,
                            Bulanan, Per 6 Bulan, dan Tahunan sekaligus.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <select
                            aria-label="Pilih kategori matriks"
                            className="select select-bordered select-sm"
                            value={matrixCategory}
                            onChange={(e) => setMatrixCategory(e.target.value)}
                        >
                            {categories.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                        <input
                            type="search"
                            aria-label="Cari gedung"
                            className="input input-bordered input-sm w-48"
                            placeholder="Cari nama / kode gedung..."
                            value={matrixSearch}
                            onChange={(e) => setMatrixSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table-sm table w-full">
                        <thead className="bg-base-200/70">
                            <tr>
                                <th>Gedung</th>
                                <th>Tipe Kamar</th>
                                <th className="text-right">Per Hari</th>
                                <th className="text-right">Per Bulan</th>
                                <th className="text-right">Per 6 Bulan</th>
                                <th className="text-right">Per Tahun</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {buildingMatrixRows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="text-base-content/60 py-8 text-center text-sm"
                                    >
                                        Tidak ada gedung yang cocok dengan
                                        filter.
                                    </td>
                                </tr>
                            ) : (
                                buildingMatrixRows.map((row) => (
                                    <tr key={row.key}>
                                        <td>
                                            <div className="font-semibold">
                                                {row.building.nama_gedung}
                                            </div>
                                            <div className="text-base-content/55 text-xs">
                                                Kode {row.building.kode_gedung}{' '}
                                                ·{' '}
                                                {GENDER_LABELS[
                                                    row.building.gender
                                                ] ?? row.building.gender}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="font-medium">
                                                {row.typeName}
                                            </span>
                                        </td>
                                        <td className="text-right whitespace-nowrap">
                                            {row.day ? (
                                                <div>
                                                    <span className="font-semibold">
                                                        {formatRupiah(
                                                            row.day.amount,
                                                        )}
                                                    </span>
                                                    {row.day.student_amount !=
                                                        null && (
                                                        <span className="text-base-content/60 block text-[11px]">
                                                            Mhs:{' '}
                                                            {formatRupiah(
                                                                row.day
                                                                    .student_amount,
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-base-content/40">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-right whitespace-nowrap">
                                            {row.month ? (
                                                <div>
                                                    <span className="font-semibold">
                                                        {formatRupiah(
                                                            row.month.amount,
                                                        )}
                                                    </span>
                                                    {row.month.room_amount !=
                                                        null &&
                                                        row.month.room_amount >
                                                            0 && (
                                                            <span className="text-base-content/60 block text-[11px]">
                                                                1 kamar:{' '}
                                                                {formatRupiah(
                                                                    row.month
                                                                        .room_amount,
                                                                )}
                                                            </span>
                                                        )}
                                                </div>
                                            ) : (
                                                <span className="text-base-content/40">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-right whitespace-nowrap">
                                            {row.semester ? (
                                                <div>
                                                    <span className="text-primary font-semibold">
                                                        {formatRupiah(
                                                            row.semester.amount,
                                                        )}
                                                    </span>
                                                    {row.semester.room_amount !=
                                                        null &&
                                                        row.semester
                                                            .room_amount >
                                                            0 && (
                                                            <span className="text-base-content/60 block text-[11px]">
                                                                1 kamar:{' '}
                                                                {formatRupiah(
                                                                    row.semester
                                                                        .room_amount,
                                                                )}
                                                            </span>
                                                        )}
                                                </div>
                                            ) : row.derivedSemesterAmount !=
                                              null ? (
                                                <div>
                                                    <span className="text-primary/80 font-medium">
                                                        {formatRupiah(
                                                            row.derivedSemesterAmount,
                                                        )}
                                                    </span>
                                                    <span className="text-base-content/55 block text-[11px]">
                                                        Otomatis (÷ 2)
                                                        {row.derivedSemesterRoom
                                                            ? ` · 1 kamar: ${formatRupiah(row.derivedSemesterRoom)}`
                                                            : ''}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-base-content/40">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-right whitespace-nowrap">
                                            {row.year ? (
                                                <div>
                                                    <span className="font-semibold">
                                                        {formatRupiah(
                                                            row.year.amount,
                                                        )}
                                                    </span>
                                                    {row.year.room_amount !=
                                                        null &&
                                                        row.year.room_amount >
                                                            0 && (
                                                            <span className="text-base-content/60 block text-[11px]">
                                                                1 kamar:{' '}
                                                                {formatRupiah(
                                                                    row.year
                                                                        .room_amount,
                                                                )}
                                                            </span>
                                                        )}
                                                </div>
                                            ) : (
                                                <span className="text-base-content/40">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-outline btn-xs gap-1"
                                                onClick={() =>
                                                    loadComboIntoEditor(
                                                        row.building.id,
                                                        row.typeCode,
                                                        matrixCategory,
                                                        true,
                                                    )
                                                }
                                            >
                                                <Pencil className="size-3" />
                                                Atur Harga
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Section 2: Editor Cepat 4 Satuan Sekaligus */}
            <section
                ref={editorRef}
                className="border-primary/25 bg-base-100 scroll-mt-24 rounded-2xl border p-5 shadow-xs"
            >
                <div className="mb-4">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                        <Save className="text-primary size-4" />
                        Editor Tarif Gedung (4 Satuan Sekaligus)
                    </h2>
                    <p className="text-base-content/60 mt-0.5 text-xs">
                        Pilih kategori, gedung, dan tipe kamar lalu isi harga
                        Harian, Bulanan, Per 6 Bulan, dan Tahunan dalam satu
                        kali simpan. Kosongkan satuan yang belum ingin diubah.
                    </p>
                </div>

                <form onSubmit={handleBatchSubmit} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                            label="Kategori Penghuni"
                            error={form.errors.category}
                        >
                            <select
                                className={selectClass}
                                value={form.data.category}
                                onChange={(e) => {
                                    const nextCat = e.target.value;
                                    const asnBuilding = buildings.find(
                                        (b) =>
                                            b.kode_gedung.toUpperCase() ===
                                            'ASN',
                                    );
                                    const targetBuildingId =
                                        nextCat === 'asn' && asnBuilding
                                            ? asnBuilding.id
                                            : form.data.gedung_id;
                                    loadComboIntoEditor(
                                        targetBuildingId,
                                        form.data.tipe_kamar,
                                        nextCat,
                                    );
                                }}
                            >
                                {categories.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Gedung" error={form.errors.gedung_id}>
                            <select
                                className={selectClass}
                                value={form.data.gedung_id}
                                onChange={(e) => {
                                    const building = buildings.find(
                                        (b) => b.id === e.target.value,
                                    );
                                    const nextType =
                                        building?.room_types[0]?.code ??
                                        form.data.tipe_kamar;
                                    loadComboIntoEditor(
                                        e.target.value,
                                        nextType,
                                        form.data.category,
                                    );
                                }}
                            >
                                {buildings.map((building) => (
                                    <option
                                        key={building.id}
                                        value={building.id}
                                    >
                                        {building.nama_gedung} (
                                        {building.kode_gedung})
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <FormField
                            label="Tipe Kamar"
                            error={form.errors.tipe_kamar}
                        >
                            <select
                                className={selectClass}
                                value={form.data.tipe_kamar}
                                onChange={(e) =>
                                    loadComboIntoEditor(
                                        form.data.gedung_id,
                                        e.target.value,
                                        form.data.category,
                                    )
                                }
                            >
                                {selectableTypes.map((type) => (
                                    <option key={type.code} value={type.code}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {/* Per Hari */}
                        <div className="border-base-300 bg-base-200/30 space-y-3 rounded-xl border p-4">
                            <p className="text-primary text-xs font-bold tracking-wider uppercase">
                                Tarif Per Hari
                            </p>
                            <FormField
                                label="Per Orang / Umum (Rp)"
                                error={form.errors.day_amount}
                            >
                                <input
                                    type="number"
                                    min={0}
                                    step={1000}
                                    className={inputClass}
                                    placeholder="Contoh: 100000"
                                    value={form.data.day_amount}
                                    onChange={(e) =>
                                        form.setData(
                                            'day_amount',
                                            e.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <FormField
                                label="Khusus Mahasiswa (Rp, opsional)"
                                error={form.errors.day_student_amount}
                            >
                                <input
                                    type="number"
                                    min={0}
                                    step={1000}
                                    className={inputClass}
                                    placeholder="Contoh: 75000"
                                    value={form.data.day_student_amount}
                                    onChange={(e) =>
                                        form.setData(
                                            'day_student_amount',
                                            e.target.value,
                                        )
                                    }
                                />
                            </FormField>
                        </div>

                        {/* Per Bulan */}
                        <div className="border-base-300 bg-base-200/30 space-y-3 rounded-xl border p-4">
                            <p className="text-primary text-xs font-bold tracking-wider uppercase">
                                Tarif Per Bulan
                            </p>
                            <FormField
                                label="Per Orang / Slot (Rp)"
                                error={form.errors.month_amount}
                            >
                                <input
                                    type="number"
                                    min={0}
                                    step={1000}
                                    className={inputClass}
                                    placeholder="Contoh: 300000"
                                    value={form.data.month_amount}
                                    onChange={(e) =>
                                        form.setData(
                                            'month_amount',
                                            e.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <FormField
                                label="Per Kamar / Eksklusif (Rp, opsional)"
                                error={form.errors.month_room_amount}
                            >
                                <input
                                    type="number"
                                    min={0}
                                    step={1000}
                                    className={inputClass}
                                    placeholder="Opsional"
                                    value={form.data.month_room_amount}
                                    onChange={(e) =>
                                        form.setData(
                                            'month_room_amount',
                                            e.target.value,
                                        )
                                    }
                                />
                            </FormField>
                        </div>

                        {/* Per 6 Bulan */}
                        <div className="border-primary/30 bg-primary/5 space-y-3 rounded-xl border p-4">
                            <p className="text-primary text-xs font-bold tracking-wider uppercase">
                                Tarif Per 6 Bulan (Non-Maba)
                            </p>
                            <FormField
                                label="Per Orang / Slot (Rp)"
                                error={form.errors.semester_amount}
                            >
                                <input
                                    type="number"
                                    min={0}
                                    step={1000}
                                    className={inputClass}
                                    placeholder={
                                        computedHalfYearPerson > 0
                                            ? `Otomatis: ${computedHalfYearPerson}`
                                            : 'Kosongkan = Tahunan ÷ 2'
                                    }
                                    value={form.data.semester_amount}
                                    onChange={(e) =>
                                        form.setData(
                                            'semester_amount',
                                            e.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <FormField
                                label="Per Kamar / Eksklusif (Rp, opsional)"
                                error={form.errors.semester_room_amount}
                            >
                                <input
                                    type="number"
                                    min={0}
                                    step={1000}
                                    className={inputClass}
                                    placeholder={
                                        computedHalfYearRoom > 0
                                            ? `Otomatis: ${computedHalfYearRoom}`
                                            : 'Opsional'
                                    }
                                    value={form.data.semester_room_amount}
                                    onChange={(e) =>
                                        form.setData(
                                            'semester_room_amount',
                                            e.target.value,
                                        )
                                    }
                                />
                            </FormField>
                        </div>

                        {/* Per Tahun */}
                        <div className="border-base-300 bg-base-200/30 space-y-3 rounded-xl border p-4">
                            <p className="text-primary text-xs font-bold tracking-wider uppercase">
                                Tarif Per Tahun
                            </p>
                            <FormField
                                label="Per Orang / Slot (Rp)"
                                error={form.errors.year_amount}
                            >
                                <input
                                    type="number"
                                    min={0}
                                    step={1000}
                                    className={inputClass}
                                    placeholder="Contoh: 2500000"
                                    value={form.data.year_amount}
                                    onChange={(e) =>
                                        form.setData(
                                            'year_amount',
                                            e.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <FormField
                                label="Per Kamar / Eksklusif (Rp, opsional)"
                                error={form.errors.year_room_amount}
                            >
                                <input
                                    type="number"
                                    min={0}
                                    step={1000}
                                    className={inputClass}
                                    placeholder="Contoh: 10000000"
                                    value={form.data.year_room_amount}
                                    onChange={(e) =>
                                        form.setData(
                                            'year_room_amount',
                                            e.target.value,
                                        )
                                    }
                                />
                            </FormField>
                        </div>
                    </div>

                    <div className="border-base-200 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
                        <div className="flex flex-wrap items-center gap-5 text-sm">
                            <label className="inline-flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm checkbox-primary"
                                    checked={form.data.auto_fill_semester}
                                    onChange={(e) =>
                                        form.setData(
                                            'auto_fill_semester',
                                            e.target.checked,
                                        )
                                    }
                                />
                                <span>
                                    Otomatis isi Per 6 Bulan (= Tahunan ÷ 2
                                    {computedHalfYearPerson > 0
                                        ? `: ${formatRupiah(computedHalfYearPerson)}/orang`
                                        : ''}
                                    ) bila kolom 6 Bulan dikosongkan
                                </span>
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm checkbox-primary"
                                    checked={form.data.sync_policies}
                                    onChange={(e) =>
                                        form.setData(
                                            'sync_policies',
                                            e.target.checked,
                                        )
                                    }
                                />
                                <span>
                                    Sinkronkan langsung ke kebijakan aktif &amp;
                                    Beranda
                                </span>
                            </label>
                        </div>

                        <Button type="submit" disabled={form.processing}>
                            {form.processing
                                ? 'Menyimpan...'
                                : 'Simpan Harga Gedung'}
                        </Button>
                    </div>
                </form>
            </section>

            {/* Section 3: Daftar Rincian Tarif Tersimpan */}
            <section className="border-base-300 bg-base-100 space-y-4 rounded-2xl border p-5 shadow-xs">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold">
                            Rincian Tarif Tersimpan ({filteredRates.length})
                        </h2>
                        <p className="text-base-content/60 text-xs">
                            Daftar seluruh baris tarif di basis data untuk
                            keperluan audit atau penghapusan tarif per satuan.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <select
                            aria-label="Filter kategori"
                            className="select select-bordered select-sm"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="all">Semua Kategori</option>
                            {categories.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Filter gedung"
                            className="select select-bordered select-sm"
                            value={filterBuilding}
                            onChange={(e) => setFilterBuilding(e.target.value)}
                        >
                            <option value="all">Semua Gedung</option>
                            {buildings.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.nama_gedung}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Filter satuan"
                            className="select select-bordered select-sm"
                            value={filterUnit}
                            onChange={(e) => setFilterUnit(e.target.value)}
                        >
                            <option value="all">Semua Satuan</option>
                            <option value="day">Harian</option>
                            <option value="month">Bulanan</option>
                            <option value="semester">Per 6 Bulan</option>
                            <option value="year">Tahunan</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table-sm table w-full">
                        <thead className="bg-base-200/70">
                            <tr>
                                <th>Gedung</th>
                                <th>Kategori</th>
                                <th>Tipe Kamar</th>
                                <th>Satuan</th>
                                <th className="text-right">Per Orang</th>
                                <th className="text-right">
                                    Per Kamar (Eksklusif)
                                </th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRates.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="text-base-content/60 py-8 text-center text-sm"
                                    >
                                        Belum ada tarif yang cocok dengan filter
                                        saat ini.
                                    </td>
                                </tr>
                            ) : (
                                filteredRates.map((row) => (
                                    <tr key={row.id}>
                                        <td className="font-medium">
                                            {row.nama_gedung}{' '}
                                            <span className="text-base-content/50 text-xs">
                                                ({row.kode_gedung})
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`badge badge-sm ${
                                                    row.category === 'default'
                                                        ? 'badge-ghost'
                                                        : 'badge-primary badge-soft'
                                                }`}
                                            >
                                                {categoryLabelMap[
                                                    row.category
                                                ] ?? row.category}
                                            </span>
                                        </td>
                                        <td>
                                            {typeLabelMap[row.tipe_kamar] ??
                                                row.tipe_kamar}
                                        </td>
                                        <td>
                                            {UNIT_LABELS[row.unit] ?? row.unit}
                                        </td>
                                        <td className="text-right font-semibold whitespace-nowrap">
                                            {formatRupiah(row.amount)}
                                            {row.unit === 'day' &&
                                                row.student_amount != null && (
                                                    <span className="text-base-content/60 block text-[11px] font-normal">
                                                        Mhs:{' '}
                                                        {formatRupiah(
                                                            row.student_amount,
                                                        )}
                                                    </span>
                                                )}
                                        </td>
                                        <td className="text-right whitespace-nowrap">
                                            {row.room_amount != null &&
                                            row.room_amount > 0
                                                ? formatRupiah(row.room_amount)
                                                : '—'}
                                        </td>
                                        <td className="text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-xs gap-1"
                                                    onClick={() =>
                                                        loadComboIntoEditor(
                                                            row.gedung_id,
                                                            row.tipe_kamar,
                                                            row.category,
                                                            true,
                                                        )
                                                    }
                                                >
                                                    <Pencil className="size-3.5" />
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-xs text-error"
                                                    aria-label={`Hapus tarif ${row.nama_gedung} ${row.tipe_kamar}`}
                                                    onClick={() =>
                                                        setDeleteTarget(row)
                                                    }
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <ConfirmDialog
                open={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                title="Hapus Pengaturan Harga"
                message={
                    deleteTarget
                        ? `Hapus tarif ${UNIT_LABELS[deleteTarget.unit] ?? deleteTarget.unit} untuk ${deleteTarget.nama_gedung} (${deleteTarget.tipe_kamar}) kategori ${categoryLabelMap[deleteTarget.category] ?? deleteTarget.category}?`
                        : ''
                }
                confirmLabel="Ya, Hapus"
                onConfirm={handleDelete}
            />
        </div>
    );
}
