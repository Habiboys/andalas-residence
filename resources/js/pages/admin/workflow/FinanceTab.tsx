import * as applications from '@/actions/App/Http/Controllers/ResidenceApplicationController';
import * as invoiceActions from '@/actions/App/Http/Controllers/InvoiceController';
import * as workflow from '@/actions/App/Http/Controllers/ResidenceWorkflowController';
import { StatusBadge } from '@/andalas/components/ui';
import { formatRupiah } from '@/andalas/lib/format';
import { useMemo, useState } from 'react';
import {
    ActionForm,
    ConfirmCheckbox,
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

function ReferenceReconcileCard({
    referenceItem,
    invoices,
    proofs,
}: {
    referenceItem: Reference;
    invoices: Invoice[];
    proofs: PaymentProof[];
}) {
    const [allocationCount, setAllocationCount] = useState(1);

    const eligibleInvoices = useMemo(
        () =>
            invoices.filter(
                (inv) =>
                    remainingForInvoice(inv, referenceItem.payer_type) > 0,
            ),
        [invoices, referenceItem.payer_type],
    );

    return (
        <WorkflowPanel
            title={`${referenceItem.reference} · ${formatRupiah(Number(referenceItem.amount))}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-base-content/80">
                    Sumber: <strong>{referenceItem.source}</strong> ·{' '}
                    {referenceItem.payer_type === 'sponsor'
                        ? 'Institusi / Sponsor'
                        : 'Pribadi'}
                </p>
                <div className="flex items-center gap-2">
                    <StatusBadge
                        status={
                            referenceItem.status === 'matched'
                                ? 'lunas'
                                : 'menunggu'
                        }
                        label={
                            referenceItem.status === 'matched'
                                ? 'Sudah dibukukan'
                                : 'Belum dicocokkan'
                        }
                    />
                    <a
                        className="btn btn-xs btn-outline"
                        href={workflow.paymentEvidence.url(referenceItem.id)}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Lihat catatan resmi
                    </a>
                </div>
            </div>

            {referenceItem.status === 'unmatched' && (
                <ActionForm
                    url={workflow.reconcile.url(referenceItem.id)}
                    label="Cocokkan dan bukukan"
                    confirmTitle="Bukukan Rekonsiliasi Dana?"
                    confirmMessage="Dana akan dibukukan satu kali ke tagihan terpilih dan status pembayaran diperbarui secara permanen."
                    disabled={eligibleInvoices.length === 0}
                >
                    <p className="text-base-content/70 text-xs">
                        Total alokasi harus tepat sebesar{' '}
                        <strong>
                            {formatRupiah(Number(referenceItem.amount))}
                        </strong>
                        . Tersedia {eligibleInvoices.length} tagihan{' '}
                        {referenceItem.payer_type === 'sponsor'
                            ? 'sponsor'
                            : 'pribadi'}{' '}
                        yang belum lunas.
                    </p>

                    {eligibleInvoices.length === 0 ? (
                        <p className="alert alert-warning py-2 text-xs">
                            Tidak ada tagihan{' '}
                            {referenceItem.payer_type === 'sponsor'
                                ? 'institusi'
                                : 'pribadi'}{' '}
                            dengan sisa tunggakan untuk dicocokkan.
                        </p>
                    ) : (
                        Array.from({ length: allocationCount }, (_, i) => (
                            <div
                                key={i}
                                className="bg-base-200/40 border-base-300 grid gap-3 rounded-lg border p-3 sm:grid-cols-3"
                            >
                                <Field
                                    name={`allocations[${i}][tagihan_id]`}
                                    label={`Tagihan #${i + 1}`}
                                >
                                    <select
                                        className={fieldInputClass}
                                        name={`allocations[${i}][tagihan_id]`}
                                        required
                                    >
                                        <option value="">Pilih tagihan</option>
                                        {eligibleInvoices.map((inv) => (
                                            <option key={inv.id} value={inv.id}>
                                                {inv.mahasiswa?.user.nama ??
                                                    '-'}{' '}
                                                / {inv.nomor} / sisa{' '}
                                                {formatRupiah(
                                                    remainingForInvoice(
                                                        inv,
                                                        referenceItem.payer_type,
                                                    ),
                                                )}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field
                                    name={`allocations[${i}][jumlah]`}
                                    label="Alokasi dana (Rp)"
                                    type="number"
                                    value={
                                        allocationCount === 1
                                            ? String(
                                                  Number(referenceItem.amount),
                                              )
                                            : undefined
                                    }
                                />

                                <Field
                                    name={`allocations[${i}][payment_proof_id]`}
                                    label="Bukti transfer (opsional)"
                                >
                                    <select
                                        name={`allocations[${i}][payment_proof_id]`}
                                        className={fieldInputClass}
                                    >
                                        <option value="">
                                            Tanpa bukti unggahan
                                        </option>
                                        {proofs.map((proof) => (
                                            <option
                                                key={proof.id}
                                                value={proof.id}
                                            >
                                                {proof.mahasiswa.user.nama} —{' '}
                                                {proof.kode_transaksi} —{' '}
                                                {formatRupiah(
                                                    Number(proof.nominal),
                                                )}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                        ))
                    )}

                    <div className="flex gap-2">
                        <button
                            className="btn btn-xs btn-outline"
                            type="button"
                            onClick={() =>
                                setAllocationCount((count) => count + 1)
                            }
                        >
                            Tambah alokasi
                        </button>
                        <button
                            className="btn btn-xs btn-ghost"
                            type="button"
                            disabled={allocationCount <= 1}
                            onClick={() =>
                                setAllocationCount((count) =>
                                    Math.max(1, count - 1),
                                )
                            }
                        >
                            Kurangi alokasi
                        </button>
                    </div>
                </ActionForm>
            )}
        </WorkflowPanel>
    );
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
    const [statusFilter, setStatusFilter] = useState<'all' | 'unmatched' | 'matched'>('unmatched');
    const [searchRef, setSearchRef] = useState('');
    const [selectedAppId, setSelectedAppId] = useState('');
    const [payerFilter, setPayerFilter] = useState<'sponsor' | 'personal'>('sponsor');

    const visibleReferences = useMemo(() => {
        const q = searchRef.trim().toLowerCase();
        return references.filter((ref) => {
            if (statusFilter !== 'all' && ref.status !== statusFilter) {
                return false;
            }
            if (
                q &&
                !`${ref.reference} ${ref.source}`.toLowerCase().includes(q)
            ) {
                return false;
            }
            return true;
        });
    }, [references, statusFilter, searchRef]);

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

    return (
        <div className="space-y-5">
            <WorkflowPanel
                title="Catat transaksi resmi DPUB"
                subtitle="Bukti transfer penghuni tetap dicocokkan dengan rekening koran resmi. Dana baru terbukukan setelah alokasinya disahkan."
            >
                <ActionForm
                    url={workflow.recordPayment.url()}
                    label="Simpan transaksi untuk dicocokkan"
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                            name="reference"
                            label="Referensi unik transaksi bank"
                        />
                        <Field
                            name="source"
                            label="Nomor rekening koran / daftar resmi DPUB"
                        />
                        <Field
                            name="paid_at"
                            label="Tanggal transaksi"
                            type="date"
                        />
                        <Field
                            name="amount"
                            label="Jumlah dana (Rp)"
                            type="number"
                        />
                        <Field name="payer_type" label="Pembayar">
                            <select
                                name="payer_type"
                                className={fieldInputClass}
                            >
                                <option value="personal">Pribadi</option>
                                <option value="sponsor">
                                    Institusi / sponsor
                                </option>
                            </select>
                        </Field>
                        <Field
                            name="evidence"
                            label="Catatan resmi DPUB"
                            type="file"
                        />
                    </div>

                    <ConfirmCheckbox name="official_source_confirmed">
                        Saya telah memeriksa sumber resmi DPUB, termasuk
                        referensi, tanggal, dan nominal.
                    </ConfirmCheckbox>
                </ActionForm>
            </WorkflowPanel>

            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">
                        Antrean Rekonsiliasi DPUB ({visibleReferences.length})
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="join">
                            {(
                                [
                                    ['unmatched', 'Belum dicocokkan'],
                                    ['matched', 'Sudah dibukukan'],
                                    ['all', 'Semua'],
                                ] as const
                            ).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`btn btn-xs join-item ${statusFilter === key ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setStatusFilter(key)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <input
                            type="search"
                            className="input input-bordered input-xs w-56"
                            placeholder="Cari referensi atau sumber..."
                            value={searchRef}
                            onChange={(e) => setSearchRef(e.target.value)}
                        />
                    </div>
                </div>

                {visibleReferences.length === 0 && (
                    <p className="bg-base-100 border-base-300 text-base-content/70 rounded-xl border p-5 text-sm">
                        Tidak ada catatan transaksi DPUB yang cocok dengan filter
                        saat ini.
                    </p>
                )}

                {visibleReferences.map((ref) => (
                    <ReferenceReconcileCard
                        key={ref.id}
                        referenceItem={ref}
                        invoices={invoices}
                        proofs={proofs}
                    />
                ))}
            </section>

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
                                Tidak ada tagihan {payerFilter === 'sponsor' ? 'institusi' : 'pribadi'} yang
                                masih memiliki tunggakan pada permohonan ini.
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
        </div>
    );
}
