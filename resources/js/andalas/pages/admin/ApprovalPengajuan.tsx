import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    PageHeader,
    Card,
    Button,
    StatusBadge,
    DataTable,
    RowActions,
    Tabs,
} from '../../components/ui';
import {
    approve as approveBebas,
    evidence,
    surat,
} from '@/routes/andalas/pengajuan/bebas';
import { formatRupiah } from '../../lib/format';

type BebasRow = {
    lifecycle_year?: number;
    legacy_verification_path?: string;
    payment_evidence_path?: string;
    bank_statement_path?: string;
    id: string;
    nomor_pengajuan?: string;
    alasan?: string;
    status?: string;
    file_surat_path?: string | null;
    nomor_surat_resmi?: string | null;
    catatan_penolakan?: string | null;
    verified_at?: string | null;
    created_at?: string;
    tagihan?: {
        nomor: string;
        status: string;
        total: string;
        total_dibayar: string;
    } | null;
    mahasiswa?: { user?: { nama?: string; nim_nip?: string } };
};

type Props = {
    legacy_rates?: Array<{ angkatan: number; jumlah: string }>;
    bebas_asrama?: BebasRow[];
};

export default function ApprovalPengajuan({
    bebas_asrama = [],
    legacy_rates = [],
}: Props) {
    const [activeTab, setActiveTab] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = bebas_asrama.find((item) => item.id === selectedId);
    const statuses = ['', 'diajukan', 'diverifikasi', 'disetujui', 'ditolak'];
    const labels = [
        'Semua',
        'Menunggu verifikasi',
        'Diverifikasi',
        'Disetujui',
        'Ditolak',
    ];
    const rows = bebas_asrama
        .filter(
            (item) =>
                !statuses[activeTab] || item.status === statuses[activeTab],
        )
        .map((item) => ({
            ...item,
            nama: item.mahasiswa?.user?.nama ?? '-',
            nim: item.mahasiswa?.user?.nim_nip ?? '-',
            angkatan: String(item.lifecycle_year ?? '-'),
            klasifikasi: classificationLabel(
                item.legacy_verification_path,
                item.lifecycle_year,
            ),
        }));

    return (
        <div className="space-y-4">
            <PageHeader
                title={
                    selected
                        ? 'Detail Pengajuan Bebas Asrama'
                        : 'Verifikasi Bebas Asrama'
                }
                subtitle="Tinjau status alumni, bukti pembayaran, dan penerbitan surat bebas asrama."
            />
            {selected ? (
                <>
                    <Button
                        variant="secondary"
                        onClick={() => setSelectedId(null)}
                    >
                        Kembali ke daftar
                    </Button>
                    <LegacyReview
                        key={`${selected.id}-${selected.status}`}
                        application={selected}
                        rate={
                            legacy_rates.find(
                                (rate) =>
                                    rate.angkatan === selected.lifecycle_year,
                            )?.jumlah ?? ''
                        }
                    />
                </>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <Tabs
                            active={activeTab}
                            onChange={setActiveTab}
                            tabs={labels.map(
                                (label, index) =>
                                    `${label} (${bebas_asrama.filter((item) => !statuses[index] || item.status === statuses[index]).length})`,
                            )}
                        />
                    </div>
                    <p className="text-muted text-sm">
                        Diverifikasi berarti klasifikasi sudah diperiksa; bukti
                        atau pembayaran mungkin masih perlu dilengkapi. Surat
                        tersedia setelah pengajuan disetujui dan PDF selesai
                        dibuat.
                    </p>
                    <DataTable
                        data={rows}
                        searchKeys={['nama', 'nim', 'nomor_pengajuan']}
                        searchPlaceholder="Cari nama, NIM, atau nomor pengajuan..."
                        emptyMessage="Tidak ada pengajuan pada status ini."
                        columns={[
                            { key: 'nomor_pengajuan', label: 'No. pengajuan' },
                            { key: 'nama', label: 'Nama' },
                            { key: 'nim', label: 'NIM' },
                            {
                                key: 'angkatan',
                                label: 'Angkatan',
                                filter: {
                                    type: 'select',
                                    options: [
                                        ...new Set(
                                            bebas_asrama.map((item) =>
                                                String(
                                                    item.lifecycle_year ?? '-',
                                                ),
                                            ),
                                        ),
                                    ].sort(),
                                },
                            },
                            {
                                key: 'klasifikasi',
                                label: 'Klasifikasi',
                                filter: {
                                    type: 'select',
                                    options: [
                                        'Berdasarkan sistem',
                                        'Belum diklasifikasi',
                                        'Alumni sudah lunas',
                                        'Alumni belum lunas',
                                        'Bukan alumni asrama',
                                    ],
                                },
                            },
                            {
                                key: 'status',
                                label: 'Status',
                                render: (row) => (
                                    <StatusBadge status={row.status ?? ''} />
                                ),
                            },
                            {
                                key: 'file_surat_path',
                                label: 'Surat PDF',
                                sortable: false,
                                render: (row) =>
                                    row.file_surat_path
                                        ? 'Tersedia'
                                        : row.status === 'disetujui'
                                          ? 'Sedang dibuat'
                                          : '-',
                            },
                            {
                                key: 'aksi',
                                label: 'Aksi',
                                render: (row) => (
                                    <RowActions
                                        onDetail={() => setSelectedId(row.id)}
                                    />
                                ),
                            },
                        ]}
                    />
                </>
            )}
        </div>
    );
}

function classificationLabel(path?: string, year?: number): string {
    if (Number(year) >= 2026) return 'Berdasarkan sistem';
    return (
        (
            {
                alumni_paid: 'Alumni sudah lunas',
                alumni_unpaid: 'Alumni belum lunas',
                not_alumni: 'Bukan alumni asrama',
            } as Record<string, string>
        )[path ?? ''] ?? 'Belum diklasifikasi'
    );
}
function LegacyReview({
    application,
    rate,
}: {
    application: BebasRow;
    rate: string;
}) {
    const form = useForm({
        status: 'disetujui',
        legacy_verification_path: application.legacy_verification_path ?? '',
        jumlah_tagihan_angkatan: rate,
        catatan_penolakan: '',
    });
    const open =
        application.status === 'diajukan' ||
        application.status === 'diverifikasi';
    function submit(status: string) {
        form.transform((values) => ({
            ...values,
            status,
            jumlah_tagihan_angkatan: values.jumlah_tagihan_angkatan || null,
        }));
        form.post(approveBebas.url({ pengajuan: application.id }));
    }
    return (
        <Card className="space-y-3 p-5">
            <div className="flex justify-between">
                <strong>
                    {application.mahasiswa?.user?.nama} / Angkatan{' '}
                    {application.lifecycle_year}
                </strong>
                <StatusBadge status={application.status ?? ''} />
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                    <dt className="text-muted">Nomor pengajuan</dt>
                    <dd>{application.nomor_pengajuan ?? '-'}</dd>
                </div>
                <div>
                    <dt className="text-muted">NIM</dt>
                    <dd>{application.mahasiswa?.user?.nim_nip ?? '-'}</dd>
                </div>
                <div>
                    <dt className="text-muted">Klasifikasi</dt>
                    <dd>
                        {classificationLabel(
                            application.legacy_verification_path,
                            application.lifecycle_year,
                        )}
                    </dd>
                </div>
                <div>
                    <dt className="text-muted">Alasan pengajuan</dt>
                    <dd className="whitespace-pre-wrap">
                        {application.alasan ?? '-'}
                    </dd>
                </div>
            </dl>
            {application.catatan_penolakan && (
                <p className="text-error text-sm">
                    Alasan penolakan: {application.catatan_penolakan}
                </p>
            )}
            {application.tagihan && (
                <p className="text-sm">
                    Tagihan {application.tagihan.nomor}:{' '}
                    {formatRupiah(Number(application.tagihan.total))}. Dibayar:{' '}
                    {formatRupiah(Number(application.tagihan.total_dibayar))}.
                    Status: {application.tagihan.status}.
                </p>
            )}
            {application.file_surat_path ? (
                <a
                    className="btn btn-outline btn-sm"
                    href={surat.url({ pengajuan: application.id })}
                >
                    Unduh surat PDF (dummy)
                </a>
            ) : application.status === 'disetujui' ? (
                <p className="text-muted text-sm">
                    PDF sedang disiapkan. Muat ulang halaman untuk memeriksa
                    ketersediaan surat.
                </p>
            ) : null}
            <div className="flex gap-3">
                {application.payment_evidence_path && (
                    <a
                        target="_blank"
                        rel="noreferrer"
                        className="link"
                        href={evidence.url({
                            pengajuan: application.id,
                            kind: 'payment',
                        })}
                    >
                        Bukti pembayaran
                    </a>
                )}
                {application.bank_statement_path && (
                    <a
                        target="_blank"
                        rel="noreferrer"
                        className="link"
                        href={evidence.url({
                            pengajuan: application.id,
                            kind: 'bank-statement',
                        })}
                    >
                        Rekening koran
                    </a>
                )}
            </div>
            {open && (
                <>
                    {Number(application.lifecycle_year) <= 2025 && (
                        <>
                            <select
                                aria-label="Status alumni"
                                className="select w-full"
                                value={form.data.legacy_verification_path}
                                onChange={(event) =>
                                    form.setData(
                                        'legacy_verification_path',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Pilih hasil verifikasi</option>
                                <option value="alumni_paid">
                                    Alumni sudah lunas
                                </option>
                                <option value="alumni_unpaid">
                                    Alumni belum lunas
                                </option>
                                <option value="not_alumni">
                                    Bukan alumni asrama
                                </option>
                            </select>
                            {form.data.legacy_verification_path ===
                                'alumni_unpaid' && (
                                <label className="block">
                                    Tarif angkatan {application.lifecycle_year}
                                    <input
                                        type="number"
                                        min="1"
                                        className="input w-full"
                                        value={
                                            form.data.jumlah_tagihan_angkatan
                                        }
                                        onChange={(event) =>
                                            form.setData(
                                                'jumlah_tagihan_angkatan',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                            )}
                        </>
                    )}
                    <textarea
                        className="textarea w-full"
                        placeholder="Alasan penolakan jika bukti tidak valid"
                        value={form.data.catatan_penolakan}
                        onChange={(event) =>
                            form.setData(
                                'catatan_penolakan',
                                event.target.value,
                            )
                        }
                    />
                    {Object.entries(form.errors).map(([key, error]) => (
                        <p key={key} className="text-error">
                            {error}
                        </p>
                    ))}
                    <div className="flex gap-3">
                        <Button
                            disabled={form.processing}
                            onClick={() => submit('disetujui')}
                        >
                            {form.data.legacy_verification_path ===
                            'alumni_unpaid'
                                ? 'Verifikasi dan buat tagihan'
                                : 'Setujui dan terbitkan surat'}
                        </Button>
                        <Button
                            variant="secondary"
                            disabled={
                                form.processing ||
                                !form.data.catatan_penolakan.trim()
                            }
                            onClick={() => submit('ditolak')}
                        >
                            Tolak
                        </Button>
                    </div>
                </>
            )}
        </Card>
    );
}
