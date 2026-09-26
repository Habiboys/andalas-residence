import { useForm } from '@inertiajs/react';
import { PageHeader, Card, inputClass, StatusBadge } from '../../components/ui';
import { approve, evidence, surat } from '@/routes/andalas/pengajuan/bebas';
type Row = {
    id: string;
    nomor_pengajuan: string;
    status: string;
    legacy_verification_path?: string;
    payment_evidence_path?: string;
    bank_statement_path?: string;
    file_surat_path?: string;
    catatan_penolakan?: string;
    mahasiswa?: { user?: { nama: string; nim_nip: string } };
};
function Review({ row }: { row: Row }) {
    const form = useForm({
        status: 'disetujui',
        catatan_penolakan: '',
        nomor_surat_resmi: '',
    });
    return (
        <Card className="space-y-3 p-5">
            <div className="flex justify-between">
                <h2>
                    {row.mahasiswa?.user?.nama} / {row.mahasiswa?.user?.nim_nip}
                </h2>
                <StatusBadge status={row.status} />
            </div>
            <p>
                {row.nomor_pengajuan} ?{' '}
                {row.legacy_verification_path === 'not_alumni'
                    ? 'Tidak pernah tinggal'
                    : row.legacy_verification_path === 'alumni_paid'
                      ? 'Alumni mengaku sudah lunas'
                      : 'Alumni belum lunas'}
            </p>
            {row.catatan_penolakan && <p>{row.catatan_penolakan}</p>}
            <div className="flex gap-3">
                {row.payment_evidence_path && (
                    <a
                        className="link"
                        href={evidence.url({
                            pengajuan: row.id,
                            kind: 'payment',
                        })}
                    >
                        Bukti bayar
                    </a>
                )}
                {row.bank_statement_path && (
                    <a
                        className="link"
                        href={evidence.url({
                            pengajuan: row.id,
                            kind: 'bank-statement',
                        })}
                    >
                        Rekening koran
                    </a>
                )}
                {row.file_surat_path && (
                    <a className="link" href={surat.url({ pengajuan: row.id })}>
                        Unduh surat
                    </a>
                )}
            </div>
            {row.status !== 'disetujui' && (
                <form
                    className="space-y-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(approve.url({ pengajuan: row.id }));
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
                            <option value="disetujui">
                                Verifikasi / setujui bukti
                            </option>
                            <option value="ditolak">
                                Tolak ? temui admin di kantor
                            </option>
                        </select>
                    </label>
                    <label>
                        Nomor surat resmi (opsional)
                        <input
                            className={inputClass}
                            value={form.data.nomor_surat_resmi}
                            onChange={(e) =>
                                form.setData(
                                    'nomor_surat_resmi',
                                    e.target.value,
                                )
                            }
                        />
                    </label>
                    <label>
                        Catatan penolakan (opsional)
                        <textarea
                            className={inputClass}
                            value={form.data.catatan_penolakan}
                            onChange={(e) =>
                                form.setData(
                                    'catatan_penolakan',
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
                        Simpan keputusan
                    </button>
                </form>
            )}
        </Card>
    );
}
export default function ApprovalPengajuan({
    bebas_asrama = [],
}: {
    bebas_asrama?: Row[];
}) {
    return (
        <div className="space-y-5">
            <PageHeader
                title="Verifikasi Surat Asrama"
                subtitle="Lengkapi arsip alumni dan tarif gedung?angkatan di Pengaturan Layanan sebelum memverifikasi bukti lama."
            />
            {bebas_asrama.map((row) => (
                <Review key={row.id} row={row} />
            ))}
            {!bebas_asrama.length && <p>Belum ada pengajuan.</p>}
        </div>
    );
}
