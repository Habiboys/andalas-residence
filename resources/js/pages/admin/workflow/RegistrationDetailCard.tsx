import * as amendments from '@/actions/App/Http/Controllers/ResidenceAmendmentController';
import * as workflow from '@/actions/App/Http/Controllers/ResidenceWorkflowController';
import { StatusBadge } from '@/andalas/components/ui';
import { formatRupiah } from '@/andalas/lib/format';
import { useState } from 'react';
import {
    ActionForm,
    ConfirmCheckbox,
    Field,
    WorkflowPanel,
    fieldInputClass,
} from './shared';
import {
    CATEGORY_LABELS,
    DECISION_LABELS,
    WORKFLOW_STATUS_LABELS,
    formatDocumentLabel,
    newReference,
    type Decision,
    type Document,
    type Invoice,
    type Registration,
    type Room,
} from './types';

function DocumentReviewItem({
    doc,
    kind,
    canReview,
    registrationId,
}: {
    doc?: Document;
    kind: string;
    canReview: boolean;
    registrationId: string;
}) {
    const [reviewStatus, setReviewStatus] = useState<'valid' | 'revision'>(
        'valid',
    );
    const [notes, setNotes] = useState('');

    return (
        <div
            key={`${registrationId}-${kind}`}
            className="border-base-200 space-y-2 border-b pb-3 last:border-b-0"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{formatDocumentLabel(kind)}</p>
                <StatusBadge
                    status={doc?.status ?? 'menunggu'}
                    label={
                        doc
                            ? (WORKFLOW_STATUS_LABELS[doc.status] ?? doc.status)
                            : 'Belum diunggah'
                    }
                />
            </div>

            {doc && (
                <div className="space-y-1 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <a
                            className="btn btn-xs btn-outline"
                            href={workflow.document.url(doc.id)}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Unduh berkas (v{doc.version})
                        </a>
                        {doc.reviewer && (
                            <span className="text-base-content/70 text-xs">
                                Diperiksa {doc.reviewer.nama} ·{' '}
                                {doc.reviewed_at?.slice(0, 16)}
                            </span>
                        )}
                    </div>
                    {doc.notes && (
                        <p className="text-base-content/80 text-xs">
                            Catatan: {doc.notes}
                        </p>
                    )}
                </div>
            )}

            {canReview && doc && (
                <ActionForm
                    url={workflow.reviewDocument.url(doc.id)}
                    label="Simpan pemeriksaan"
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Hasil pemeriksaan" name="status">
                            <select
                                name="status"
                                className={fieldInputClass}
                                value={reviewStatus}
                                onChange={(e) =>
                                    setReviewStatus(
                                        e.target.value as 'valid' | 'revision',
                                    )
                                }
                            >
                                <option value="valid">Valid</option>
                                <option value="revision">Perlu revisi</option>
                            </select>
                        </Field>

                        <Field
                            name="notes"
                            label={
                                reviewStatus === 'revision'
                                    ? 'Catatan revisi (wajib diisi)'
                                    : 'Catatan pemeriksaan (opsional)'
                            }
                        >
                            <input
                                type="text"
                                name="notes"
                                className={fieldInputClass}
                                value={notes}
                                required={reviewStatus === 'revision'}
                                placeholder={
                                    reviewStatus === 'revision'
                                        ? 'Jelaskan bagian yang perlu diperbaiki mahasiswa...'
                                        : 'Catatan tambahan (opsional)'
                                }
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </Field>
                    </div>
                </ActionForm>
            )}
        </div>
    );
}

function AmendmentsSection({
    r,
    rooms,
    manager,
}: {
    r: Registration;
    rooms: Room[];
    manager: boolean;
}) {
    const [moveReference, setMoveReference] = useState(() => newReference());
    const [contractReference, setContractReference] = useState(() =>
        newReference(),
    );

    return (
        <div className="space-y-3">
            {r.can_operate &&
                r.checked_in_at &&
                !r.keys_returned_at &&
                (r.billing_basis !== 'room' || manager) && (
                    <details className="border-base-300 rounded-lg border p-3">
                        <summary className="cursor-pointer font-medium">
                            Pindah kamar
                        </summary>

                        <div className="mt-3">
                            <ActionForm
                                onSuccess={() =>
                                    setMoveReference(newReference())
                                }
                                url={amendments.move.url(r.id)}
                                label="Konfirmasi mutasi dan serah kunci"
                                confirmTitle="Proses Mutasi Kamar?"
                                confirmMessage="Penghuni akan dipindahkan ke kamar tujuan dan selisih tarif berlaku sesuai ketentuan kontrak."
                            >
                                <input
                                    type="hidden"
                                    name="reference"
                                    value={moveReference}
                                />

                                <p className="text-base-content/75 text-xs">
                                    Tarif kamar tujuan berlaku untuk seluruh
                                    masa kontrak. Komitmen sponsor tetap;
                                    selisih menjadi kewajiban pribadi.
                                    Fasilitator hanya dapat memindahkan dalam
                                    gedungnya; lintas gedung melalui pengelola.
                                </p>

                                <Field name="room_id" label="Kamar tujuan">
                                    <select
                                        className={fieldInputClass}
                                        name="room_id"
                                        required
                                    >
                                        <option value="">Pilih kamar</option>
                                        {rooms
                                            .filter(
                                                (room) =>
                                                    room.id !==
                                                    r.reserved_room?.id,
                                            )
                                            .map((room) => (
                                                <option
                                                    key={room.id}
                                                    value={room.id}
                                                >
                                                    {
                                                        room.lantai.gedung
                                                            .nama_gedung
                                                    }{' '}
                                                    / {room.nomor_kamar}
                                                </option>
                                            ))}
                                    </select>
                                </Field>

                                <Field
                                    name="reason"
                                    label="Alasan dan dasar persetujuan mutasi"
                                />

                                <Field
                                    name="room_condition"
                                    label="Kondisi kamar asal"
                                >
                                    <select
                                        className={fieldInputClass}
                                        name="room_condition"
                                    >
                                        <option value="ready">Layak</option>
                                        <option value="damaged">
                                            Rusak — tahan untuk perbaikan
                                        </option>
                                    </select>
                                </Field>

                                {r.room_contract_id && (
                                    <Field
                                        name="consent"
                                        label="Persetujuan perubahan kontrak seluruh anggota (PDF/gambar)"
                                        type="file"
                                    />
                                )}
                                <ConfirmCheckbox name="keys_exchanged">
                                    Identitas diperiksa, kunci asal diterima, dan
                                    kunci tujuan diserahkan.
                                </ConfirmCheckbox>
                            </ActionForm>
                        </div>
                    </details>
                )}

            {manager && r.room_contract && (
                <details className="border-base-300 rounded-lg border p-3">
                    <summary className="cursor-pointer font-medium">
                        Revisi anggota kontrak bersama
                    </summary>

                    <div className="mt-3 space-y-2">
                        <p className="text-base-content/75 text-sm">
                            Total kontrak{' '}
                            <strong>
                                {formatRupiah(Number(r.room_contract.total))}
                            </strong>{' '}
                            dibagi tepat kepada anggota yang disetujui. Anggota
                            yang sudah menghuni wajib mengembalikan kunci
                            sebelum dikeluarkan.
                        </p>

                        <ActionForm
                            onSuccess={() =>
                                setContractReference(newReference())
                            }
                            url={amendments.contract.url(r.room_contract.id)}
                            label="Sahkan revisi kontrak"
                            confirmTitle="Sahkan Revisi Kontrak Bersama?"
                            confirmMessage="Pembagian tagihan antar anggota kamar bersama akan dihitung ulang sesuai daftar terbaru."
                        >
                            <input
                                type="hidden"
                                name="reference"
                                value={contractReference}
                            />

                            {r.contract_candidates?.map((candidate) => (
                                <label
                                    key={candidate.id}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <input
                                        className="checkbox checkbox-sm"
                                        type="checkbox"
                                        name="members[]"
                                        value={candidate.id}
                                        defaultChecked={r.room_contract?.members.includes(
                                            candidate.id,
                                        )}
                                    />
                                    {candidate.name}
                                </label>
                            ))}

                            <Field
                                name="reason"
                                label="Alasan perubahan (berlaku hari ini)"
                            />

                            <Field
                                name="consent"
                                label="Persetujuan anggota dan pengelola (PDF/gambar)"
                                type="file"
                            />
                        </ActionForm>
                    </div>
                </details>
            )}

            {!!r.amendments?.length && (
                <details className="border-base-300 rounded-lg border p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                        Riwayat mutasi / revisi kontrak ({r.amendments.length})
                    </summary>
                    <div className="mt-2 space-y-2">
                        {r.amendments.map((item) => (
                            <div
                                key={item.id}
                                className="border-base-200 space-y-1 border-b pb-2 text-sm last:border-b-0"
                            >
                                <p>
                                    {item.created_at} · {item.reason}
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <a
                                        className="link link-primary text-xs"
                                        href={amendments.document.url(item.id)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Unduh addendum tagihan
                                    </a>
                                    {manager && item.kind === 'contract' && (
                                        <a
                                            className="link link-primary text-xs"
                                            href={amendments.evidence.url(
                                                item.id,
                                            )}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Bukti persetujuan
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}

function FinancingTermsForm({
    decision,
    tagihan,
}: {
    decision: Decision;
    tagihan?: Invoice;
}) {
    const conditional =
        decision.status === 'pending' &&
        ['installment', 'defer'].includes(decision.kind);
    const configuring = Boolean(decision.terms?.requires_configuration);
    const remainingTotal = Math.max(
        0,
        Number(tagihan?.total ?? 0) - Number(tagihan?.total_dibayar ?? 0),
    );

    const [outcome, setOutcome] = useState<'approved' | 'rejected'>('approved');
    const [initialAmount, setInitialAmount] = useState('0');
    const [terms, setTerms] = useState<
        Array<{ jatuh_tempo: string; jumlah: string }>
    >([
        { jatuh_tempo: '', jumlah: '' },
        { jatuh_tempo: '', jumlah: '' },
    ]);

    const scheduleSum = terms.reduce(
        (sum, t) => sum + (Number(t.jumlah) || 0),
        0,
    );

    function splitEqually() {
        const count = Math.max(1, terms.length);
        const perTerm = Math.floor(remainingTotal / count);
        const remainder = remainingTotal - perTerm * count;
        setTerms((prev) =>
            prev.map((item, idx) => ({
                ...item,
                jumlah: String(perTerm + (idx === count - 1 ? remainder : 0)),
            })),
        );
    }

    return (
        <div className="border-base-200 bg-base-200/30 mt-3 rounded-lg border p-3">
            <ActionForm
                url={workflow.decide.url(decision.id)}
                label={
                    configuring
                        ? 'Tetapkan skema pembiayaan'
                        : 'Simpan keputusan'
                }
                confirmTitle={
                    outcome === 'rejected'
                        ? 'Tolak Permohonan Pembiayaan?'
                        : configuring
                          ? 'Tetapkan Jadwal Pembiayaan?'
                          : 'Simpan Keputusan Pimpinan?'
                }
                confirmMessage={
                    outcome === 'rejected'
                        ? 'Permohonan keringanan ini akan ditolak dan mahasiswa diwajibkan mengikuti ketentuan tagihan standar.'
                        : undefined
                }
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Keputusan" name="status">
                        <select
                            name="status"
                            className={fieldInputClass}
                            value={outcome}
                            onChange={(e) =>
                                setOutcome(
                                    e.target.value as 'approved' | 'rejected',
                                )
                            }
                        >
                            <option value="approved">Setujui</option>
                            {!configuring && (
                                <option value="rejected">Tolak</option>
                            )}
                        </select>
                    </Field>

                    <Field label="Dasar keputusan" name="notes" />
                </div>

                {conditional && (
                    <p className="text-info text-xs">
                        ACC bersyarat pimpinan. Pengelola kemudian menetapkan
                        termin, dan penghuni mengunggah perjanjian pembiayaan.
                    </p>
                )}

                {!conditional && (
                    <Field
                        label="Pembayaran awal yang wajib dipenuhi (Rp)"
                        name="initial_amount"
                    >
                        <input
                            name="initial_amount"
                            type="number"
                            className={fieldInputClass}
                            value={initialAmount}
                            onChange={(e) => setInitialAmount(e.target.value)}
                        />
                    </Field>
                )}

                {outcome === 'approved' &&
                    !conditional &&
                    decision.kind !== 'transfer_permission' && (
                        <div className="space-y-3 pt-1">
                            <div className="bg-base-100 flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-xs">
                                <span>
                                    Sisa tagihan pribadi:{' '}
                                    <strong>
                                        {formatRupiah(remainingTotal)}
                                    </strong>{' '}
                                    · Terjadwal saat ini:{' '}
                                    <strong
                                        className={
                                            Math.abs(
                                                scheduleSum - remainingTotal,
                                            ) < 1
                                                ? 'text-success'
                                                : 'text-warning'
                                        }
                                    >
                                        {formatRupiah(scheduleSum)}
                                    </strong>
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-xs btn-outline"
                                    onClick={splitEqually}
                                >
                                    Bagi rata ({terms.length} termin)
                                </button>
                            </div>

                            {terms.map((item, i) => (
                                <div
                                    className="grid gap-2 sm:grid-cols-2"
                                    key={i}
                                >
                                    <Field
                                        name={`schedule[${i}][jatuh_tempo]`}
                                        label={`Jatuh tempo termin ${i + 1}`}
                                    >
                                        <input
                                            type="date"
                                            name={`schedule[${i}][jatuh_tempo]`}
                                            className={fieldInputClass}
                                            value={item.jatuh_tempo}
                                            onChange={(e) =>
                                                setTerms((prev) =>
                                                    prev.map((row, idx) =>
                                                        idx === i
                                                            ? {
                                                                  ...row,
                                                                  jatuh_tempo:
                                                                      e.target
                                                                          .value,
                                                              }
                                                            : row,
                                                    ),
                                                )
                                            }
                                        />
                                    </Field>

                                    <Field
                                        name={`schedule[${i}][jumlah]`}
                                        label={`Nominal termin ${i + 1} (Rp)`}
                                    >
                                        <input
                                            type="number"
                                            step="0.01"
                                            name={`schedule[${i}][jumlah]`}
                                            className={fieldInputClass}
                                            value={item.jumlah}
                                            onChange={(e) =>
                                                setTerms((prev) =>
                                                    prev.map((row, idx) =>
                                                        idx === i
                                                            ? {
                                                                  ...row,
                                                                  jumlah: e
                                                                      .target
                                                                      .value,
                                                              }
                                                            : row,
                                                    ),
                                                )
                                            }
                                        />
                                    </Field>
                                </div>
                            ))}

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-xs btn-outline"
                                    onClick={() =>
                                        setTerms((prev) => [
                                            ...prev,
                                            { jatuh_tempo: '', jumlah: '' },
                                        ])
                                    }
                                >
                                    Tambah termin
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-xs btn-ghost"
                                    disabled={terms.length === 0}
                                    onClick={() =>
                                        setTerms((prev) => prev.slice(0, -1))
                                    }
                                >
                                    Kurangi termin
                                </button>
                            </div>
                        </div>
                    )}
            </ActionForm>
        </div>
    );
}

export default function RegistrationDetailCard({
    r,
    manager,
    leader,
    rooms,
}: {
    r: Registration;
    manager: boolean;
    leader: boolean;
    rooms: Room[];
}) {
    const latestDocuments = r.documents.filter(
        (d) =>
            !r.documents.some(
                (other) => other.kind === d.kind && other.version > d.version,
            ),
    );

    const requiredDocumentKinds: string[] = [
        ...new Set([
            ...(r.policy?.settings.documents ?? []),
            ...r.decisions
                .filter(
                    (d) =>
                        d.status === 'approved' &&
                        !d.terms?.requires_configuration,
                )
                .map((d) => d.terms?.agreement_kind)
                .filter((kind): kind is string => Boolean(kind)),
        ]),
    ];

    const statusBadgeValue = r.keys_returned_at
        ? 'kembali'
        : r.checked_in_at
          ? 'aktif'
          : r.completed_at
            ? 'selesai'
            : (r.allocation_status || r.status);
    const statusLabel = r.keys_returned_at
        ? 'Kunci telah kembali'
        : r.checked_in_at
          ? 'Sudah check-in'
          : r.completed_at
            ? 'Histori hunian'
            : (WORKFLOW_STATUS_LABELS[r.allocation_status] ??
              WORKFLOW_STATUS_LABELS[r.status] ??
              r.status);

    const goInspectionStatus = r.checkout_request?.inspection?.status;
    const blockedReturnByInspection =
        r.workflow_version === 2 && goInspectionStatus !== 'selesai';

    return (
        <WorkflowPanel
            title={`${r.student_profile.user.nama} · ${r.student_profile.user.nim_nip}`}
        >
            <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="badge badge-outline">
                    {r.policy
                        ? (CATEGORY_LABELS[r.policy.category] ??
                          r.policy.category)
                        : 'Pendaftaran historis'}
                </span>

                <StatusBadge status={statusBadgeValue} label={statusLabel} />

                {r.policy && (
                    <span className="text-base-content/60 text-xs">
                        Kebijakan v{r.policy.version}
                    </span>
                )}
            </div>

            <p className="text-sm font-medium">
                {r.reserved_room
                    ? `${r.reserved_room.lantai.gedung.nama_gedung} · Kamar ${r.reserved_room.nomor_kamar}`
                    : r.is_kipk
                      ? 'Menunggu alokasi kamar KIP-K'
                      : 'Belum mendapat kamar'}
            </p>

            {r.checkin_classification && (
                <p className="text-base-content/75 text-sm">
                    Klasifikasi saat check-in: {r.checkin_classification}
                </p>
            )}

            {r.tagihan &&
                Number(r.tagihan.total_dibayar) > Number(r.tagihan.total) && (
                    <p className="alert alert-info text-sm">
                        Kredit lebih bayar:{' '}
                        {formatRupiah(
                            Number(r.tagihan.total_dibayar) -
                                Number(r.tagihan.total),
                        )}
                        . Penyelesaian melalui bagian keuangan.
                    </p>
                )}

            <AmendmentsSection r={r} rooms={rooms} manager={manager} />

            {r.tagihan && (
                <div className="bg-base-200/40 border-base-300 grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2">
                    <p>
                        Kewajiban pribadi:{' '}
                        <strong>{formatRupiah(Number(r.tagihan.total))}</strong>{' '}
                        · Dibayar{' '}
                        <strong>
                            {formatRupiah(Number(r.tagihan.total_dibayar))}
                        </strong>
                    </p>
                    <p>
                        Kewajiban institusi:{' '}
                        <strong>
                            {formatRupiah(Number(r.tagihan.sponsor_total))}
                        </strong>{' '}
                        · Dibayar{' '}
                        <strong>
                            {formatRupiah(Number(r.tagihan.sponsor_paid))}
                        </strong>
                    </p>
                </div>
            )}

            {r.blockers.length > 0 && (
                <div className="alert alert-warning text-sm">
                    <div>
                        <p className="font-semibold">Kendala Persyaratan:</p>
                        <ul className="mt-1 list-disc pl-5">
                            {r.blockers.map((issue) => (
                                <li key={issue}>{issue}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {!r.completed_at && r.blockers.length === 0 && (
                <p className="alert alert-success text-sm">
                    Siap check-in. Hunian aktif setelah petugas memeriksa berkas
                    asli dan menyerahkan kunci.
                </p>
            )}

            {r.is_kipk && !r.kipk_disbursed_at && (
                <p className="text-base-content/75 text-sm">
                    KIP-K: pembayaran menunggu pencairan; kewajiban tetap
                    tercatat.
                </p>
            )}

            {r.end_notified_at && !r.keys_returned_at && (
                <p className="alert alert-warning text-sm">
                    Masa tinggal berakhir. Tunggu pengembalian kunci dan
                    pemeriksaan fisik sebelum melepas kamar.
                </p>
            )}

            {r.workflow_version === 2 && (
                <details
                    className="border-base-300 rounded-lg border p-3"
                    open
                >
                    <summary className="cursor-pointer font-medium">
                        Dokumen pendaftaran ({requiredDocumentKinds.length})
                    </summary>

                    <div className="mt-3 space-y-4">
                        {requiredDocumentKinds.map((kind) => {
                            const doc = latestDocuments.find(
                                (d) => d.kind === kind,
                            );
                            const canReview =
                                (!r.completed_at ||
                                    kind.startsWith('pembiayaan_')) &&
                                !r.keys_returned_at &&
                                Boolean(doc) &&
                                r.can_operate;

                            return (
                                <DocumentReviewItem
                                    key={kind}
                                    doc={doc}
                                    kind={kind}
                                    canReview={canReview}
                                    registrationId={r.id}
                                />
                            );
                        })}

                        {r.documents.length > 0 && (
                            <details>
                                <summary className="text-base-content/70 cursor-pointer text-xs font-medium">
                                    Riwayat seluruh versi dokumen (
                                    {r.documents.length})
                                </summary>
                                <div className="mt-2 space-y-1">
                                    {r.documents.map((d) => (
                                        <p key={d.id} className="text-xs">
                                            <a
                                                className="link link-primary"
                                                href={workflow.document.url(
                                                    d.id,
                                                )}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {formatDocumentLabel(d.kind)} v
                                                {d.version}
                                            </a>{' '}
                                            ·{' '}
                                            {WORKFLOW_STATUS_LABELS[d.status] ??
                                                d.status}{' '}
                                            ·{' '}
                                            {d.reviewer?.nama ??
                                                'Belum diperiksa'}{' '}
                                            {d.notes && `— ${d.notes}`}
                                        </p>
                                    ))}
                                </div>
                            </details>
                        )}
                    </div>
                </details>
            )}

            {r.decisions.length > 0 &&
                (!r.completed_at ||
                    r.decisions.some((d) => d.terms?.amendment_id)) &&
                r.tagihan && (
                    <details
                        className="border-base-300 rounded-lg border p-3"
                        open
                    >
                        <summary className="cursor-pointer font-medium">
                            Keputusan pembiayaan ({r.decisions.length})
                        </summary>

                        <div className="mt-3 space-y-4">
                            {r.decisions.map((d) => (
                                <div
                                    className="border-base-200 border-b pb-3 last:border-b-0"
                                    key={d.id}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-medium">
                                            {DECISION_LABELS[d.kind] ?? d.kind}
                                        </p>
                                        <StatusBadge
                                            status={d.status}
                                            label={
                                                WORKFLOW_STATUS_LABELS[
                                                    d.status
                                                ] ?? d.status
                                            }
                                        />
                                    </div>

                                    {d.reason && (
                                        <p className="text-base-content/80 mt-1 text-sm">
                                            Alasan: {d.reason}
                                        </p>
                                    )}

                                    {d.terms?.notes && (
                                        <p className="text-base-content/75 mt-1 text-xs">
                                            Catatan keputusan: {d.terms.notes}
                                        </p>
                                    )}

                                    {d.status === 'approved' &&
                                        d.terms?.requires_configuration && (
                                            <p className="text-warning mt-1 text-sm font-medium">
                                                Menunggu pengaturan jadwal
                                                termin oleh pengelola.
                                            </p>
                                        )}

                                    {d.status === 'approved' &&
                                        d.terms?.requires_configuration &&
                                        manager && (
                                            <FinancingTermsForm
                                                decision={d}
                                                tagihan={r.tagihan}
                                            />
                                        )}

                                    {d.terms?.schedule &&
                                        d.terms.schedule.length > 0 && (
                                            <div className="mt-2 space-y-1 text-xs">
                                                {d.terms.schedule.map(
                                                    (term, i) => (
                                                        <p key={i}>
                                                            Termin {i + 1}:{' '}
                                                            {term.jatuh_tempo} ·{' '}
                                                            {formatRupiah(
                                                                Number(
                                                                    term.jumlah,
                                                                ),
                                                            )}
                                                        </p>
                                                    ),
                                                )}
                                            </div>
                                        )}

                                    {d.status === 'pending' &&
                                        ((leader &&
                                            ['installment', 'defer'].includes(
                                                d.kind,
                                            )) ||
                                            (manager &&
                                                ![
                                                    'installment',
                                                    'defer',
                                                ].includes(d.kind))) && (
                                            <FinancingTermsForm
                                                decision={d}
                                                tagihan={r.tagihan}
                                            />
                                        )}
                                </div>
                            ))}
                        </div>
                    </details>
                )}

            {manager && r.stay_kind === 'non_student' && r.tagihan && (
                <details className="border-base-300 rounded-lg border p-3">
                    <summary className="cursor-pointer font-medium">
                        Catat bukti transfer penyewa umum
                    </summary>
                    <div className="mt-3">
                        <ActionForm
                            url={workflow.transferProof.url(r.id)}
                            label="Simpan bukti untuk diperiksa"
                        >
                            <Field
                                name="nominal"
                                label="Nominal transfer (Rp)"
                                type="number"
                            />
                            <Field
                                name="file"
                                label="Bukti transfer"
                                type="file"
                            />
                        </ActionForm>
                    </div>
                </details>
            )}

            {r.can_operate &&
                !r.completed_at &&
                r.blockers.length === 0 && (
                    <div className="border-success/40 bg-success/5 rounded-lg border p-4">
                        <h3 className="mb-2 text-sm font-semibold">
                            Check-in Fisik &amp; Serah Kunci
                        </h3>
                        <ActionForm
                            url={workflow.checkIn.url(r.id)}
                            label="Konfirmasi check-in dan serah kunci"
                            confirmTitle="Konfirmasi Check-in Penghuni?"
                            confirmMessage="Status penghuni akan menjadi aktif di asrama setelah check-in dan serah kunci dicatat."
                        >
                            <ConfirmCheckbox name="identity_checked">
                                Identitas penghuni telah diperiksa langsung.
                            </ConfirmCheckbox>
                            <ConfirmCheckbox name="original_documents_checked">
                                Berkas asli sesuai dokumen yang disahkan.
                            </ConfirmCheckbox>
                            <ConfirmCheckbox name="keys_handed">
                                Penghuni hadir dan kunci telah diserahkan.
                            </ConfirmCheckbox>
                        </ActionForm>
                    </div>
                )}

            {r.can_operate && r.completed_at && !r.keys_returned_at && (
                <details className="border-base-300 rounded-lg border p-3">
                    <summary className="cursor-pointer font-medium">
                        Pengembalian kunci
                    </summary>

                    <div className="mt-3 space-y-3">
                        {!r.checkout_request ? (
                            <ActionForm
                                url={workflow.requestInspection.url(r.id)}
                                label="Ajukan pemeriksaan kamar ke GO"
                            />
                        ) : (
                            <div className="bg-base-200/50 flex flex-wrap items-center gap-2 rounded p-2.5 text-sm">
                                <span>Status inspeksi GO:</span>
                                <StatusBadge
                                    status={goInspectionStatus ?? 'menunggu'}
                                    label={
                                        goInspectionStatus ??
                                        'Menunggu petugas inspeksi'
                                    }
                                />
                            </div>
                        )}

                        {blockedReturnByInspection && (
                            <p className="alert alert-warning py-2 text-xs">
                                Pengembalian kunci baru dapat diselesaikan setelah
                                petugas GO menyelesaikan pemeriksaan kamar.
                            </p>
                        )}

                        <ActionForm
                            url={workflow.returnKeys.url(r.id)}
                            label="Catat kunci kembali"
                            disabled={blockedReturnByInspection}
                            confirmTitle="Konfirmasi Pengembalian Kunci?"
                            confirmMessage="Kamar akan dilepas dari hunian aktif penghuni dan tercatat sesuai kondisi yang dipilih."
                        >
                            <ConfirmCheckbox name="keys_received">
                                Kunci sudah diterima petugas.
                            </ConfirmCheckbox>
                            <ConfirmCheckbox name="room_vacated">
                                Penghuni telah mengosongkan tempat tinggal dan
                                kondisi telah diperiksa.
                            </ConfirmCheckbox>

                            <Field name="condition" label="Kondisi kamar">
                                <select
                                    className={fieldInputClass}
                                    name="condition"
                                >
                                    <option value="ready">
                                        Siap digunakan
                                    </option>
                                    <option value="damaged">
                                        Rusak / perlu penanganan
                                    </option>
                                </select>
                            </Field>

                            <Field
                                name="notes"
                                label="Catatan pemeriksaan fisik"
                            />
                        </ActionForm>
                    </div>
                </details>
            )}

            {manager && r.is_kipk && !r.reserved_room && (
                <ActionForm
                    url={workflow.allocate.url(r.id)}
                    label="Periksa kembali antrean alokasi KIP-K"
                />
            )}

            {manager && r.is_kipk && !r.kipk_disbursed_at && (
                <details className="border-base-300 rounded-lg border p-3">
                    <summary className="cursor-pointer font-medium">
                        Catat pencairan KIP-K
                    </summary>
                    <div className="mt-3">
                        <ActionForm
                            url={workflow.disburse.url(r.id)}
                            label="Simpan pencairan"
                            confirmTitle="Catat Pencairan KIP-K?"
                            confirmMessage="Tanggal pencairan dan jatuh tempo tagihan KIP-K akan diperbarui secara permanen."
                        >
                            <Field
                                name="disbursed_at"
                                label="Tanggal pencairan"
                                type="date"
                            />
                            <Field
                                name="due_at"
                                label="Jatuh tempo pembayaran"
                                type="date"
                            />
                            <Field
                                name="reference"
                                label="Referensi konfirmasi pencairan"
                            />
                        </ActionForm>
                    </div>
                </details>
            )}

            {manager &&
                !r.workflow_version &&
                r.completed_at &&
                !r.historical_confirmed_at && (
                    <ActionForm
                        url={workflow.historical.url(r.id)}
                        label="Konfirmasi histori penghuni"
                        confirmTitle="Konfirmasi Data Histori?"
                        confirmMessage="Bukti kedatangan historis akan ditandai terkonfirmasi pada akun penghuni ini."
                    >
                        <Field
                            name="evidence"
                            label="Bukti kedatangan atau serah kunci historis"
                            type="file"
                        />
                        <Field name="notes" label="Dasar konfirmasi" />
                    </ActionForm>
                )}
        </WorkflowPanel>
    );
}
