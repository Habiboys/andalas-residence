import { Link, useForm } from '@inertiajs/react';
import { Card, PageHeader, inputClass, StatusBadge } from '../../components/ui';
import { store } from '@/routes/andalas/registrations';
import { tagihan } from '@/routes/mahasiswa';
import { formatRupiah } from '../../lib/format';
type Room = {
    id: string;
    nomor_kamar: string;
    tipe_kamar: string;
    tarif_per_periode: string;
    lantai?: { gedung_id: string; gedung?: { nama_gedung: string } };
};
type Props = {
    initialUser?: {
        is_kipk?: boolean;
        can_use_sponsor?: boolean;
        status_huni?: string;
        student_stage?: string;
        inactive_reason?: string;
        client_profile_category?: string;
    };
    periode?: Array<{
        id: string;
        nama_periode: string;
        status: string;
        reservation_hours?: number;
    }>;
    rooms?: Room[];
    rates?: Array<{
        gedung_id: string;
        tipe_kamar: string;
        unit: string;
        amount: string;
        student_amount?: string | null;
        room_amount?: string | null;
    }>;
    registration?: Array<{
        id: string;
        status: string;
        completed_at?: string;
        reservation_expires_at?: string;
        periode?: { nama_periode: string };
    }>;
};
export default function Registration({
    initialUser,
    periode = [],
    rooms = [],
    rates = [],
    registration = [],
}: Props) {
    const periods = periode.filter((p) => p.status === 'aktif');
    const kipk = initialUser?.is_kipk === true;
    const pending = registration.some(
        (r) => !r.completed_at && !['draft', 'rejected'].includes(r.status),
    );
    const form = useForm({
        periode_id: periods[0]?.id ?? '',
        is_kipk: kipk,
        preferences: [{ kamar_id: '', notes: '' }],
        rate_unit: 'period',
        billing_basis: 'person',
        starts_at: '',
        ends_at: '',
        funding: 'personal',
        sponsor_name: '',
        notes: '',
    });
    const room = rooms.find((r) => r.id === form.data.preferences[0].kamar_id);
    const rateUnit =
        form.data.rate_unit === 'period' ? 'year' : form.data.rate_unit;
    const rate =
        rates.find(
            (r) =>
                r.gedung_id === room?.lantai?.gedung_id &&
                r.tipe_kamar === room?.tipe_kamar &&
                r.unit ===
                    (form.data.rate_unit === 'period'
                        ? 'year'
                        : form.data.rate_unit),
        ) ??
        (rateUnit === 'day'
            ? rates.find(
                  (r) =>
                      r.gedung_id === room?.lantai?.gedung_id &&
                      r.tipe_kamar === 'umum' &&
                      r.unit === 'day',
              )
            : undefined);
    const price = Number(
        (form.data.billing_basis === 'room'
            ? rate?.room_amount
            : rateUnit === 'day' &&
                initialUser?.client_profile_category !== 'non_student' &&
                rate?.student_amount != null
              ? rate.student_amount
              : rate?.amount) ??
            (form.data.billing_basis === 'person' &&
            form.data.rate_unit === 'period'
                ? room?.tarif_per_periode
                : 0) ??
            0,
    );
    const days =
        form.data.starts_at && form.data.ends_at
            ? Math.max(
                  1,
                  Math.ceil(
                      (Date.parse(form.data.ends_at) -
                          Date.parse(form.data.starts_at)) /
                          86400000,
                  ),
              )
            : 1;
    return (
        <div className="space-y-5">
            <PageHeader
                title="Pendaftaran Asrama"
                subtitle="Pilih hunian dan selesaikan pembayaran untuk mengaktifkan masa tinggal."
            />
            <Card className="space-y-4 p-5">
                <p>
                    {initialUser?.student_stage}.{' '}
                    {kipk
                        ? 'Terdaftar sebagai penerima KIP-K. Kamar ditempatkan Admin Layanan.'
                        : 'Pilih kamar yang tersedia sesuai kategori Anda.'}
                </p>
                {initialUser?.inactive_reason === 'letter_issued' && (
                    <p>
                        Arsip surat tetap tersedia. Anda dapat mendaftar hunian
                        kembali dari akun ini.
                    </p>
                )}
                {initialUser?.status_huni === 'aktif' ? (
                    <p>
                        Anda masih menghuni asrama. Selesaikan check-out sebelum
                        mendaftar lagi.
                    </p>
                ) : pending ? (
                    <p>
                        Pendaftaran sedang diproses.{' '}
                        <Link className="link" href={tagihan.url()}>
                            Lihat tagihan dan bayar
                        </Link>
                        .
                    </p>
                ) : (
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.transform((d) => ({
                                ...d,
                                starts_at: d.starts_at || null,
                                ends_at: d.ends_at || null,
                                preferences: kipk ? [] : d.preferences,
                            }));
                            form.post(store.url());
                        }}
                    >
                        <div>
                            <p className="text-sm">Periode penerimaan aktif</p>
                            <p className="font-semibold">
                                {periods[0]?.nama_periode ??
                                    'Belum ada periode aktif'}
                            </p>
                            <p className="text-base-content/60 text-sm">
                                {periods.length
                                    ? 'Ditetapkan oleh admin untuk pendaftaran saat ini. Periode hunian berbeda dengan angkatan kuliah.'
                                    : 'Pendaftaran belum dibuka. Hubungi admin layanan untuk informasi periode berikutnya.'}
                            </p>
                        </div>
                        {!kipk && (
                            <>
                                <label className="block text-sm">
                                    Satuan tarif
                                    <select
                                        className={inputClass}
                                        value={form.data.rate_unit}
                                        onChange={(e) =>
                                            form.setData({
                                                ...form.data,
                                                rate_unit: e.target.value,
                                                billing_basis: 'person',
                                            })
                                        }
                                    >
                                        <option value="period">
                                            Per tahun
                                        </option>
                                        <option value="month">Per bulan</option>
                                        <option value="day">Per hari</option>
                                    </select>
                                </label>
                                {rateUnit === 'year' && (
                                    <label className="block text-sm">
                                        Dasar tarif
                                        <select
                                            className={inputClass}
                                            value={form.data.billing_basis}
                                            onChange={(e) =>
                                                form.setData(
                                                    'billing_basis',
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option value="person">
                                                Per orang
                                            </option>
                                            <option value="room">
                                                Per kamar (seluruh kamar)
                                            </option>
                                        </select>
                                        <span className="text-sm">
                                            Sewa per kamar memerlukan kamar
                                            kosong dan tarif tahunan per kamar.
                                        </span>
                                    </label>
                                )}
                                {['day', 'month'].includes(
                                    form.data.rate_unit,
                                ) && (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <label>
                                            Masuk
                                            <input
                                                className={inputClass}
                                                type="date"
                                                required
                                                value={form.data.starts_at}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'starts_at',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </label>
                                        <label>
                                            Keluar
                                            <input
                                                className={inputClass}
                                                type="date"
                                                required
                                                value={form.data.ends_at}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'ends_at',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </label>
                                    </div>
                                )}
                                <label className="block text-sm">
                                    Gedung / tipe / nomor kamar
                                    <select
                                        className={inputClass}
                                        required
                                        value={
                                            form.data.preferences[0].kamar_id
                                        }
                                        onChange={(e) =>
                                            form.setData('preferences', [
                                                {
                                                    kamar_id: e.target.value,
                                                    notes: '',
                                                },
                                            ])
                                        }
                                    >
                                        <option value="">Pilih kamar</option>
                                        {rooms.map((r) => (
                                            <option value={r.id} key={r.id}>
                                                {r.lantai?.gedung?.nama_gedung}{' '}
                                                / {r.tipe_kamar} /{' '}
                                                {r.nomor_kamar}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                {rooms.length === 0 && (
                                    <p>
                                        Belum ada kamar tersedia untuk kategori
                                        Anda.
                                    </p>
                                )}
                                {initialUser?.can_use_sponsor && (
                                    <>
                                        <label>
                                            Penanggung biaya
                                            <select
                                                className={inputClass}
                                                value={form.data.funding}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'funding',
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="personal">
                                                    Bayar pribadi
                                                </option>
                                                <option value="sponsor">
                                                    Beasiswa / kampus
                                                </option>
                                            </select>
                                        </label>
                                        {form.data.funding === 'sponsor' && (
                                            <label>
                                                Nama penanggung biaya
                                                <input
                                                    className={inputClass}
                                                    required
                                                    value={
                                                        form.data.sponsor_name
                                                    }
                                                    onChange={(e) =>
                                                        form.setData(
                                                            'sponsor_name',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                <span className="text-sm">
                                                    Perlu pengesahan Admin
                                                    Layanan.
                                                </span>
                                            </label>
                                        )}
                                    </>
                                )}
                                <p>
                                    Biaya hunian:{' '}
                                    <strong>
                                        {formatRupiah(
                                            price *
                                                (form.data.rate_unit === 'day'
                                                    ? days
                                                    : form.data.rate_unit ===
                                                        'month'
                                                      ? Math.max(
                                                            1,
                                                            Math.ceil(
                                                                days / 30,
                                                            ),
                                                        )
                                                      : 1),
                                        )}
                                    </strong>
                                    {form.data.rate_unit === 'day'
                                        ? ` untuk ${days} hari`
                                        : form.data.rate_unit === 'month'
                                          ? ` untuk ${Math.max(1, Math.ceil(days / 30))} bulan`
                                          : ' per tahun'}
                                    .
                                </p>
                                <p className="text-sm">
                                    Kamar ditahan{' '}
                                    {periods.find(
                                        (p) => p.id === form.data.periode_id,
                                    )?.reservation_hours ?? 24}{' '}
                                    jam. Bukti pembayaran yang menunggu
                                    verifikasi tetap menahan kamar.
                                </p>
                            </>
                        )}
                        {Object.values(form.errors).map((e, i) => (
                            <p role="alert" className="text-error" key={i}>
                                {e}
                            </p>
                        ))}
                        <button
                            className="btn btn-primary"
                            disabled={form.processing || !form.data.periode_id}
                        >
                            {kipk
                                ? 'Daftar KIP-K'
                                : 'Pilih kamar dan terbitkan invoice'}
                        </button>
                    </form>
                )}
            </Card>
            <Card className="p-5">
                <h2 className="font-semibold">Riwayat pendaftaran</h2>
                {registration.length === 0 ? (
                    <p>Belum ada pendaftaran.</p>
                ) : (
                    registration.map((r) => (
                        <div
                            className="border-base-300 flex justify-between border-b py-3"
                            key={r.id}
                        >
                            <span>
                                {r.periode?.nama_periode}
                                {r.reservation_expires_at &&
                                    !r.completed_at && (
                                        <small className="block">
                                            Batas reservasi:{' '}
                                            {new Date(
                                                r.reservation_expires_at,
                                            ).toLocaleString('id-ID')}
                                        </small>
                                    )}
                            </span>
                            <StatusBadge
                                status={r.completed_at ? 'aktif' : r.status}
                            />
                        </div>
                    ))
                )}
            </Card>
        </div>
    );
}
