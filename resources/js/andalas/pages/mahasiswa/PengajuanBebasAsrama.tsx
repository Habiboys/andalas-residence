import { useForm } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    Button,
    FormField,
    inputClass,
    StatusBadge,
} from '../../components/ui';
import { bebas } from '@/routes/andalas/pengajuan';
import { surat } from '@/routes/andalas/pengajuan/bebas';
import { tagihan } from '@/routes/mahasiswa';
import { Link } from '@inertiajs/react';

type Application = {
    id: string;
    status: string;
    nomor_pengajuan: string;
    file_surat_path?: string;
    catatan_penolakan?: string;
    legacy_verification_path?: string;
    tagihan_id?: string;
};
type Props = {
    bebas_asrama?: Application[];
    initialUser?: { angkatan?: string };
};

export default function PengajuanBebasAsrama({
    bebas_asrama = [],
    initialUser,
}: Props) {
    const legacy = Number(initialUser?.angkatan) <= 2025;
    const form = useForm({
        alasan: '',
        payment_evidence: null as File | null,
        bank_statement: null as File | null,
    });
    const currentPath = bebas_asrama.find(
        (application) => application.status !== 'ditolak',
    )?.legacy_verification_path;
    const waitingInvoice = currentPath === 'alumni_unpaid';
    const approved = bebas_asrama.some(
        (application) => application.status === 'disetujui',
    );
    return (
        <div className="max-w-3xl space-y-4">
            <PageHeader
                title="Surat Bebas Asrama"
                subtitle={
                    legacy
                        ? 'Admin memverifikasi status alumni dan pelunasan untuk riwayat sebelum sistem.'
                        : 'Surat diproses dari riwayat checkout dan pelunasan tagihan dalam sistem.'
                }
            />
            {bebas_asrama.map((application) => (
                <Card key={application.id} className="space-y-2 p-5">
                    <div className="flex justify-between">
                        <strong>{application.nomor_pengajuan}</strong>
                        <StatusBadge status={application.status} />
                    </div>
                    {application.legacy_verification_path && (
                        <p>
                            Status verifikasi:{' '}
                            {
                                (
                                    {
                                        alumni_paid: 'Alumni sudah lunas',
                                        alumni_unpaid: 'Alumni belum lunas',
                                        not_alumni: 'Bukan alumni asrama',
                                    } as Record<string, string>
                                )[application.legacy_verification_path]
                            }
                        </p>
                    )}
                    {application.catatan_penolakan && (
                        <p className="text-error">
                            {application.catatan_penolakan}
                        </p>
                    )}
                    {application.tagihan_id && (
                        <Link
                            className="link link-primary"
                            href={tagihan.url()}
                        >
                            Lihat tagihan pelunasan
                        </Link>
                    )}
                    {application.file_surat_path ? (
                        <a
                            className="link link-primary"
                            href={surat.url({ pengajuan: application.id })}
                        >
                            Unduh surat
                        </a>
                    ) : (
                        application.status === 'disetujui' && (
                            <p>
                                Surat sedang disiapkan dan akan tersedia di akun
                                serta dikirim melalui email.
                            </p>
                        )
                    )}
                </Card>
            ))}
            {!approved && !waitingInvoice && (
                <Card className="p-6">
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.post(bebas.url());
                        }}
                    >
                        <p className="text-sm">
                            {legacy
                                ? 'Admin menentukan status Anda sebagai alumni sudah lunas, alumni belum lunas, atau bukan alumni. Jika sudah pernah membayar, lampirkan bukti pembayaran dan rekening koran.'
                                : 'Pastikan checkout sudah diselesaikan fasilitator dan seluruh tagihan lunas. Sistem memeriksa riwayat tersebut tanpa unggah bukti lama.'}
                        </p>
                        <FormField label="Keperluan surat">
                            <textarea
                                required
                                className={inputClass}
                                value={form.data.alasan}
                                onChange={(event) =>
                                    form.setData('alasan', event.target.value)
                                }
                            />
                        </FormField>
                        {legacy &&
                            (!currentPath || currentPath === 'alumni_paid') && (
                                <>
                                    <FormField label="Bukti pembayaran">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            className="file-input w-full"
                                            onChange={(event) =>
                                                form.setData(
                                                    'payment_evidence',
                                                    event.target.files?.[0] ??
                                                        null,
                                                )
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Rekening koran">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            className="file-input w-full"
                                            onChange={(event) =>
                                                form.setData(
                                                    'bank_statement',
                                                    event.target.files?.[0] ??
                                                        null,
                                                )
                                            }
                                        />
                                    </FormField>
                                </>
                            )}
                        {Object.entries(form.errors).map(([key, error]) => (
                            <p
                                key={key}
                                role="alert"
                                className="text-error text-sm"
                            >
                                {error}
                            </p>
                        ))}
                        <Button disabled={form.processing} type="submit">
                            {form.processing
                                ? 'Memproses...'
                                : bebas_asrama.some(
                                        (application) =>
                                            application.status !== 'ditolak',
                                    )
                                  ? 'Lengkapi pengajuan'
                                  : 'Ajukan surat'}
                        </Button>
                    </form>
                </Card>
            )}
        </div>
    );
}
