import { useForm } from '@inertiajs/react';
import { PageHeader, Card, inputClass, StatusBadge } from '../../components/ui';
import { sponsor, update } from '@/routes/andalas/registrations';
type Room = {
    id: string;
    nomor_kamar: string;
    lantai?: { gedung?: { nama_gedung: string } };
};
type Row = {
    id: string;
    funding?: string;
    is_kipk: boolean;
    reserved_room_id?: string;
    sponsor_name?: string;
    status: string;
    completed_at?: string;
    student_profile?: { user?: { nama: string; nim_nip: string } };
};
function Review({ row, rooms }: { row: Row; rooms: Room[] }) {
    const form = useForm({
        kamar_id: row.reserved_room_id ?? '',
        sponsor_name: row.sponsor_name ?? '',
        status: 'rejected',
        notes: '',
    });
    return (
        <Card className="space-y-3 p-5">
            <div className="flex justify-between">
                <h2 className="font-semibold">
                    {row.student_profile?.user?.nama} /{' '}
                    {row.student_profile?.user?.nim_nip}
                </h2>
                <StatusBadge status={row.completed_at ? 'aktif' : row.status} />
            </div>
            {!row.completed_at && row.status !== 'rejected' && (
                <>
                    <p>
                        {row.funding === 'sponsor'
                            ? 'Verifikasi penanggung biaya dan tempatkan penghuni.'
                            : 'Pembayaran pribadi menyelesaikan pendaftaran secara otomatis.'}
                    </p>
                    {row.funding === 'sponsor' && (
                        <form
                            className="space-y-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                form.post(
                                    sponsor.url({ registration: row.id }),
                                );
                            }}
                        >
                            {row.is_kipk && (
                                <label>
                                    Kamar
                                    <select
                                        className={inputClass}
                                        required
                                        value={form.data.kamar_id}
                                        onChange={(e) =>
                                            form.setData(
                                                'kamar_id',
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            Pilih kamar KIP-K
                                        </option>
                                        {rooms.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.lantai?.gedung?.nama_gedung}{' '}
                                                / {r.nomor_kamar}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            <label>
                                Penanggung biaya
                                <input
                                    className={inputClass}
                                    required
                                    value={form.data.sponsor_name}
                                    onChange={(e) =>
                                        form.setData(
                                            'sponsor_name',
                                            e.target.value,
                                        )
                                    }
                                />
                            </label>
                            <button
                                className="btn btn-primary"
                                disabled={form.processing}
                            >
                                Sahkan dan selesaikan penempatan
                            </button>
                        </form>
                    )}
                    <label>
                        Catatan pembatalan
                        <input
                            className={inputClass}
                            value={form.data.notes}
                            onChange={(e) =>
                                form.setData('notes', e.target.value)
                            }
                        />
                    </label>
                    <button
                        className="btn btn-outline"
                        disabled={form.processing}
                        onClick={() =>
                            form.patch(update.url({ registration: row.id }))
                        }
                    >
                        Batalkan pendaftaran
                    </button>
                    {Object.values(form.errors).map((e, i) => (
                        <p key={i} role="alert" className="text-error">
                            {e}
                        </p>
                    ))}
                </>
            )}
        </Card>
    );
}
export default function RegistrationReview({
    registrations = [],
    rooms = [],
}: {
    registrations?: Row[];
    rooms?: Room[];
}) {
    return (
        <div className="space-y-5">
            <PageHeader
                title="Penempatan dan Penanggung Biaya"
                subtitle="Pendaftaran pribadi selesai otomatis setelah pembayaran; KIP-K dan sponsor dikelola di sini."
            />
            {registrations.map((row) => (
                <Review key={row.id} row={row} rooms={rooms} />
            ))}
            {!registrations.length && <p>Belum ada pendaftaran.</p>}
        </div>
    );
}
