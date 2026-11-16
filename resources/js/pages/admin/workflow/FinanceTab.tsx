import { Link, router, usePage } from '@inertiajs/react';
import * as applications from '@/actions/App/Http/Controllers/ResidenceApplicationController';
import * as invoiceActions from '@/actions/App/Http/Controllers/InvoiceController';
import * as workflow from '@/actions/App/Http/Controllers/ResidenceWorkflowController';
import { bukti as pembayaranBukti } from '@/routes/andalas/pembayaran';
import {
    residenceManagement as adminResMgmt,
    verifikasiPembayaran as adminVerifikasiPembayaran,
} from '@/routes/admin';
import {
    residenceManagement as adminLayananResMgmt,
    verifikasiPembayaran as adminLayananVerifikasiPembayaran,
} from '@/routes/admin_layanan';
import {
    ConfirmDialog,
    Modal,
    StatusBadge,
} from '@/andalas/components/ui';
import { formatDateTime, formatRupiah } from '@/andalas/lib/format';
import { ArrowRight, Download, Eye, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    ActionForm,
    Field,
    WorkflowPanel,
    fieldInputClass,
} from './shared';
import type {
    Application,
    Invoice,
    InvoiceGroupItem,
    PaymentProof,
    Reference,
} from './types';

function remainingForInvoice(inv: Invoice, payerType: string): number {
    return payerType === 'sponsor'
        ? Math.max(0, Number(inv.sponsor_total) - Number(inv.sponsor_paid))
        : Math.max(0, Number(inv.total) - Number(inv.total_dibayar));
}

function statementPreviewKind(path?: string | null): 'image' | 'pdf' | 'other' {
    const ext = (path?.split('.').pop() ?? '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
        return 'image';
    }
    if (ext === 'pdf') {
        return 'pdf';
    }
    return 'other';
}

export default function FinanceTab({
    references,
    invoices,
    groups,
    applicationItems,
    proofs,
}: {
    proofs: PaymentProof[];
    references: Reference[];
    invoices: Invoice[];
    groups: InvoiceGroupItem[];
    applicationItems: Application[];
}) {
    const [searchRef, setSearchRef] = useState('');
    const [previewRef, setPreviewRef] = useState<Reference | null>(null);
    const [deletingRef, setDeletingRef] = useState<Reference | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);
    const [selectedAppId, setSelectedAppId] = useState('');
    const [payerFilter, setPayerFilter] = useState<'sponsor' | 'personal'>(
        'sponsor',
    );

    const visibleReferences = useMemo(() => {
        const q = searchRef.trim().toLowerCase();
        if (!q) {
            return references;
        }
        return references.filter((ref) =>
            `${ref.reference} ${ref.source}`.toLowerCase().includes(q),
        );
    }, [references, searchRef]);

    const applicationInvoices = useMemo(() => {
        if (!selectedAppId) {
            return [];
        }
        return invoices.filter(
            (inv) =>
                inv.registration?.residence_application_id === selectedAppId &&
                remainingForInvoice(inv, payerFilter) > 0,
        );
    }, [invoices, selectedAppId, payerFilter]);

    const page = usePage<{ auth?: { user?: { role?: string } } }>();
    const role = page?.props?.auth?.user?.role;
    const paymentAccountsUrl =
        role === 'admin_layanan'
            ? adminLayananResMgmt.url({ query: { tab: 'payment-account' } })
            : adminResMgmt.url({ query: { tab: 'payment-account' } });

    const verifikasiUrlFor = (querySearch: string) =>
        role === 'admin_layanan'
            ? adminLayananVerifikasiPembayaran.url({
                  query: { search: querySearch },
              })
            : adminVerifikasiPembayaran.url({
                  query: { search: querySearch },
              });

    const handleDeleteStatement = () => {
        if (!deletingRef) {
            return;
        }
        setDeletingBusy(true);
        router.delete(workflow.destroyPaymentEvidence.url(deletingRef.id), {
            preserveScroll: true,
            onSuccess: () => setDeletingRef(null),
            onFinish: () => setDeletingBusy(false),
        });
    };

    return (
        <div className="space-y-5">
            <div className="border-primary/25 bg-primary/5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm">
                <div>
                    <p className="text-base-content font-semibold">
                        Rekening Resmi Tujuan Transfer Asrama
                    </p>
                    <p className="text-base-content/75 text-xs">
                        Tambah atau perbarui nomor rekening bank resmi asrama
                        agar tampil otomatis di halaman pembayaran mahasiswa.
                    </p>
                </div>
                <Link
                    href={paymentAccountsUrl}
                    className="btn btn-sm btn-primary btn-outline shrink-0"
                >
                    Kelola Rekening Pembayaran →
                </Link>
            </div>

            <WorkflowPanel
                title={`Bukti transfer menunggu verifikasi (${proofs.length})`}
                subtitle="Periksa lampiran bukti transfer mahasiswa lalu buka Verifikasi Pembayaran untuk mengesahkan (Lunas) atau menolak bukti. Arsip rekening koran DPUB di bawah dapat digunakan sebagai acuan cek manual."
            >
                {proofs.length === 0 ? (
                    <p className="text-base-content/70 text-sm">
                        Belum ada bukti transfer mahasiswa yang menunggu
                        verifikasi.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-sm table">
                            <thead>
                                <tr>
                                    <th>Kode Transaksi</th>
                                    <th>Mahasiswa</th>
                                    <th>Invoice</th>
                                    <th>Rekening Tujuan</th>
                                    <th>Pengirim</th>
                                    <th className="text-right">Nominal</th>
                                    <th>Waktu Transfer</th>
                                    <th className="text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proofs.map((proof) => (
                                    <tr key={proof.id}>
                                        <td className="font-mono text-xs">
                                            {proof.kode_transaksi}
                                        </td>
                                        <td>
                                            <div className="font-medium">
                                                {proof.mahasiswa.user.nama}
                                            </div>
                                            {proof.mahasiswa.user.nim_nip && (
                                                <div className="text-base-content/60 text-xs">
                                                    {
                                                        proof.mahasiswa.user
                                                            .nim_nip
                                                    }
                                                </div>
                                            )}
                                        </td>
                                        <td className="font-mono text-xs">
                                            {proof.tagihan?.nomor ?? '-'}
                                        </td>
                                        <td className="text-xs">
                                            {proof.rekening_tujuan || '-'}
                                        </td>
                                        <td className="text-xs">
                                            {proof.nama_bank || '-'}{' '}
                                            {proof.nomor_rekening_pengirim
                                                ? `· ${proof.nomor_rekening_pengirim}`
                                                : ''}
                                            {proof.atas_nama_pengirim && (
                                                <div className="text-base-content/60">
                                                    a.n.{' '}
                                                    {proof.atas_nama_pengirim}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-right font-semibold tabular-nums">
                                            {formatRupiah(
                                                Number(proof.nominal),
                                            )}
                                        </td>
                                        <td className="text-xs">
                                            {formatDateTime(
                                                proof.tanggal_bayar ??
                                                    proof.created_at,
                                            )}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <a
                                                    href={pembayaranBukti.url(
                                                        proof.id,
                                                    )}
                                                    className="btn btn-outline btn-xs"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Unduh Bukti
                                                </a>
                                                <Link
                                                    href={verifikasiUrlFor(
                                                        proof.mahasiswa.user
                                                            .nim_nip ??
                                                            proof.kode_transaksi,
                                                    )}
                                                    className="btn btn-primary btn-xs gap-1"
                                                >
                                                    Verifikasi / ACC
                                                    <ArrowRight className="size-3" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </WorkflowPanel>

            <WorkflowPanel
                title="Upload Rekening Koran DPUB"
                subtitle="File rekening koran DPUB hanya disimpan sebagai arsip agar admin dapat melihat dan mencocokkan mutasi bank secara manual (tidak dicatat sebagai transaksi atau mengubah saldo di sistem)."
            >
                <ActionForm
                    url={workflow.recordPayment.url()}
                    label="Unggah rekening koran DPUB"
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                            name="reference"
                            label="Judul / Nomor Referensi Rekening Koran"
                        />
                        <Field
                            name="source"
                            label="Nama Bank / Rekening Sumber"
                        />
                        <Field
                            name="paid_at"
                            label="Tanggal Rekening Koran"
                            type="date"
                        />
                        <Field
                            name="evidence"
                            label="File Rekening Koran (PDF, Excel, CSV, Gambar)"
                            type="file"
                        />
                    </div>
                </ActionForm>
            </WorkflowPanel>

            <WorkflowPanel
                title={`Arsip Rekening Koran DPUB (${visibleReferences.length})`}
                subtitle="Klik Preview untuk membuka berkas gambar/PDF langsung di layar atau Unduh file aslinya sebagai pembanding saat memverifikasi pembayaran mahasiswa."
            >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <input
                        type="search"
                        className="input input-bordered input-xs w-64"
                        placeholder="Cari judul atau bank sumber..."
                        value={searchRef}
                        onChange={(e) => setSearchRef(e.target.value)}
                    />
                </div>

                {visibleReferences.length === 0 ? (
                    <p className="text-base-content/70 text-sm">
                        Belum ada arsip rekening koran DPUB yang diunggah.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-sm table">
                            <thead>
                                <tr>
                                    <th>Judul / Referensi</th>
                                    <th>Bank / Sumber</th>
                                    <th>Tanggal</th>
                                    <th className="text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleReferences.map((ref) => (
                                    <tr key={ref.id}>
                                        <td className="font-medium">
                                            {ref.reference}
                                        </td>
                                        <td>{ref.source}</td>
                                        <td>
                                            {ref.paid_at?.slice(0, 10) ?? '-'}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-1.5">
                                                {statementPreviewKind(
                                                    ref.evidence_path,
                                                ) !== 'other' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs btn-outline btn-primary gap-1"
                                                        onClick={() =>
                                                            setPreviewRef(ref)
                                                        }
                                                    >
                                                        <Eye className="size-3.5" />
                                                        Preview
                                                    </button>
                                                )}
                                                <a
                                                    className="btn btn-xs btn-outline gap-1"
                                                    href={workflow.paymentEvidence.url(
                                                        ref.id,
                                                    )}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <Download className="size-3.5" />
                                                    Unduh
                                                </a>
                                                <button
                                                    type="button"
                                                    className="btn btn-xs btn-ghost text-error gap-1"
                                                    onClick={() =>
                                                        setDeletingRef(ref)
                                                    }
                                                >
                                                    <Trash2 className="size-3.5" />
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </WorkflowPanel>

            <WorkflowPanel
                title="Invoice gabungan institusi"
                subtitle="Hanya tagihan peserta pada permohonan institusi terpilih yang akan ditampilkan."
            >
                <ActionForm
                    url={invoiceActions.store.url()}
                    label="Terbitkan invoice final"
                    disabled={!selectedAppId || applicationInvoices.length === 0}
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                            name="residence_application_id"
                            label="Permohonan institusi"
                        >
                            <select
                                className={fieldInputClass}
                                name="residence_application_id"
                                value={selectedAppId}
                                onChange={(e) =>
                                    setSelectedAppId(e.target.value)
                                }
                                required
                            >
                                <option value="">Pilih permohonan</option>
                                {applicationItems.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.number} — {a.institution ?? 'Mandiri'}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field name="payer_type" label="Jenis kewajiban">
                            <select
                                className={fieldInputClass}
                                name="payer_type"
                                value={payerFilter}
                                onChange={(e) =>
                                    setPayerFilter(
                                        e.target.value as
                                            | 'sponsor'
                                            | 'personal',
                                    )
                                }
                            >
                                <option value="sponsor">Institusi</option>
                                <option value="personal">Pribadi</option>
                            </select>
                        </Field>

                        <Field name="nomor" label="Nomor invoice" />
                        <Field name="recipient" label="Penerima (Kepada Yth)" />
                        <Field name="institution" label="Institusi" />
                        <Field name="subject" label="Perihal" />
                        <Field
                            name="due_date"
                            label="Jatuh tempo"
                            type="date"
                        />
                        <Field name="bank" label="Bank tujuan" />
                        <Field
                            name="account_number"
                            label="Nomor rekening tujuan"
                        />
                        <Field name="account_name" label="Nama rekening" />
                        <Field name="signer" label="Pimpinan penandatangan" />
                        <Field
                            name="administration_signer"
                            label="Nama administrasi (opsional)"
                            required={false}
                        />
                    </div>

                    <fieldset className="border-base-300 rounded-lg border p-3">
                        <legend className="px-1 text-sm font-medium">
                            Pilih tagihan peserta ({applicationInvoices.length}{' '}
                            tersedia)
                        </legend>

                        {!selectedAppId ? (
                            <p className="text-base-content/60 text-xs">
                                Pilih permohonan institusi terlebih dahulu untuk
                                memuat daftar tagihan peserta.
                            </p>
                        ) : applicationInvoices.length === 0 ? (
                            <p className="text-warning text-xs">
                                Tidak ada tagihan{' '}
                                {payerFilter === 'sponsor'
                                    ? 'institusi'
                                    : 'pribadi'}{' '}
                                yang masih memiliki tunggakan pada permohonan
                                ini.
                            </p>
                        ) : (
                            <div className="grid gap-1.5 sm:grid-cols-2">
                                {applicationInvoices.map((inv) => (
                                    <label
                                        className="bg-base-200/40 flex items-center gap-2 rounded p-2 text-sm"
                                        key={inv.id}
                                    >
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-xs"
                                            name="invoice_ids[]"
                                            value={inv.id}
                                            defaultChecked
                                        />
                                        <span>
                                            <strong>
                                                {inv.mahasiswa?.user.nama ??
                                                    '-'}
                                            </strong>{' '}
                                            — {inv.nomor} (
                                            {formatRupiah(
                                                remainingForInvoice(
                                                    inv,
                                                    payerFilter,
                                                ),
                                            )}
                                            )
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </fieldset>
                </ActionForm>

                {groups.length > 0 && (
                    <div className="space-y-2 border-t pt-4">
                        <h3 className="text-sm font-semibold">
                            Arsip Invoice Gabungan Institusi ({groups.length})
                        </h3>
                        {groups.map((group) => (
                            <div
                                className="bg-base-200/40 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                                key={group.id}
                            >
                                <a
                                    href={invoiceActions.download.url(group.id)}
                                    className="link link-primary font-medium"
                                >
                                    {group.nomor} (Unduh PDF)
                                </a>

                                {group.residence_application_id &&
                                    (['queued', 'sent'].includes(
                                        group.delivery_status ?? '',
                                    ) ? (
                                        <StatusBadge
                                            status="selesai"
                                            label={
                                                group.delivery_status === 'sent'
                                                    ? 'Email diserahkan ke pengirim'
                                                    : 'Dalam antrean email'
                                            }
                                        />
                                    ) : (
                                        <ActionForm
                                            url={applications.sendInvoice.url(
                                                group.id,
                                            )}
                                            label={
                                                group.delivery_status ===
                                                'failed'
                                                    ? 'Gagal — coba kirim ulang'
                                                    : 'Kirim invoice ke institusi'
                                            }
                                        />
                                    ))}
                            </div>
                        ))}
                    </div>
                )}
            </WorkflowPanel>

            <Modal
                open={Boolean(previewRef)}
                onClose={() => setPreviewRef(null)}
                title={
                    previewRef
                        ? `Preview Rekening Koran: ${previewRef.reference}`
                        : 'Preview Rekening Koran'
                }
                width="max-w-4xl"
            >
                {previewRef && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="text-base-content/75">
                                {previewRef.source} ·{' '}
                                {previewRef.paid_at?.slice(0, 10) ?? '-'}
                            </span>
                            <a
                                href={workflow.paymentEvidence.url(previewRef.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline btn-xs gap-1"
                            >
                                <Download className="size-3.5" />
                                Unduh File Asli
                            </a>
                        </div>
                        {statementPreviewKind(previewRef.evidence_path) ===
                        'image' ? (
                            <div className="border-base-300 bg-base-200/40 flex max-h-[70vh] justify-center overflow-auto rounded-lg border p-2">
                                <img
                                    src={workflow.paymentEvidence.url(
                                        previewRef.id,
                                        { query: { inline: 1 } },
                                    )}
                                    alt={previewRef.reference}
                                    className="max-h-[66vh] w-auto rounded object-contain"
                                />
                            </div>
                        ) : (
                            <iframe
                                src={workflow.paymentEvidence.url(
                                    previewRef.id,
                                    { query: { inline: 1 } },
                                )}
                                title={previewRef.reference}
                                className="border-base-300 h-[70vh] w-full rounded-lg border"
                            />
                        )}
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                open={Boolean(deletingRef)}
                onClose={() => setDeletingRef(null)}
                onConfirm={handleDeleteStatement}
                loading={deletingBusy}
                title="Hapus Arsip Rekening Koran?"
                message={
                    deletingRef
                        ? `Hapus file arsip rekening koran "${deletingRef.reference}" (${deletingRef.source})? Data transaksi atau tagihan mahasiswa tidak akan terpengaruh.`
                        : ''
                }
                confirmLabel="Ya, Hapus Arsip"
            />
        </div>
    );
}
