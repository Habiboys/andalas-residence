import RegistrationSteps from '../../components/RegistrationSteps';
import { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    Button,
    FormField,
    inputClass,
    StatusBadge,
    Modal,
} from '../../components/ui';
import { store as registrationStore } from '@/routes/andalas/registrations';
import { tagihan } from '@/routes/mahasiswa';
import { formatRupiah } from '../../lib/format';

type Room = {
    id: string;
    nomor_kamar: string;
    tipe_kamar?: string;
    tarif_per_periode: string;
    lantai?: { gedung?: { id: string; nama_gedung: string } };
};
type Registration = {
    id: string;
    status: string;
    periode_id?: string;
    completed_at?: string;
    periode?: { id?: string; nama_periode: string };
    tagihan?: { total: string; total_dibayar: string; status: string };
};
type Props = {
    periode?: Array<{ id: string; nama_periode: string; status?: string }>;
    rooms?: Room[];
    gedung?: Array<{ id: string; nama_gedung: string }>;
    registration?: Registration[];
    initialUser?: {
        client_profile_category?: string;
        nama?: string;
        nim?: string;
        status_huni?: string;
    };
};

export default function Registration({
    periode = [],
    rooms = [],
    gedung = [],
    registration = [],
    initialUser,
}: Props) {
    const periods = periode.filter((period) => period.status === 'aktif');
    const category = initialUser?.client_profile_category;
    const form = useForm({
        periode_id: periods[0]?.id ?? '',
        is_kipk: category === 'local_kipk',
        preferences: [] as Array<{ kamar_id: string }>,
        notes: '',
    });
    const [buildingId, setBuildingId] = useState('');
    const [confirming, setConfirming] = useState(false);
    const selectedRoom = rooms.find(
        (room) => room.id === form.data.preferences[0]?.kamar_id,
    );
    const buildingRooms = rooms.filter(
        (room) => room.lantai?.gedung?.id === buildingId,
    );
    const [roomType, setRoomType] = useState('');
    const types = [
        ...new Set(
            buildingRooms.map((room) => room.tipe_kamar).filter(Boolean),
        ),
    ];
    const hasOpenRegistration = registration.some(
        (item) =>
            ['submitted', 'verified', 'accepted'].includes(item.status) &&
            (item.periode_id ?? item.periode?.id) === form.data.periode_id,
    );
    const currentRegistration = registration.find(
        (item) =>
            (item.periode_id ?? item.periode?.id) === form.data.periode_id,
    );
    const currentStep =
        initialUser?.status_huni === 'aktif'
            ? 3
            : currentRegistration &&
                ['submitted', 'verified', 'accepted'].includes(
                    currentRegistration.status,
                )
              ? 2
              : 1;
    return (
        <div className="max-w-3xl space-y-4">
            <PageHeader
                title="Pendaftaran Asrama"
                subtitle="Pilih kamar, selesaikan tagihan, lalu terima kwitansi hunian. Check-in tercatat otomatis."
            />
            <RegistrationSteps current={currentStep} />
            <Card className="p-6">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        setConfirming(true);
                    }}
                    className="space-y-4"
                >
                    {!category || category === 'student' ? (
                        <label className="flex gap-2">
                            <input
                                type="checkbox"
                                checked={form.data.is_kipk}
                                onChange={(event) => {
                                    form.setData(
                                        'is_kipk',
                                        event.target.checked,
                                    );
                                    form.setData('preferences', []);
                                }}
                            />{' '}
                            Peserta KIPK (penempatan oleh admin)
                        </label>
                    ) : (
                        <p className="text-sm">
                            {category === 'local_kipk'
                                ? 'Anda terdaftar sebagai peserta KIPK. Kamar akan ditentukan oleh admin.'
                                : 'Kategori akun Anda bukan peserta KIPK. Silakan pilih kamar yang tersedia.'}{' '}
                            Status KIPK mengikuti kategori akun. Jika tidak
                            sesuai, hubungi admin layanan untuk memperbaiki
                            data.
                        </p>
                    )}
                    {!form.data.is_kipk && (
                        <>
                            <FormField label="Gedung asrama">
                                <select
                                    required
                                    aria-label="Gedung asrama"
                                    className={inputClass}
                                    value={buildingId}
                                    onChange={(event) => {
                                        setBuildingId(event.target.value);
                                        setRoomType('');
                                        form.setData('preferences', []);
                                    }}
                                >
                                    <option value="">Pilih gedung</option>
                                    {gedung.map((building) => (
                                        <option
                                            key={building.id}
                                            value={building.id}
                                        >
                                            {building.nama_gedung}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-muted mt-1 text-xs">
                                    A–E untuk perempuan, F–H untuk laki-laki.
                                    Nakes dan ASN untuk keduanya. Hanya kamar
                                    yang masih tersedia yang dapat dipilih.
                                </p>
                            </FormField>
                            <FormField label="Tipe kamar">
                                <select
                                    className={inputClass}
                                    required
                                    disabled={!buildingId}
                                    value={roomType}
                                    onChange={(event) => {
                                        setRoomType(event.target.value);
                                        form.setData('preferences', []);
                                    }}
                                >
                                    <option value="">Pilih tipe kamar</option>
                                    {types.map((type) => (
                                        <option key={type} value={type}>
                                            {type === 'vip'
                                                ? 'VIP'
                                                : type
                                                  ? type
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                    type.slice(1)
                                                  : ''}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                            <FormField label="Nomor kamar">
                                <select
                                    required
                                    disabled={!roomType}
                                    className={inputClass}
                                    value={
                                        form.data.preferences[0]?.kamar_id ?? ''
                                    }
                                    onChange={(event) =>
                                        form.setData(
                                            'preferences',
                                            event.target.value
                                                ? [
                                                      {
                                                          kamar_id:
                                                              event.target
                                                                  .value,
                                                      },
                                                  ]
                                                : [],
                                        )
                                    }
                                >
                                    <option value="">Pilih kamar</option>
                                    {buildingRooms
                                        .filter(
                                            (room) =>
                                                !roomType ||
                                                room.tipe_kamar === roomType,
                                        )
                                        .map((room) => (
                                            <option
                                                key={room.id}
                                                value={room.id}
                                            >
                                                {
                                                    room.lantai?.gedung
                                                        ?.nama_gedung
                                                }{' '}
                                                / {room.nomor_kamar} /{' '}
                                                {formatRupiah(
                                                    Number(
                                                        room.tarif_per_periode,
                                                    ),
                                                )}
                                            </option>
                                        ))}
                                </select>
                            </FormField>
                        </>
                    )}
                    <FormField label="Periode tinggal">
                        <select
                            required
                            className={inputClass}
                            value={form.data.periode_id}
                            onChange={(event) =>
                                form.setData('periode_id', event.target.value)
                            }
                        >
                            <option value="">Pilih periode</option>
                            {periods.map((period) => (
                                <option key={period.id} value={period.id}>
                                    {period.nama_periode}
                                </option>
                            ))}
                        </select>
                        <p className="text-muted mt-1 text-xs">
                            Pilih masa tinggal yang ingin didaftarkan, bukan
                            tahun masuk kuliah. Mahasiswa angkatan lama tetap
                            dapat memilih periode tinggal yang sedang dibuka.
                        </p>
                    </FormField>
                    <FormField label="Catatan">
                        <textarea
                            className={inputClass}
                            value={form.data.notes}
                            onChange={(event) =>
                                form.setData('notes', event.target.value)
                            }
                        />
                    </FormField>
                    {Object.entries(form.errors).map(([key, error]) => (
                        <p
                            role="alert"
                            className="text-error text-sm"
                            key={key}
                        >
                            {error}
                        </p>
                    ))}
                    {hasOpenRegistration && (
                        <p className="text-sm">
                            Pendaftaran periode ini sudah tercatat. Pantau
                            status dan pembayaran di bawah.
                        </p>
                    )}
                    <Button
                        type="submit"
                        disabled={
                            form.processing ||
                            !form.data.periode_id ||
                            hasOpenRegistration
                        }
                    >
                        {form.processing ? 'Mengirim...' : 'Daftar Asrama'}
                    </Button>
                </form>
            </Card>
            <Modal
                open={confirming}
                onClose={() => {
                    if (!form.processing) setConfirming(false);
                }}
                title="Konfirmasi pendaftaran asrama"
            >
                <div className="space-y-4">
                    <p className="text-sm">
                        Periksa pilihan berikut sebelum mengirim pendaftaran.
                    </p>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        <dt>Nama / NIM</dt>
                        <dd>
                            {initialUser?.nama ?? '-'} /{' '}
                            {initialUser?.nim ?? '-'}
                        </dd>
                        <dt>Periode tinggal</dt>
                        <dd>
                            {
                                periods.find(
                                    (period) =>
                                        period.id === form.data.periode_id,
                                )?.nama_periode
                            }
                        </dd>
                        <dt>Kamar</dt>
                        <dd>
                            {form.data.is_kipk
                                ? 'Penempatan oleh admin (KIPK)'
                                : `${selectedRoom?.lantai?.gedung?.nama_gedung ?? ''} / ${selectedRoom?.nomor_kamar ?? ''} / ${selectedRoom?.tipe_kamar ?? ''}`}
                        </dd>
                        <dt>Tagihan</dt>
                        <dd>
                            {form.data.is_kipk ||
                            category === 'international_free_facility'
                                ? 'Rp 0 (subsidi)'
                                : formatRupiah(
                                      Number(
                                          selectedRoom?.tarif_per_periode ?? 0,
                                      ),
                                  )}
                        </dd>
                    </dl>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="secondary"
                            disabled={form.processing}
                            onClick={() => setConfirming(false)}
                        >
                            Periksa kembali
                        </Button>
                        <Button
                            disabled={form.processing || hasOpenRegistration}
                            onClick={() =>
                                form.post(registrationStore.url(), {
                                    onSuccess: () => setConfirming(false),
                                    onError: () => setConfirming(false),
                                })
                            }
                        >
                            {form.processing
                                ? 'Mengirim...'
                                : 'Ya, kirim pendaftaran'}
                        </Button>
                    </div>
                </div>
            </Modal>
            {registration.map((item) => (
                <Card key={item.id} className="space-y-2 p-6">
                    <div className="flex justify-between gap-3">
                        <strong>{item.periode?.nama_periode}</strong>
                        <StatusBadge
                            status={item.completed_at ? 'aktif' : item.status}
                        />
                    </div>
                    <p className="text-sm">
                        {item.completed_at
                            ? 'Pendaftaran selesai. Anda aktif sebagai penghuni; tidak perlu check-in ulang.'
                            : item.status === 'draft'
                              ? 'Draft belum dikirim. Lengkapi form di atas lalu klik Daftar Asrama.'
                              : item.status === 'rejected'
                                ? 'Pendaftaran ditolak. Perbaiki data dan ajukan kembali melalui form di atas.'
                                : 'Pendaftaran menunggu verifikasi, penempatan, atau penyelesaian pembayaran.'}
                    </p>
                    {item.tagihan && (
                        <p className="text-sm">
                            Tagihan: {formatRupiah(Number(item.tagihan.total))}{' '}
                            / Dibayar:{' '}
                            {formatRupiah(Number(item.tagihan.total_dibayar))}
                        </p>
                    )}
                    <Link
                        className="text-primary underline"
                        href={tagihan.url()}
                    >
                        Lihat invoice, pembayaran, dan kwitansi
                    </Link>
                </Card>
            ))}
        </div>
    );
}
