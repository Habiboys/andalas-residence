import { useForm } from '@inertiajs/react';
import {
    AlertCircle,
    BedDouble,
    CalendarDays,
    CheckCircle2,
    Sparkles,
} from 'lucide-react';
import { useMemo } from 'react';
import { formatRupiah } from '../lib/format';
import { FormField, inputClass, selectClass } from './ui';

export type PublicBookingRoom = {
    id: string;
    nomor_kamar: string;
    tipe_kamar: string;
    kapasitas: number;
    available_places: number;
    building_id: string;
    building_name: string;
    building_code: string;
    gender: string;
    floor_name: string;
    rates: Record<string, number>;
};

export type PublicBookingCategoryCatalog = {
    open: boolean;
    month_days: number;
    day_basis: string;
    rooms: PublicBookingRoom[];
};

export type PublicBookingCatalog = Record<string, PublicBookingCategoryCatalog>;

const UNIT_LABELS: Record<string, string> = {
    day: 'Per Hari',
    month: 'Per Bulan',
    semester: 'Per 6 Bulan',
    year: 'Per Tahun',
};

const GENDER_LABELS: Record<string, string> = {
    laki_laki: 'Putra',
    perempuan: 'Putri',
    campur: 'Campur',
};

function todayIso(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
}

function addDaysIso(days: number): string {
    const dt = new Date();
    dt.setDate(dt.getDate() + days);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
}

export function PublicStayBookingSection({
    catalog = {},
    supportPhone,
}: {
    catalog?: PublicBookingCatalog;
    supportPhone?: string;
}) {
    const form = useForm({
        kind: 'non_student' as 'non_student' | 'summer_course',
        nama: '',
        identity_number: '',
        email: '',
        no_hp: '',
        gender: 'laki_laki' as 'laki_laki' | 'perempuan',
        institution: '',
        kamar_id: '',
        rate_unit: 'day',
        starts_at: todayIso(),
        ends_at: addDaysIso(1),
        notes: '',
    });

    const activeCatalog = catalog[form.data.kind] ?? {
        open: false,
        month_days: 30,
        day_basis: 'nights',
        rooms: [],
    };

    const genderRooms = useMemo(
        () =>
            activeCatalog.rooms.filter(
                (room) =>
                    room.gender === 'campur' ||
                    room.gender === form.data.gender,
            ),
        [activeCatalog.rooms, form.data.gender],
    );

    const selectedRoom = useMemo(
        () => genderRooms.find((room) => room.id === form.data.kamar_id),
        [genderRooms, form.data.kamar_id],
    );

    const availableUnits = useMemo(() => {
        if (!selectedRoom) {
            return form.data.kind === 'summer_course'
                ? ['day']
                : ['day', 'month', 'semester', 'year'];
        }
        const units = ['day', 'month', 'semester', 'year'].filter(
            (u) => Number(selectedRoom.rates[u] ?? 0) > 0,
        );

        return units.length > 0 ? units : ['day'];
    }, [selectedRoom, form.data.kind]);

    const effectiveUnit = availableUnits.includes(form.data.rate_unit)
        ? form.data.rate_unit
        : availableUnits[0];

    const diffDays = useMemo(() => {
        if (!form.data.starts_at || !form.data.ends_at) return 1;
        const ms =
            Date.parse(form.data.ends_at) - Date.parse(form.data.starts_at);
        const raw = Math.max(1, Math.ceil(ms / 86_400_000));

        return activeCatalog.day_basis === 'inclusive_days' ? raw + 1 : raw;
    }, [form.data.starts_at, form.data.ends_at, activeCatalog.day_basis]);

    const estimatedTotal = useMemo(() => {
        if (!selectedRoom) return 0;
        const unitPrice = Number(selectedRoom.rates[effectiveUnit] ?? 0);
        if (unitPrice <= 0) return 0;
        if (effectiveUnit === 'day') return unitPrice * diffDays;
        if (effectiveUnit === 'month') {
            return (
                unitPrice *
                Math.max(1, Math.ceil(diffDays / activeCatalog.month_days))
            );
        }

        return unitPrice;
    }, [selectedRoom, effectiveUnit, diffDays, activeCatalog.month_days]);

    const cleanPhone = (supportPhone || '0811-6699634').trim();
    const waDigits = cleanPhone.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const firstError = Object.values(
        form.errors as Record<string, string | undefined>,
    ).find(Boolean);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            rate_unit: effectiveUnit,
        }));
        form.post('/pengajuan-hunian', {
            preserveScroll: true,
        });
    };

    return (
        <section
            id="pengajuan-umum-summer"
            className="bg-mist border-base-300 scroll-mt-24 border-y py-16 md:py-20"
        >
            <div className="mx-auto max-w-7xl px-4 md:px-6">
                <div className="max-w-3xl">
                    <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
                        Pemesanan Langsung Tanpa Akun
                    </p>
                    <h2 className="font-display mt-2 text-3xl leading-tight md:text-4xl">
                        Pengajuan Sewa Umum &amp; Summer Course
                    </h2>
                    <p className="text-muted mt-3 text-sm leading-6 md:text-base">
                        Pilih kategori hunian, tentukan tanggal menginap dan
                        kamar yang tersedia. Sistem langsung menahan kamar Anda
                        dan menerbitkan rincian tagihan secara otomatis.
                    </p>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            form.setData((prev) => ({
                                ...prev,
                                kind: 'non_student',
                                kamar_id: '',
                                rate_unit: 'day',
                            }))
                        }
                        className={`btn btn-sm rounded-full ${
                            form.data.kind === 'non_student'
                                ? 'btn-primary'
                                : 'btn-outline bg-base-100'
                        }`}
                    >
                        Sewa Umum / Harian
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            form.setData((prev) => ({
                                ...prev,
                                kind: 'summer_course',
                                kamar_id: '',
                                rate_unit: 'day',
                            }))
                        }
                        className={`btn btn-sm rounded-full ${
                            form.data.kind === 'summer_course'
                                ? 'btn-primary'
                                : 'btn-outline bg-base-100'
                        }`}
                    >
                        <Sparkles className="size-3.5" aria-hidden="true" />
                        Summer Course / Kegiatan
                    </button>
                </div>

                <div className="border-base-300 bg-base-100 mt-6 rounded-2xl border p-6 shadow-xs md:p-8">
                    {!activeCatalog.open || activeCatalog.rooms.length === 0 ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-2.5">
                                <AlertCircle className="text-warning mt-0.5 size-5 shrink-0" />
                                <div>
                                    <p className="font-semibold">
                                        Pemesanan online untuk jalur{' '}
                                        {form.data.kind === 'summer_course'
                                            ? 'Summer Course'
                                            : 'Sewa Umum / Harian'}{' '}
                                        sedang belum dibuka atau kamar penuh.
                                    </p>
                                    <p className="text-muted mt-1 leading-6">
                                        Pengelola perlu membuka kebijakan jalur
                                        ini beserta ketersediaan kamar pada
                                        portal admin. Untuk kebutuhan mendesak
                                        atau rombongan kegiatan, silakan hubungi
                                        pengelola via{' '}
                                        <a
                                            href={`https://wa.me/${waDigits}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="link link-primary font-medium"
                                        >
                                            WhatsApp ({cleanPhone})
                                        </a>
                                        .
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {firstError && (
                                <div
                                    role="alert"
                                    className="alert alert-error text-sm"
                                >
                                    <AlertCircle className="size-4 shrink-0" />
                                    <span>{firstError}</span>
                                </div>
                            )}

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <FormField
                                    label="Nama Lengkap Pemohon"
                                    error={form.errors.nama}
                                >
                                    <input
                                        required
                                        className={inputClass}
                                        placeholder="Nama sesuai KTP / Paspor"
                                        value={form.data.nama}
                                        onChange={(e) =>
                                            form.setData('nama', e.target.value)
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label="Nomor Identitas (NIK / Paspor)"
                                    error={form.errors.identity_number}
                                >
                                    <input
                                        required
                                        className={inputClass}
                                        placeholder="NIK 16 digit atau No. Paspor"
                                        value={form.data.identity_number}
                                        onChange={(e) =>
                                            form.setData(
                                                'identity_number',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label="Jenis Kelamin Penghuni"
                                    error={form.errors.gender}
                                >
                                    <select
                                        className={selectClass}
                                        value={form.data.gender}
                                        onChange={(e) =>
                                            form.setData((prev) => ({
                                                ...prev,
                                                gender: e.target.value as
                                                    | 'laki_laki'
                                                    | 'perempuan',
                                                kamar_id: '',
                                            }))
                                        }
                                    >
                                        <option value="laki_laki">
                                            Laki-laki (Putra)
                                        </option>
                                        <option value="perempuan">
                                            Perempuan (Putri)
                                        </option>
                                    </select>
                                </FormField>
                                <FormField
                                    label="Email Aktif"
                                    error={form.errors.email}
                                >
                                    <input
                                        required
                                        type="email"
                                        className={inputClass}
                                        placeholder="nama@email.com"
                                        value={form.data.email}
                                        onChange={(e) =>
                                            form.setData(
                                                'email',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label="Nomor WhatsApp / HP"
                                    error={form.errors.no_hp}
                                >
                                    <input
                                        required
                                        className={inputClass}
                                        placeholder="Contoh: 081234567890"
                                        value={form.data.no_hp}
                                        onChange={(e) =>
                                            form.setData(
                                                'no_hp',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label={
                                        form.data.kind === 'summer_course'
                                            ? 'Instansi / Kampus Penyelenggara'
                                            : 'Instansi / Asal (Opsional)'
                                    }
                                    error={form.errors.institution}
                                >
                                    <input
                                        required={
                                            form.data.kind === 'summer_course'
                                        }
                                        className={inputClass}
                                        placeholder={
                                            form.data.kind === 'summer_course'
                                                ? 'Contoh: Summer Course Fakultas Pertanian'
                                                : 'Contoh: Tamu Akademik / Perorangan'
                                        }
                                        value={form.data.institution}
                                        onChange={(e) =>
                                            form.setData(
                                                'institution',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label="Tanggal Masuk"
                                    error={form.errors.starts_at}
                                >
                                    <input
                                        required
                                        type="date"
                                        min={todayIso()}
                                        className={inputClass}
                                        value={form.data.starts_at}
                                        onChange={(e) =>
                                            form.setData(
                                                'starts_at',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label="Tanggal Keluar"
                                    error={form.errors.ends_at}
                                >
                                    <input
                                        required
                                        type="date"
                                        min={form.data.starts_at || todayIso()}
                                        className={inputClass}
                                        value={form.data.ends_at}
                                        onChange={(e) =>
                                            form.setData(
                                                'ends_at',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label="Pilih Kamar Tersedia"
                                    error={form.errors.kamar_id}
                                >
                                    <select
                                        required
                                        className={selectClass}
                                        value={form.data.kamar_id}
                                        onChange={(e) => {
                                            const nextId = e.target.value;
                                            const chosen = genderRooms.find(
                                                (r) => r.id === nextId,
                                            );
                                            const firstUnit = chosen
                                                ? ([
                                                      'day',
                                                      'month',
                                                      'semester',
                                                      'year',
                                                  ].find(
                                                      (u) =>
                                                          Number(
                                                              chosen.rates[u] ??
                                                                  0,
                                                          ) > 0,
                                                  ) ?? 'day')
                                                : 'day';
                                            form.setData((prev) => ({
                                                ...prev,
                                                kamar_id: nextId,
                                                rate_unit: firstUnit,
                                            }));
                                        }}
                                    >
                                        <option value="">
                                            {genderRooms.length > 0
                                                ? `Pilih kamar (${genderRooms.length} tersedia)`
                                                : 'Tidak ada kamar sesuai gender'}
                                        </option>
                                        {genderRooms.map((room) => (
                                            <option
                                                key={room.id}
                                                value={room.id}
                                            >
                                                {room.building_name} · Kamar{' '}
                                                {room.nomor_kamar} (
                                                {room.tipe_kamar} ·{' '}
                                                {GENDER_LABELS[room.gender] ??
                                                    room.gender}{' '}
                                                · sisa {room.available_places}{' '}
                                                slot)
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                            </div>

                            {selectedRoom && (
                                <div className="border-primary/30 bg-primary/5 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
                                    <div className="space-y-1 text-sm">
                                        <p className="flex items-center gap-2 font-semibold">
                                            <BedDouble className="text-primary size-4" />
                                            {selectedRoom.building_name} · Kamar{' '}
                                            {selectedRoom.nomor_kamar} (
                                            {selectedRoom.floor_name})
                                        </p>
                                        <p className="text-muted flex items-center gap-2 text-xs">
                                            <CalendarDays className="size-3.5" />
                                            Durasi: {diffDays} hari · Satuan:{' '}
                                            <select
                                                aria-label="Satuan tarif"
                                                className="select select-bordered select-xs ml-1 inline-block w-auto"
                                                value={effectiveUnit}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'rate_unit',
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                {availableUnits.map((unit) => (
                                                    <option
                                                        key={unit}
                                                        value={unit}
                                                    >
                                                        {UNIT_LABELS[unit] ??
                                                            unit}{' '}
                                                        (
                                                        {formatRupiah(
                                                            selectedRoom.rates[
                                                                unit
                                                            ] ?? 0,
                                                        )}
                                                        )
                                                    </option>
                                                ))}
                                            </select>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-muted text-xs">
                                            Estimasi Total Tagihan
                                        </p>
                                        <p className="text-primary text-2xl font-bold">
                                            {formatRupiah(estimatedTotal)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <p className="text-muted flex items-center gap-1.5 text-xs">
                                    <CheckCircle2 className="text-primary size-4 shrink-0" />
                                    Kamar langsung ditahan sementara dan tagihan
                                    terbit otomatis setelah dikirim.
                                </p>
                                <button
                                    type="submit"
                                    disabled={
                                        form.processing || !form.data.kamar_id
                                    }
                                    className="btn btn-primary"
                                >
                                    {form.processing
                                        ? 'Memproses pemesanan...'
                                        : 'Pesan Kamar & Terbitkan Tagihan'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
}
