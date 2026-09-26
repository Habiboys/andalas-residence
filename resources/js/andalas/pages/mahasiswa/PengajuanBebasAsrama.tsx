import { Link, useForm } from '@inertiajs/react';
import { PageHeader, Card, inputClass, StatusBadge } from '../../components/ui';
import { bebas } from '@/routes/andalas/pengajuan';
import { surat } from '@/routes/andalas/pengajuan/bebas';
import { tagihan } from '@/routes/mahasiswa';
type Application = {
    legacy_verification_path?: string;
    id: string;
    status: string;
    nomor_pengajuan: string;
    file_surat_path?: string;
    catatan_penolakan?: string;
    tagihan_id?: string;
    document_kind?: string;
};
export default function PengajuanBebasAsrama({
    bebas_asrama = [],
    initialUser,
    historical_evidence_allowed = false,
}: {
    bebas_asrama?: Application[];
    initialUser?: { angkatan?: string; residence_state?: string };
    historical_evidence_allowed?: boolean;
}) {
    const active = ['binaan', 'hunian'].includes(
        initialUser?.residence_state ?? '',
    );
    const form = useForm({
        alasan: '',
        payment_evidence: null as File | null,
        bank_statement: null as File | null,
    });
    return (
        <div className="space-y-5">
            <PageHeader
                title="Surat Keterangan Asrama"
                subtitle="Surat bebas asrama untuk mantan penghuni; surat keterangan tidak tinggal untuk mahasiswa yang tidak pernah tinggal."
            />
            <Card className="space-y-4 p-5">
                {active ? (
                    <p>Selesaikan check-out sebelum mengurus surat.</p>
                ) : (
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post(bebas.url());
                        }}
                    >
                        <div className="space-y-2">
                            <p className="font-semibold">
                                Jenis surat ditentukan otomatis
                            </p>
                            <p className="text-sm">
                                Sistem memeriksa arsip alumni, riwayat hunian,
                                checkout, dan tagihan Anda sebelum menerbitkan
                                surat.
                            </p>
                            <p className="text-sm">
                                {initialUser?.residence_state === 'alumni'
                                    ? 'Anda terdata sebagai alumni asrama. Surat diproses setelah seluruh tagihan pribadi lunas.'
                                    : initialUser?.residence_state ===
                                        'riwayat_perlu_verifikasi'
                                      ? 'Riwayat hunian Anda perlu diperiksa Admin Layanan.'
                                      : 'Belum ada riwayat tinggal yang terdata. Surat Keterangan Tidak Tinggal di Asrama diterbitkan jika pemeriksaan sistem memenuhi syarat.'}
                            </p>
                        </div>
                        <label className="block">
                            Keperluan surat
                            <textarea
                                className={inputClass}
                                required
                                value={form.data.alasan}
                                onChange={(e) =>
                                    form.setData('alasan', e.target.value)
                                }
                            />
                        </label>
                        {historical_evidence_allowed && (
                            <fieldset className="space-y-3">
                                <legend className="font-semibold">
                                    Bukti pembayaran lama (jika ada)
                                </legend>
                                <p className="text-sm">
                                    Jika pernah tinggal dan sudah membayar di
                                    luar sistem, unggah kedua berkas untuk
                                    diperiksa Admin Layanan. Jika riwayat Anda
                                    belum terdata, hubungi admin untuk
                                    melengkapi arsip sebelum mengajukan surat.
                                    Tanpa bukti, alumni yang terdata mengikuti
                                    pemeriksaan tagihan.
                                </p>
                                {(
                                    [
                                        'payment_evidence',
                                        'bank_statement',
                                    ] as const
                                ).map((key) => (
                                    <label className="block" key={key}>
                                        {key === 'payment_evidence'
                                            ? 'Bukti pembayaran'
                                            : 'Rekening koran'}
                                        <input
                                            className="file-input block"
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            required={Boolean(
                                                form.data.payment_evidence ||
                                                form.data.bank_statement,
                                            )}
                                            onChange={(e) =>
                                                form.setData(
                                                    key,
                                                    e.target.files?.[0] ?? null,
                                                )
                                            }
                                        />
                                    </label>
                                ))}
                                <p className="text-sm">
                                    PDF/JPG/PNG, maksimum 5 MB per berkas.
                                    Unggahan belum dianggap sebagai pelunasan.
                                </p>
                            </fieldset>
                        )}
                        {Object.values(form.errors).map((e, i) => (
                            <p role="alert" className="text-error" key={i}>
                                {e}
                            </p>
                        ))}
                        <button
                            className="btn btn-primary"
                            disabled={form.processing}
                        >
                            Ajukan surat
                        </button>
                    </form>
                )}
            </Card>
            <Card className="space-y-3 p-5">
                <h2 className="font-semibold">Pengajuan dan arsip surat</h2>
                {bebas_asrama.length === 0 && <p>Belum ada pengajuan.</p>}
                {bebas_asrama.map((a) => (
                    <div
                        key={a.id}
                        className="border-base-300 space-y-2 border-b py-3"
                    >
                        <div className="flex justify-between">
                            <span>{a.nomor_pengajuan}</span>
                            <StatusBadge status={a.status} />
                        </div>
                        <p>
                            {a.document_kind === 'not_resident'
                                ? 'Surat Keterangan Tidak Tinggal di Asrama'
                                : 'Surat Bebas Asrama'}
                        </p>
                        {a.catatan_penolakan && (
                            <p role="alert">{a.catatan_penolakan}</p>
                        )}
                        {a.tagihan_id && (
                            <Link className="link" href={tagihan.url()}>
                                Lihat tagihan
                            </Link>
                        )}
                        {a.file_surat_path ? (
                            <a
                                className="btn btn-outline btn-sm"
                                href={surat.url({ pengajuan: a.id })}
                            >
                                Unduh surat
                            </a>
                        ) : (
                            a.status === 'disetujui' && (
                                <p>
                                    Surat sedang disiapkan dan akan dikirim
                                    melalui email.
                                </p>
                            )
                        )}
                    </div>
                ))}
            </Card>
        </div>
    );
}
