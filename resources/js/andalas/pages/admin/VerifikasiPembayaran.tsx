import { useForm, usePoll } from '@inertiajs/react';
import { PageHeader, Card, inputClass, StatusBadge } from '../../components/ui';
import { verify, bukti } from '@/routes/andalas/pembayaran';
import { formatRupiah } from '../../lib/format';
type Payment = {
    id: string;
    kode_transaksi?: string;
    nominal: number;
    status: string;
    catatan_verifikasi?: string;
    bukti_transfer_path?: string;
    mahasiswa?: { user?: { nama: string; nim_nip: string } };
    tagihan?: { nomor: string };
};
function Review({ row }: { row: Payment }) {
    const form = useForm({ status: 'lunas', catatan_verifikasi: '' });
    return (
        <Card className="space-y-3 p-5">
            <div className="flex justify-between">
                <h2>
                    {row.mahasiswa?.user?.nama} / {row.mahasiswa?.user?.nim_nip}
                </h2>
                <StatusBadge status={row.status} />
            </div>
            <p>
                {row.kode_transaksi} ? {row.tagihan?.nomor} ?{' '}
                {formatRupiah(row.nominal)}
            </p>
            {row.bukti_transfer_path && (
                <a className="link" href={bukti.url({ pembayaran: row.id })}>
                    Lihat bukti pembayaran
                </a>
            )}
            {row.catatan_verifikasi && <p>{row.catatan_verifikasi}</p>}
            {row.status === 'menunggu_verifikasi' && (
                <form
                    className="space-y-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(verify.url({ pembayaran: row.id }));
                    }}
                >
                    <label>
                        Keputusan
                        <select
                            className={inputClass}
                            value={form.data.status}
                            onChange={(e) =>
                                form.setData('status', e.target.value)
                            }
                        >
                            <option value="lunas">Pembayaran valid</option>
                            <option value="ditolak">Tolak bukti</option>
                        </select>
                    </label>
                    <label>
                        Catatan
                        <textarea
                            className={inputClass}
                            value={form.data.catatan_verifikasi}
                            onChange={(e) =>
                                form.setData(
                                    'catatan_verifikasi',
                                    e.target.value,
                                )
                            }
                        />
                    </label>
                    {Object.values(form.errors).map((e, i) => (
                        <p role="alert" className="text-error" key={i}>
                            {e}
                        </p>
                    ))}
                    <button
                        className="btn btn-primary"
                        disabled={form.processing}
                    >
                        Simpan verifikasi
                    </button>
                </form>
            )}
        </Card>
    );
}
export default function VerifikasiPembayaran({
    pembayaran = [],
}: {
    pembayaran?: Payment[];
}) {
    usePoll(5000, { only: ['pembayaran'] });
    return (
        <div className="space-y-5">
            <PageHeader
                title="Verifikasi Pembayaran"
                subtitle="Pembayaran valid memperbarui tagihan dan menyelesaikan pendaftaran atau penerbitan surat yang memenuhi syarat."
            />
            {pembayaran.map((row) => (
                <Review key={row.id} row={row} />
            ))}
            {!pembayaran.length && <p>Belum ada pembayaran.</p>}
        </div>
    );
}
