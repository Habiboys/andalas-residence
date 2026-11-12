import { workflow } from '@/routes/residence';
import { useState } from 'react';
import RoomCatalog, { type CatalogRoom } from '../../components/RoomCatalog';
import RoomInvitations, {
    InviteRoommateButton,
    type RoomInvitation,
} from '../../components/RoomInvitations';
import { Link, useForm } from '@inertiajs/react';
import { Card, PageHeader, inputClass, StatusBadge } from '../../components/ui';
import { store } from '@/routes/andalas/registrations';
import { tagihan } from '@/routes/mahasiswa';
import { formatRupiah } from '../../lib/format';
type Room = CatalogRoom;
type Props = {
    policy_open?: boolean;
    policy_month_days?: number;
    policy_day_basis?: string;
    initialUser?: {
        is_kipk?: boolean;
        kipk_personal_payment?: boolean;
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
    room_invitations?: RoomInvitation[];
    registration?: Array<{
        id: string;
        status: string;
        can_invite?: boolean;
        reserved_room?: {
            nomor_kamar: string;
            lantai?: { gedung?: { nama_gedung: string } };
        };
        tagihan_id?: string | null;
        is_kipk?: boolean;
        funding?: string;
        completed_at?: string;
        reservation_expires_at?: string;
        periode?: { nama_periode: string };
    }>;
};
export default function Registration({
    policy_open = false,
    policy_month_days = 30,
    policy_day_basis = 'nights',
    initialUser,
    periode = [],
    rooms = [],
    rates = [],
    registration = [],
    room_invitations = [],
}: Props) {
    const [step, setStep] = useState(0);
    const [tab, setTab] = useState<'registration' | 'invitations'>(
        'registration',
    );
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
                subtitle="Pilih hunian, lengkapi administrasi, lalu lakukan check-in fisik dan serah kunci bersama petugas."
            />
            <Link href={workflow.url()} className="btn btn-outline btn-sm">
                Lengkapi profil, dokumen, dan proses check-in
            </Link>
            {!policy_open && (
                <p className="alert alert-warning">
                    Pendaftaran belum dibuka untuk kategori Anda. Pengelola
                    perlu melengkapi kebijakan terlebih dahulu.
                </p>
            )}
            {policy_open && periods.length === 0 && (
                <p className="alert alert-warning">
                    Pendaftaran belum dibuka karena periode hunian aktif belum
                    tersedia. Hubungi pengelola.
                </p>
            )}
            <nav
                className="border-base-300 flex gap-5 border-b"
                aria-label="Pendaftaran dan undangan"
            >
                {(['registration', 'invitations'] as const).map((value) => (
                    <button
                        type="button"
                        key={value}
                        onClick={() => setTab(value)}
                        aria-pressed={tab === value}
                        className={`border-b-2 px-1 py-3 text-sm font-medium ${tab === value ? 'border-primary text-primary' : 'text-muted border-transparent'}`}
                    >
                        {value === 'registration'
                            ? 'Pendaftaran & pilihan kamar'
                            : `Undangan (${room_invitations.filter((item) => item.incoming && item.status === 'pending').length})`}
                    </button>
                ))}
            </nav>
            {tab === 'invitations' ? (
                <Card className="p-5">
                    <RoomInvitations invitations={room_invitations} />
                </Card>
            ) : (
                <>
                    <Card className="space-y-4 p-5">
                        <p>
                            {initialUser?.student_stage}.{' '}
                            {kipk
                                ? 'Terdaftar sebagai penerima KIP-K. Sistem mengalokasikan kamar sesuai prioritas dan kapasitas.'
                                : 'Pilih kamar yang tersedia sesuai kategori Anda.'}
                        </p>
                        {kipk && initialUser?.kipk_personal_payment && (
                            <p className="text-sm">
                                Kewajiban pribadi dibayar setelah pencairan
                                KIP-K. Check-in diperbolehkan setelah alokasi,
                                dokumen, dan perjanjian valid. Pembayaran tetap
                                tercatat terutang sampai dana diterima.
                            </p>
                        )}
                        {initialUser?.inactive_reason === 'letter_issued' && (
                            <p>
                                Arsip surat tetap tersedia. Anda dapat mendaftar
                                hunian kembali dari akun ini.
                            </p>
                        )}
                        {initialUser?.status_huni === 'aktif' ? (
                            <p>
                                Anda masih menghuni asrama. Selesaikan check-out
                                sebelum mendaftar lagi.
                            </p>
                        ) : pending ? (
                            <p>
                                Pendaftaran sedang diproses.{' '}
                                {registration.some(
                                    (r) =>
                                        !r.completed_at &&
                                        !['draft', 'rejected'].includes(
                                            r.status,
                                        ) &&
                                        r.is_kipk &&
                                        r.funding === 'personal' &&
                                        !r.tagihan_id,
                                ) ? (
                                    'Menunggu alokasi kamar sesuai prioritas dan kapasitas. Tagihan diterbitkan setelah kamar dialokasikan.'
                                ) : (
                                    <Link className="link" href={tagihan.url()}>
                                        Lihat tagihan dan bayar
                                    </Link>
                                )}
                                .
                            </p>
                        ) : (
                            <form
                                className="space-y-4"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (step !== 2) return;
                                    form.transform((d) => ({
                                        ...d,
                                        starts_at: d.starts_at || null,
                                        ends_at: d.ends_at || null,
                                        preferences: kipk ? [] : d.preferences,
                                    }));
                                    form.post(store.url());
                                }}
                            >
                                <ol
                                    className="border-base-300 bg-base-100 grid grid-cols-3 gap-2 rounded-xl border p-3 text-sm"
                                    aria-label="Tahapan pendaftaran"
                                >
                                    {[
                                        'Rencana hunian',
                                        kipk ? 'Alokasi kamar' : 'Pilih kamar',
                                        'Review pengajuan',
                                    ].map((label, index) => (
                                        <li
                                            key={label}
                                            aria-current={
                                                step === index
                                                    ? 'step'
                                                    : undefined
                                            }
                                            className={
                                                step === index
                                                    ? 'text-primary font-semibold'
                                                    : 'text-base-content/70'
                                            }
                                        >
                                            {index + 1}. {label}
                                        </li>
                                    ))}
                                </ol>
                                {step === 0 && periods[0] && (
                                    <p className="text-sm">
                                        Periode hunian ·{' '}
                                        {periods[0].nama_periode}
                                    </p>
                                )}
                                {!kipk && (
                                    <>
                                        {step === 0 && (
                                            <div className="border-base-300 bg-base-100 grid gap-4 rounded-xl border p-4 shadow-sm sm:grid-cols-2">
                                                <label className="block text-sm">
                                                    Satuan tarif
                                                    <select
                                                        className={inputClass}
                                                        value={
                                                            form.data.rate_unit
                                                        }
                                                        onChange={(e) =>
                                                            form.setData({
                                                                ...form.data,
                                                                rate_unit:
                                                                    e.target
                                                                        .value,
                                                                billing_basis:
                                                                    'person',
                                                                preferences: [
                                                                    {
                                                                        kamar_id:
                                                                            '',
                                                                        notes: '',
                                                                    },
                                                                ],
                                                            })
                                                        }
                                                    >
                                                        <option value="period">
                                                            Per tahun
                                                        </option>
                                                        <option value="month">
                                                            Per bulan
                                                        </option>
                                                        <option value="day">
                                                            Per hari
                                                        </option>
                                                    </select>
                                                </label>
                                                {rateUnit === 'year' && (
                                                    <label className="block text-sm">
                                                        Dasar tarif
                                                        <select
                                                            className={
                                                                inputClass
                                                            }
                                                            value={
                                                                form.data
                                                                    .billing_basis
                                                            }
                                                            onChange={(e) =>
                                                                form.setData({
                                                                    ...form.data,
                                                                    billing_basis:
                                                                        e.target
                                                                            .value,
                                                                    preferences:
                                                                        [
                                                                            {
                                                                                kamar_id:
                                                                                    '',
                                                                                notes: '',
                                                                            },
                                                                        ],
                                                                })
                                                            }
                                                        >
                                                            <option value="person">
                                                                Per orang
                                                            </option>
                                                            <option value="room">
                                                                Per kamar
                                                                (seluruh kamar)
                                                            </option>
                                                        </select>
                                                        <span className="text-sm">
                                                            Sewa per kamar
                                                            memerlukan kamar
                                                            kosong dan tarif
                                                            tahunan per kamar.
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
                                                                className={
                                                                    inputClass
                                                                }
                                                                type="date"
                                                                required
                                                                value={
                                                                    form.data
                                                                        .starts_at
                                                                }
                                                                onChange={(e) =>
                                                                    form.setData(
                                                                        'starts_at',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </label>
                                                        <label>
                                                            Keluar
                                                            <input
                                                                className={
                                                                    inputClass
                                                                }
                                                                type="date"
                                                                required
                                                                value={
                                                                    form.data
                                                                        .ends_at
                                                                }
                                                                onChange={(e) =>
                                                                    form.setData(
                                                                        'ends_at',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {step === 1 && (
                                            <RoomCatalog
                                                rooms={rooms}
                                                rates={rates}
                                                selected={
                                                    form.data.preferences[0]
                                                        .kamar_id
                                                }
                                                onSelect={(id) =>
                                                    form.setData(
                                                        'preferences',
                                                        [
                                                            {
                                                                kamar_id: id,
                                                                notes: '',
                                                            },
                                                        ],
                                                    )
                                                }
                                                unit={rateUnit}
                                                basis={form.data.billing_basis}
                                                isStudent={
                                                    initialUser?.client_profile_category !==
                                                    'non_student'
                                                }
                                            />
                                        )}
                                        {step === 0 &&
                                            initialUser?.can_use_sponsor && (
                                                <>
                                                    <label>
                                                        Penanggung biaya
                                                        <select
                                                            className={
                                                                inputClass
                                                            }
                                                            value={
                                                                form.data
                                                                    .funding
                                                            }
                                                            onChange={(e) =>
                                                                form.setData(
                                                                    'funding',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        >
                                                            <option value="personal">
                                                                Bayar pribadi
                                                            </option>
                                                            <option value="sponsor">
                                                                Beasiswa /
                                                                kampus
                                                            </option>
                                                        </select>
                                                    </label>
                                                    {form.data.funding ===
                                                        'sponsor' && (
                                                        <label>
                                                            Nama penanggung
                                                            biaya
                                                            <input
                                                                className={
                                                                    inputClass
                                                                }
                                                                required
                                                                value={
                                                                    form.data
                                                                        .sponsor_name
                                                                }
                                                                onChange={(e) =>
                                                                    form.setData(
                                                                        'sponsor_name',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                            <span className="text-sm">
                                                                Perlu pengesahan
                                                                Admin Layanan.
                                                            </span>
                                                        </label>
                                                    )}
                                                </>
                                            )}
                                        {step === 2 && (
                                            <div className="border-base-300 bg-base-100 space-y-2 rounded-xl border p-4 shadow-sm">
                                                <h2 className="font-semibold">
                                                    {
                                                        room?.lantai?.gedung
                                                            ?.nama_gedung
                                                    }{' '}
                                                    · Kamar {room?.nomor_kamar}
                                                </h2>
                                                {form.data.starts_at &&
                                                    form.data.ends_at && (
                                                        <p className="text-sm">
                                                            {form.data.starts_at}{' '}
                                                            sampai{' '}
                                                            {form.data.ends_at}
                                                        </p>
                                                    )}
                                                <p>
                                                    Perkiraan biaya hunian{' '}
                                                    <strong>
                                                        {formatRupiah(
                                                            price *
                                                                (form.data
                                                                    .rate_unit ===
                                                                'day'
                                                                    ? days +
                                                                      (policy_day_basis ===
                                                                      'inclusive_days'
                                                                          ? 1
                                                                          : 0)
                                                                    : form.data
                                                                            .rate_unit ===
                                                                        'month'
                                                                      ? Math.max(
                                                                            1,
                                                                            Math.ceil(
                                                                                days /
                                                                                    policy_month_days,
                                                                            ),
                                                                        )
                                                                      : 1),
                                                        )}
                                                    </strong>
                                                    {form.data.rate_unit ===
                                                    'day'
                                                        ? ` untuk ${days} hari`
                                                        : form.data
                                                                .rate_unit ===
                                                            'month'
                                                          ? ` untuk ${Math.max(1, Math.ceil(days / policy_month_days))} bulan`
                                                          : ' per tahun'}
                                                    .
                                                </p>
                                                <p className="text-sm">
                                                    Alokasi dipertahankan selama
                                                    proses administrasi
                                                    berjalan. Hunian belum aktif
                                                    sampai check-in fisik dan
                                                    serah kunci.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                                {kipk && (
                                    <div className="border-base-300 bg-base-100 rounded-xl border p-4">
                                        {step === 0
                                            ? 'Pendaftaran KIP-K menggunakan skema tahunan.'
                                            : step === 1
                                              ? 'Kamar dialokasikan otomatis sesuai prioritas gedung.'
                                              : 'Periksa kategori KIP-K sebelum mengajukan pendaftaran.'}
                                    </div>
                                )}
                                {Object.values(form.errors).map((e, i) => (
                                    <p
                                        role="alert"
                                        className="text-error"
                                        key={i}
                                    >
                                        {e}
                                    </p>
                                ))}
                                <div className="border-base-300 flex flex-wrap justify-between gap-3 border-t pt-4">
                                    {step > 0 && (
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={() => setStep(step - 1)}
                                        >
                                            Kembali
                                        </button>
                                    )}
                                    {step < 2 ? (
                                        <button
                                            type="button"
                                            className="btn btn-primary ml-auto"
                                            disabled={
                                                !policy_open ||
                                                !form.data.periode_id ||
                                                (form.data.funding ===
                                                    'sponsor' &&
                                                    !form.data.sponsor_name.trim()) ||
                                                (!kipk &&
                                                    (step === 1
                                                        ? !room || price <= 0
                                                        : [
                                                              'day',
                                                              'month',
                                                          ].includes(
                                                              form.data
                                                                  .rate_unit,
                                                          ) &&
                                                          (!form.data
                                                              .starts_at ||
                                                              !form.data
                                                                  .ends_at ||
                                                              form.data
                                                                  .ends_at <
                                                                  form.data
                                                                      .starts_at)))
                                            }
                                            onClick={() => setStep(step + 1)}
                                        >
                                            {step === 0
                                                ? kipk
                                                    ? 'Lanjut ke alokasi kamar'
                                                    : 'Lanjut ke pilihan kamar'
                                                : 'Review pengajuan'}
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={
                                                form.processing ||
                                                !policy_open ||
                                                !form.data.periode_id ||
                                                (!kipk && (!room || price <= 0))
                                            }
                                        >
                                            Ajukan pendaftaran
                                        </button>
                                    )}
                                </div>
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
                                        {r.reserved_room && (
                                            <small className="text-muted block">
                                                {
                                                    r.reserved_room.lantai
                                                        ?.gedung?.nama_gedung
                                                }{' '}
                                                / Kamar{' '}
                                                {r.reserved_room.nomor_kamar}
                                            </small>
                                        )}
                                        {r.can_invite && (
                                            <span className="mt-2 block">
                                                <InviteRoommateButton
                                                    registrationId={r.id}
                                                />
                                            </span>
                                        )}
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
                                        status={
                                            r.completed_at ? 'aktif' : r.status
                                        }
                                    />
                                </div>
                            ))
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}
