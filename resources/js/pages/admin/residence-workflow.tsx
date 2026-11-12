import { Form, Head, Link, router, useForm, usePage } from '@inertiajs/react';

import { useState, type ReactNode } from 'react';

import * as workflow from '@/actions/App/Http/Controllers/ResidenceWorkflowController';

import * as amendments from '@/actions/App/Http/Controllers/ResidenceAmendmentController';

import * as applications from '@/actions/App/Http/Controllers/ResidenceApplicationController';

import { store as storeGeneralStay } from '@/actions/App/Http/Controllers/TemporaryStayController';

import * as invoiceActions from '@/actions/App/Http/Controllers/InvoiceController';

import { formatRupiah } from '@/andalas/lib/format';

type Building = {
    id: string;
    nama_gedung: string;
    kode_gedung: string;
    settings_url?: string | null;
};

type Room = {
    id: string;

    nomor_kamar: string;

    kapasitas: number;

    lantai: { gedung: Building };
};

type Program = {
    id: string;

    name: string;

    jenjang: string;

    departemen_id?: string;
};

type FacultyItem = { id: string; name: string };

type DepartemenItem = { id: string; name: string; faculty_id: string };

type Invoice = {
    id: string;

    nomor: string;

    total: string;

    total_dibayar: string;

    sponsor_total: string;

    sponsor_paid: string;

    mahasiswa?: { user: { nama: string } };
};

type Document = {
    id: string;

    kind: string;

    version: number;

    status: string;

    notes?: string;

    reviewed_at?: string;

    reviewer?: { nama: string };
};

type Decision = {
    id: string;

    kind: string;

    status: string;

    reason: string;

    terms?: {
        notes?: string;
        requires_configuration?: boolean;
        amendment_id?: string;
        agreement_kind?: string;
        initial_amount?: number;
        schedule?: Array<{ jatuh_tempo: string; jumlah: number }>;
    };
};

type Rate = {
    gedung_id: string;

    type: string;

    unit: string;

    amount: string;

    room_amount: string;
};

type Settings = {
    open: boolean;

    documents: string[];

    building_ids: string[];

    rates: Rate[];

    month_days: number;

    day_basis: string;

    monthly_allowed: boolean;
};

type Policy = {
    id: string;

    category: string;

    version: number;

    settings: Settings;

    published_at?: string;
};

type Registration = {
    id: string;

    workflow_version: number | null;

    status: string;

    is_kipk: boolean;

    funding: string;

    stay_kind: string;

    rate_unit: string;

    student_profile: { user: { nama: string; nim_nip: string } };

    reserved_room?: Room;

    completed_at?: string;

    checked_in_at?: string;

    keys_returned_at?: string;

    end_notified_at?: string;

    kipk_disbursed_at?: string;

    historical_confirmed_at?: string;

    allocation_status: string;

    policy?: Policy;

    documents: Document[];

    decisions: Decision[];

    blockers: string[];

    can_operate: boolean;

    can_submit: boolean;

    checkout_request?: { inspection?: { status: string } };

    tagihan?: Invoice;

    billing_basis: string;

    room_contract_id?: string;

    room_contract?: { id: string; members: string[]; total: string };

    contract_candidates?: Array<{ id: string; name: string }>;

    checkin_classification?: string;

    amendments?: Array<{
        id: string;
        kind: string;
        reason: string;
        created_at: string;
    }>;
};

type Application = {
    id: string;

    number: string;

    kind: string;

    institution: string | null;

    letter_path?: string;

    recipient_email: string;

    approved_at?: string;

    ends_at: string;

    registrations: Array<{ id: string; tagihan?: Invoice }>;
};

type Reference = {
    id: string;

    reference: string;

    source: string;

    amount: string;

    status: string;

    payer_type: string;
};

type Props = {
    studentView?: boolean;
    registrations: {
        last_page: number;
        data: Registration[];

        links: Array<{ url: string | null; label: string; active: boolean }>;
    };

    summary: Record<string, number>;

    manager: boolean;

    finance: boolean;

    leader: boolean;

    gender?: string;

    no_hp?: string;

    client_profile_category?: string;

    initialUser?: {
        nama?: string;

        nim?: string;

        email?: string;

        no_hp?: string;

        angkatan?: string;
    };

    profile?: {
        prodi_id?: string;

        angkatan?: string;

        prodi?: {
            id: string;

            departemen_id?: string;

            departemen?: { id: string; faculty_id?: string };
        };
    };

    fakultas?: FacultyItem[];

    departemen?: DepartemenItem[];

    programs: Program[];

    buildings: Building[];

    masterHousingUrl: string | null;
    policyCatalog: Record<
        string,
        Array<{ id: string; name: string; rates: Rate[]; issue: string | null }>
    >;

    rooms: Room[];

    policies: Policy[];

    applications: Application[];

    reconciliations: Reference[];

    invoices: Invoice[];

    paymentProofs: Array<{
        id: string;

        kode_transaksi: string;

        nominal: string;

        mahasiswa: { user: { nama: string } };
    }>;

    invoiceGroups: Array<{
        id: string;

        nomor: string;

        sent_at?: string;

        delivery_status?: string;

        residence_application_id?: string;
    }>;
};

const input = 'input input-bordered w-full';

const categories: Record<string, string> = {
    local_non_kipk: 'Lokal non-KIP-K',

    local_kipk: 'KIP-K',

    international: 'Internasional / S2 / S3',

    postgraduate: 'S2 / S3 mandiri',

    summer_course: 'Summer Course',

    non_student: 'Umum',
};

const statuses: Record<string, string> = {
    submitted: 'Diajukan',

    accepted: 'Diterima',

    rejected: 'Ditolak',

    waiting: 'Menunggu kamar',

    allocated: 'Kamar dialokasikan',

    occupied: 'Menghuni',

    released: 'Selesai fisik',

    pending: 'Menunggu keputusan',

    approved: 'Disetujui',

    valid: 'Valid',

    uploaded: 'Menunggu pemeriksaan',

    revision: 'Perlu revisi',

    unmatched: 'Belum dicocokkan',

    matched: 'Sudah dibukukan',
};

const decisionNames: Record<string, string> = {
    installment: 'Cicilan',

    defer: 'Penundaan pembayaran',

    monthly: 'Persetujuan bulanan',

    transfer_permission: 'Izin tinggal berdasarkan bukti transfer',
};

function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="card border-base-300 bg-base-100 space-y-4 border p-5">
            <h2 className="text-lg font-semibold">{title}</h2>

            {children}
        </section>
    );
}

function Field({
    label,

    name,

    type = 'text',

    value,

    required = true,

    children,
}: {
    label: string;

    name: string;

    type?: string;

    value?: string | number;

    required?: boolean;

    children?: ReactNode;
}) {
    return (
        <label className="form-control block space-y-1">
            <span className="text-sm font-medium">{label}</span>

            {children ?? (
                <input
                    className={input}

                    name={name}

                    type={type}

                    defaultValue={value}

                    required={required}

                    step={type === 'number' ? '0.01' : undefined}
                />
            )}
        </label>
    );
}

function Confirm({ name, children }: { name: string; children: ReactNode }) {
    return (
        <label className="flex items-start gap-2 text-sm">
            <input
                className="checkbox checkbox-sm"

                type="checkbox"

                name={name}

                value="1"

                required
            />

            {children}
        </label>
    );
}

function ActionForm({
    url,

    label,

    children,
    onSuccess,
}: {
    url: string;

    label: string;
    onSuccess?: () => void;

    children?: ReactNode;
}) {
    return (
        <Form
            action={url}
            onSuccess={onSuccess}

            method="post"

            options={{ preserveScroll: true }}

            className="space-y-3"
        >
            {({ errors, processing, recentlySuccessful }) => (
                <>
                    {children}

                    {Object.entries(errors).map(([key, message]) => (
                        <p
                            key={key}

                            role="alert"

                            className="text-error text-sm"
                        >
                            {message}
                        </p>
                    ))}

                    <button
                        className="btn btn-primary btn-sm"

                        disabled={processing}
                    >
                        {processing ? 'Menyimpan…' : label}
                    </button>

                    {recentlySuccessful && (
                        <span className="text-success ml-2 text-sm">
                            Tersimpan
                        </span>
                    )}
                </>
            )}
        </Form>
    );
}

function newReference(): string {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (digit) =>
        (
            Number(digit) ^
            (crypto.getRandomValues(new Uint8Array(1))[0] &
                (15 >> (Number(digit) / 4)))
        ).toString(16),
    );
}
function Amendments({
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
                    <details className="rounded border p-3">
                        <summary className="cursor-pointer font-medium">
                            Pindah kamar
                        </summary>

                        <ActionForm
                            onSuccess={() => setMoveReference(newReference())}
                            url={amendments.move.url(r.id)}
                            label="Konfirmasi mutasi dan serah kunci"
                        >
                            <input
                                type="hidden"
                                name="reference"
                                value={moveReference}
                            />

                            <p className="text-sm">
                                Tarif kamar tujuan berlaku untuk seluruh masa
                                kontrak. Komitmen sponsor tetap; selisih menjadi
                                kewajiban pribadi. Fasilitator hanya dapat
                                memindahkan dalam gedungnya; lintas gedung
                                melalui pengelola.
                            </p>

                            <Field name="room_id" label="Kamar tujuan">
                                <select
                                    className={input}
                                    name="room_id"
                                    required
                                >
                                    <option value="">Pilih kamar</option>
                                    {rooms
                                        .filter(
                                            (room) =>
                                                room.id !== r.reserved_room?.id,
                                        )
                                        .map((room) => (
                                            <option
                                                key={room.id}
                                                value={room.id}
                                            >
                                                {room.lantai.gedung.nama_gedung}{' '}
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
                                <select className={input} name="room_condition">
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
                            <Confirm name="keys_exchanged">
                                Identitas diperiksa, kunci asal diterima, dan
                                kunci tujuan diserahkan.
                            </Confirm>
                        </ActionForm>
                    </details>
                )}

            {manager && r.room_contract && (
                <details className="rounded border p-3">
                    <summary className="cursor-pointer font-medium">
                        Revisi anggota kontrak bersama
                    </summary>

                    <p className="text-sm">
                        Total kontrak{' '}
                        {formatRupiah(Number(r.room_contract.total))} dibagi
                        tepat kepada anggota yang disetujui. Anggota yang sudah
                        menghuni wajib mengembalikan kunci sebelum dikeluarkan.
                    </p>

                    <ActionForm
                        onSuccess={() => setContractReference(newReference())}
                        url={amendments.contract.url(r.room_contract.id)}
                        label="Sahkan revisi kontrak"
                    >
                        <input
                            type="hidden"
                            name="reference"
                            value={contractReference}
                        />

                        {r.contract_candidates?.map((candidate) => (
                            <label key={candidate.id} className="flex gap-2">
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
                </details>
            )}

            {!!r.amendments?.length && (
                <details className="rounded border p-3">
                    <summary className="cursor-pointer">
                        Riwayat mutasi / revisi kontrak
                    </summary>
                    {r.amendments.map((item) => (
                        <div
                            key={item.id}
                            className="space-y-1 border-b py-2 text-sm"
                        >
                            <p>
                                {item.created_at} · {item.reason}
                            </p>
                            <a
                                className="link"
                                href={amendments.document.url(item.id)}
                            >
                                Unduh addendum tagihan
                            </a>
                            {manager && item.kind === 'contract' && (
                                <a
                                    className="link ml-4"
                                    href={amendments.evidence.url(item.id)}
                                >
                                    Bukti persetujuan
                                </a>
                            )}
                        </div>
                    ))}
                </details>
            )}
        </div>
    );
}

function Terms({ decision }: { decision: Decision }) {
    const conditional =
        decision.status === 'pending' &&
        ['installment', 'defer'].includes(decision.kind);

    const configuring = Boolean(decision.terms?.requires_configuration);

    const [count, setCount] = useState(2);

    const [outcome, setOutcome] = useState('approved');

    return (
        <ActionForm
            url={workflow.decide.url(decision.id)}

            label={
                configuring ? 'Tetapkan skema pembiayaan' : 'Simpan keputusan'
            }
        >
            <Field label="Keputusan" name="status">
                <select
                    name="status"

                    className={input}

                    value={outcome}

                    onChange={(e) => setOutcome(e.target.value)}
                >
                    <option value="approved">Setujui</option>

                    {!configuring && <option value="rejected">Tolak</option>}
                </select>
            </Field>

            <Field label="Dasar keputusan" name="notes" />

            {conditional && (
                <p className="text-sm">
                    ACC bersyarat. Pengelola menetapkan termin, kemudian
                    penghuni menandatangani perjanjian pembiayaan. ACC saja
                    belum mengizinkan check-in.
                </p>
            )}

            {!conditional && (
                <Field
                    label="Pembayaran awal yang wajib dipenuhi (Rp)"

                    name="initial_amount"

                    type="number"

                    value="0"

                    required={false}
                />
            )}

            {outcome === 'approved' &&
                !conditional &&
                decision.kind !== 'transfer_permission' && (
                    <>
                        <p className="text-sm">
                            Isi jadwal untuk persetujuan. Total termin harus
                            tepat sama dengan total tagihan.
                        </p>

                        {Array.from({ length: count }, (_, i) => (
                            <div className="grid gap-2 sm:grid-cols-2" key={i}>
                                <Field
                                    name={`schedule[${i}][jatuh_tempo]`}

                                    label={`Jatuh tempo termin ${i + 1}`}

                                    type="date"

                                    required={false}
                                />

                                <Field
                                    name={`schedule[${i}][jumlah]`}

                                    label="Nominal (Rp)"

                                    type="number"

                                    required={false}
                                />
                            </div>
                        ))}

                        <div className="flex gap-2">
                            <button
                                type="button"

                                className="btn btn-xs"

                                onClick={() => setCount(count + 1)}
                            >
                                Tambah termin
                            </button>

                            <button
                                type="button"

                                className="btn btn-xs"

                                onClick={() => setCount(Math.max(0, count - 1))}
                            >
                                Kurangi termin
                            </button>
                        </div>
                    </>
                )}
        </ActionForm>
    );
}

function RegistrationCard({
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

    return (
        <Panel
            title={`${r.student_profile.user.nama} · ${r.student_profile.user.nim_nip}`}
        >
            <div className="flex flex-wrap gap-2 text-sm">
                <span className="badge badge-outline">
                    {r.policy
                        ? categories[r.policy.category]
                        : 'Pendaftaran historis'}
                </span>

                <span className="badge badge-outline">
                    {r.keys_returned_at
                        ? 'Kunci telah kembali'
                        : r.checked_in_at
                          ? 'Sudah check-in'
                          : r.completed_at
                            ? 'Histori hunian'
                            : (statuses[r.allocation_status] ??
                              statuses[r.status] ??
                              r.status)}
                </span>

                {r.policy && <span>Kebijakan v{r.policy.version}</span>}
            </div>

            <p>
                {r.reserved_room
                    ? `${r.reserved_room.lantai.gedung.nama_gedung} · kamar ${r.reserved_room.nomor_kamar}`
                    : 'Belum mendapat kamar'}
            </p>

            {r.checkin_classification && (
                <p className="text-sm">
                    Klasifikasi saat check-in: {r.checkin_classification}
                </p>
            )}

            {r.tagihan &&
                Number(r.tagihan.total_dibayar) > Number(r.tagihan.total) && (
                    <p className="alert alert-info">
                        Kredit lebih bayar:{' '}
                        {formatRupiah(
                            Number(r.tagihan.total_dibayar) -
                                Number(r.tagihan.total),
                        )}
                        . Penyelesaian melalui keuangan.
                    </p>
                )}

            <Amendments r={r} rooms={rooms} manager={manager} />

            {r.tagihan && (
                <div className="grid gap-1 text-sm sm:grid-cols-2">
                    <p>
                        Kewajiban pribadi:{' '}
                        {formatRupiah(Number(r.tagihan.total))}; dibayar{' '}
                        {formatRupiah(Number(r.tagihan.total_dibayar))}
                    </p>

                    <p>
                        Kewajiban institusi:{' '}
                        {formatRupiah(Number(r.tagihan.sponsor_total))}; dibayar{' '}
                        {formatRupiah(Number(r.tagihan.sponsor_paid))}
                    </p>
                </div>
            )}

            {r.blockers.length > 0 && (
                <ul className="text-warning list-disc pl-5 text-sm">
                    {r.blockers.map((issue) => (
                        <li key={issue}>{issue}</li>
                    ))}
                </ul>
            )}

            {!r.completed_at && r.blockers.length === 0 && (
                <p className="alert alert-success">
                    Siap check-in. Hunian aktif setelah petugas memeriksa berkas
                    asli dan menyerahkan kunci.
                </p>
            )}

            {r.is_kipk && !r.kipk_disbursed_at && (
                <p className="text-sm">
                    KIP-K: pembayaran menunggu pencairan; kewajiban tetap
                    tercatat.
                </p>
            )}

            {r.end_notified_at && !r.keys_returned_at && (
                <p className="alert alert-warning">
                    Masa tinggal berakhir. Tunggu pengembalian kunci dan
                    pemeriksaan fisik sebelum melepas kamar.
                </p>
            )}

            {r.workflow_version === 2 && (
                <details className="border-base-300 rounded border p-3">
                    <summary className="cursor-pointer font-medium">
                        Dokumen pendaftaran
                    </summary>

                    <div className="mt-3 space-y-4">
                        {[
                            ...new Set([
                                ...(r.policy?.settings.documents ?? []),
                                ...r.decisions
                                    .filter(
                                        (d) =>
                                            d.status === 'approved' &&
                                            !d.terms?.requires_configuration,
                                    )
                                    .map((d) => d.terms?.agreement_kind)
                                    .filter((kind): kind is string =>
                                        Boolean(kind),
                                    ),
                            ]),
                        ].map((kind) => {
                            const doc = latestDocuments.find(
                                (d) => d.kind === kind,
                            );

                            return (
                                <div
                                    className="border-base-200 border-b pb-3"

                                    key={kind}
                                >
                                    <p className="font-medium">
                                        {kind.replaceAll('_', ' ')} —{' '}
                                        {doc
                                            ? statuses[doc.status]
                                            : 'Belum diunggah'}
                                    </p>

                                    {doc && (
                                        <>
                                            <a
                                                className="link"

                                                href={workflow.document.url(
                                                    doc.id,
                                                )}
                                            >
                                                Unduh versi {doc.version}
                                            </a>

                                            {doc.reviewer && (
                                                <p className="text-sm">
                                                    Diperiksa{' '}
                                                    {doc.reviewer.nama} ·{' '}
                                                    {doc.reviewed_at?.slice(
                                                        0,

                                                        16,
                                                    )}
                                                </p>
                                            )}

                                            {doc.notes && (
                                                <p className="text-sm">
                                                    Catatan: {doc.notes}
                                                </p>
                                            )}
                                        </>
                                    )}

                                    {(!r.completed_at ||
                                        kind.startsWith('pembiayaan_')) &&
                                        !r.keys_returned_at &&
                                        r.can_submit && (
                                            <ActionForm
                                                url={workflow.upload.url(r.id)}

                                                label="Unggah versi baru"
                                            >
                                                <input
                                                    type="hidden"

                                                    name="kind"

                                                    value={kind}
                                                />

                                                <Field
                                                    name="file"

                                                    label="Dokumen PDF atau gambar, maksimal 5 MB"

                                                    type="file"
                                                />
                                            </ActionForm>
                                        )}

                                    {(!r.completed_at ||
                                        kind.startsWith('pembiayaan_')) &&
                                        !r.keys_returned_at &&
                                        doc &&
                                        r.can_operate && (
                                            <ActionForm
                                                url={workflow.reviewDocument.url(
                                                    doc.id,
                                                )}

                                                label="Simpan pemeriksaan"
                                            >
                                                <Field
                                                    label="Hasil pemeriksaan"

                                                    name="status"
                                                >
                                                    <select
                                                        name="status"

                                                        className={input}
                                                    >
                                                        <option value="valid">
                                                            Valid
                                                        </option>

                                                        <option value="revision">
                                                            Perlu revisi
                                                        </option>
                                                    </select>
                                                </Field>

                                                <Field
                                                    name="notes"

                                                    label="Catatan pemeriksaan"

                                                    required={false}
                                                />
                                            </ActionForm>
                                        )}
                                </div>
                            );
                        })}

                        <details>
                            <summary className="cursor-pointer text-sm">
                                Riwayat versi dokumen
                            </summary>

                            {r.documents.map((d) => (
                                <p key={d.id} className="text-sm">
                                    <a
                                        className="link"

                                        href={workflow.document.url(d.id)}
                                    >
                                        {d.kind} v{d.version}
                                    </a>{' '}
                                    · {statuses[d.status] ?? d.status} ·{' '}
                                    {d.reviewer?.nama ?? 'Belum diperiksa'}{' '}
                                    {d.notes && `— ${d.notes}`}
                                </p>
                            ))}
                        </details>
                    </div>
                </details>
            )}

            {(!r.completed_at ||
                r.decisions.some((d) => d.terms?.amendment_id)) &&
                r.tagihan && (
                    <details className="border-base-300 rounded border p-3">
                        <summary className="cursor-pointer font-medium">
                            Keputusan pembiayaan
                        </summary>

                        <div className="mt-3 space-y-4">
                            {r.decisions.map((d) => (
                                <div className="border-b pb-3" key={d.id}>
                                    <p className="font-medium">
                                        {decisionNames[d.kind]} ·{' '}
                                        {statuses[d.status] ?? d.status}
                                    </p>

                                    <p>{d.reason}</p>

                                    {d.terms?.notes && <p>{d.terms.notes}</p>}

                                    {d.status === 'approved' &&
                                        d.terms?.requires_configuration && (
                                            <p className="text-warning">
                                                Menunggu pengaturan skema oleh
                                                pengelola.
                                            </p>
                                        )}

                                    {d.status === 'approved' &&
                                        d.terms?.requires_configuration &&
                                        manager && <Terms decision={d} />}

                                    {d.terms?.schedule?.map((term, i) => (
                                        <p key={i} className="text-sm">
                                            Termin {i + 1}: {term.jatuh_tempo} ·{' '}
                                            {formatRupiah(Number(term.jumlah))}
                                        </p>
                                    ))}

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
                                            <Terms decision={d} />
                                        )}
                                </div>
                            ))}

                            {r.can_submit && !r.completed_at && (
                                <ActionForm
                                    url={workflow.requestDecision.url(r.id)}

                                    label="Ajukan keputusan"
                                >
                                    <Field name="kind" label="Jenis permohonan">
                                        <select className={input} name="kind">
                                            <option value="installment">
                                                Cicilan
                                            </option>

                                            <option value="defer">
                                                Penundaan pembayaran
                                            </option>

                                            {r.rate_unit === 'month' && (
                                                <option value="monthly">
                                                    Skema bulanan
                                                </option>
                                            )}

                                            {r.stay_kind === 'non_student' && (
                                                <option value="transfer_permission">
                                                    Izin berdasarkan bukti
                                                    transfer
                                                </option>
                                            )}
                                        </select>
                                    </Field>

                                    <Field
                                        name="reason"

                                        label="Alasan permohonan"
                                    />
                                </ActionForm>
                            )}
                        </div>
                    </details>
                )}

            {manager && r.stay_kind === 'non_student' && r.tagihan && (
                <details className="rounded border p-3">
                    <summary className="cursor-pointer">
                        Catat bukti transfer penyewa
                    </summary>

                    <ActionForm
                        url={workflow.transferProof.url(r.id)}

                        label="Simpan bukti untuk diperiksa"
                    >
                        <Field
                            name="nominal"

                            label="Nominal transfer"

                            type="number"
                        />

                        <Field name="file" label="Bukti transfer" type="file" />
                    </ActionForm>
                </details>
            )}

            {r.can_operate && !r.completed_at && (
                <ActionForm
                    url={workflow.checkIn.url(r.id)}

                    label="Konfirmasi check-in dan serah kunci"
                >
                    <Confirm name="identity_checked">
                        Identitas penghuni telah diperiksa langsung.
                    </Confirm>

                    <Confirm name="original_documents_checked">
                        Berkas asli sesuai dokumen yang disahkan.
                    </Confirm>

                    <Confirm name="keys_handed">
                        Penghuni hadir dan kunci telah diserahkan.
                    </Confirm>
                </ActionForm>
            )}

            {r.can_operate && r.completed_at && !r.keys_returned_at && (
                <details className="rounded border p-3">
                    <summary className="cursor-pointer font-medium">
                        Pengembalian kunci
                    </summary>

                    {!r.checkout_request ? (
                        <ActionForm
                            url={workflow.requestInspection.url(r.id)}

                            label="Ajukan pemeriksaan kamar"
                        />
                    ) : (
                        <p className="my-3 text-sm">
                            Status inspeksi:{' '}
                            {r.checkout_request.inspection?.status ??
                                'Menunggu petugas inspeksi'}
                        </p>
                    )}

                    <ActionForm
                        url={workflow.returnKeys.url(r.id)}

                        label="Catat kunci kembali"
                    >
                        <Confirm name="keys_received">
                            Kunci sudah diterima petugas.
                        </Confirm>

                        <Confirm name="room_vacated">
                            Penghuni telah mengosongkan tempat tinggal dan
                            kondisi telah diperiksa.
                        </Confirm>

                        <Field name="condition" label="Kondisi kamar">
                            <select className={input} name="condition">
                                <option value="ready">Siap digunakan</option>

                                <option value="damaged">
                                    Rusak / perlu penanganan
                                </option>
                            </select>
                        </Field>

                        <Field name="notes" label="Catatan pemeriksaan fisik" />
                    </ActionForm>
                </details>
            )}

            {manager && r.is_kipk && !r.reserved_room && (
                <ActionForm
                    url={workflow.allocate.url(r.id)}

                    label="Periksa kembali antrean alokasi"
                />
            )}

            {manager && r.is_kipk && !r.kipk_disbursed_at && (
                <details className="rounded border p-3">
                    <summary className="cursor-pointer">
                        Catat pencairan KIP-K
                    </summary>

                    <ActionForm
                        url={workflow.disburse.url(r.id)}

                        label="Simpan pencairan"
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
                </details>
            )}

            {manager &&
                !r.workflow_version &&
                r.completed_at &&
                !r.historical_confirmed_at && (
                    <ActionForm
                        url={workflow.historical.url(r.id)}

                        label="Konfirmasi histori penghuni"
                    >
                        <Field
                            name="evidence"

                            label="Bukti kedatangan atau serah kunci historis"

                            type="file"
                        />

                        <Field name="notes" label="Dasar konfirmasi" />
                    </ActionForm>
                )}
        </Panel>
    );
}

function Policies({
    buildings,

    policyCatalog,

    policies,
    masterHousingUrl,
}: Pick<
    Props,
    'buildings' | 'policyCatalog' | 'policies' | 'masterHousingUrl'
>) {
    const [step, setStep] = useState(0);
    const steps = [
        'Kategori',
        'Persyaratan',
        'Gedung dan tarif',
        'Kesiapan',
        'Konfirmasi',
    ];
    const form = useForm<{ category: string; settings: Settings }>({
        category: 'local_non_kipk',

        settings: {
            open: false,

            documents: ['perjanjian'],

            building_ids: [],

            rates: [],

            month_days: 30,

            day_basis: 'nights',

            monthly_allowed: false,
        },
    });

    const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
        form.setData('settings', { ...form.data.settings, [key]: value });

    const catalog = policyCatalog[form.data.category] ?? [];
    const selected = form.data.settings.building_ids;
    const buildingsReady =
        selected.length > 0 &&
        selected.every((id) =>
            catalog.some((entry) => entry.id === id && !entry.issue),
        );
    const documents = form.data.settings.documents;
    const documentsReady =
        documents.length > 0 &&
        documents.every((name) => /^[a-z0-9_]{1,80}$/.test(name)) &&
        new Set(documents).size === documents.length &&
        (form.data.category !== 'local_kipk' ||
            documents.includes('perjanjian'));
    const buildingIssues = selected.flatMap((id) => {
        const entry = catalog.find((item) => item.id === id);
        if (entry && !entry.issue) return [];
        return [
            {
                id,
                building: buildings.find((item) => item.id === id),
                message: entry?.issue ?? 'Gedung tidak menerima kategori ini.',
            },
        ];
    });
    const [refreshing, setRefreshing] = useState(false);

    return (
        <Panel title="Kebijakan pendaftaran">
            <p className="text-sm">
                Buka pendaftaran setelah dokumen wajib dan gedung ditetapkan.
                Urutan gedung menentukan prioritas alokasi. Pendaftaran lama
                tetap memakai versi asal.
            </p>

            <div className="flex flex-wrap gap-2">
                {policies
                    .filter(
                        (p, i) =>
                            policies.findIndex(
                                (entry) => entry.category === p.category,
                            ) === i,
                    )
                    .map((p) => (
                        <button
                            key={p.id}

                            className="btn btn-xs"

                            onClick={() =>
                                form.setData({
                                    category: p.category,

                                    settings: {
                                        ...p.settings,

                                        rates: p.settings.rates.map((r) => ({
                                            ...r,

                                            room_amount: r.room_amount ?? '',
                                        })),
                                    },
                                })
                            }
                        >
                            {categories[p.category]} ·{' '}
                            {p.published_at
                                ? p.settings.open
                                    ? 'Dibuka'
                                    : 'Ditutup'
                                : 'Belum dibuka'}
                        </button>
                    ))}
            </div>

            <ol
                className="flex flex-wrap gap-2 text-sm"
                aria-label="Tahapan pengaturan"
            >
                {steps.map((label, index) => (
                    <li
                        key={label}
                        aria-current={index === step ? 'step' : undefined}
                        className={
                            index === step ? 'text-primary font-semibold' : ''
                        }
                    >
                        {index + 1}. {label}
                    </li>
                ))}
            </ol>
            <form
                className="space-y-4"

                onSubmit={(e) => {
                    e.preventDefault();
                    if (step !== 4) return;

                    form.transform(({ category, settings }) => ({
                        category,
                        settings: {
                            open: settings.open,
                            documents: settings.documents,
                            building_ids: settings.building_ids,
                            month_days: settings.month_days,
                            day_basis: settings.day_basis,
                            monthly_allowed: settings.monthly_allowed,
                        },
                    }));
                    form.post(workflow.policy.url(), { preserveScroll: true });
                }}
            >
                {step === 0 && (
                    <label className="block">
                        Kategori
                        <select
                            className={input}

                            value={form.data.category}

                            onChange={(e) =>
                                form.setData({
                                    category: e.target.value,
                                    settings: policies.find(
                                        (p) => p.category === e.target.value,
                                    )?.settings ?? {
                                        ...form.data.settings,
                                        open: false,
                                        documents: ['perjanjian'],
                                        building_ids: [],
                                        rates: [],
                                    },
                                })
                            }
                        >
                            {Object.entries(categories).map(([key, name]) => (
                                <option key={key} value={key}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {step === 4 && (
                    <label className="flex gap-2">
                        <input
                            type="checkbox"

                            checked={form.data.settings.open}

                            onChange={(e) => set('open', e.target.checked)}
                        />
                        Buka pendaftaran kategori ini
                    </label>
                )}

                {step === 1 && (
                    <label className="block">
                        Dokumen wajib (pisahkan dengan koma; gunakan nama
                        singkat seperti perjanjian, identitas)
                        <input
                            className={input}

                            value={form.data.settings.documents.join(',')}

                            onChange={(e) =>
                                set(
                                    'documents',

                                    e.target.value
                                        .split(',')
                                        .map((s) => s.trim()),
                                )
                            }
                        />
                    </label>
                )}

                {step === 2 && (
                    <>
                        <div className="space-y-2">
                            <p>Gedung dan urutan prioritas</p>

                            {form.data.settings.building_ids.map((id, i) => (
                                <div
                                    key={id}
                                    className="flex items-center gap-2"
                                >
                                    <span>
                                        {i + 1}.{' '}
                                        {
                                            buildings.find((b) => b.id === id)
                                                ?.nama_gedung
                                        }
                                    </span>

                                    <button
                                        className="btn btn-xs"

                                        type="button"

                                        onClick={() =>
                                            set(
                                                'building_ids',

                                                form.data.settings.building_ids.filter(
                                                    (x) => x !== id,
                                                ),
                                            )
                                        }
                                    >
                                        Hapus
                                    </button>
                                </div>
                            ))}

                            <select
                                className={input}

                                value=""

                                onChange={(e) =>
                                    set('building_ids', [
                                        ...form.data.settings.building_ids,

                                        e.target.value,
                                    ])
                                }
                            >
                                <option value="" disabled>
                                    Tambahkan gedung…
                                </option>

                                {buildings

                                    .filter(
                                        (b) =>
                                            catalog.some(
                                                (entry) => entry.id === b.id,
                                            ) &&
                                            !form.data.settings.building_ids.includes(
                                                b.id,
                                            ),
                                    )

                                    .map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.nama_gedung}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <label>
                                Hitungan harian
                                <select
                                    className={input}

                                    value={form.data.settings.day_basis}

                                    onChange={(e) =>
                                        set('day_basis', e.target.value)
                                    }
                                >
                                    <option value="nights">Jumlah malam</option>

                                    <option value="inclusive_days">
                                        Hari masuk dan keluar dihitung
                                    </option>
                                </select>
                            </label>

                            <label>
                                Jumlah hari satu bulan
                                <input
                                    className={input}

                                    type="number"

                                    min="1"

                                    max="31"

                                    value={form.data.settings.month_days}

                                    onChange={(e) =>
                                        set(
                                            'month_days',
                                            Number(e.target.value),
                                        )
                                    }
                                />
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"

                                    checked={form.data.settings.monthly_allowed}

                                    onChange={(e) =>
                                        set('monthly_allowed', e.target.checked)
                                    }
                                />
                                Izinkan pengajuan bulanan non-maba
                            </label>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-semibold">
                                Tarif dari Master Gedung
                            </h3>
                            {form.data.settings.building_ids.map((id) => {
                                const building = buildings.find(
                                    (entry) => entry.id === id,
                                );
                                const master = policyCatalog[
                                    form.data.category
                                ]?.find((entry) => entry.id === id);
                                const rates = master?.rates ?? [];
                                return (
                                    <div
                                        key={id}
                                        className="rounded border p-3"
                                    >
                                        <p className="font-medium">
                                            {building?.nama_gedung}
                                        </p>
                                        {!master || master.issue ? (
                                            <p className="text-error">
                                                {master?.issue ??
                                                    'Gedung tidak menerima kategori ini.'}
                                            </p>
                                        ) : (
                                            <ul>
                                                {rates.map((rate) => (
                                                    <li
                                                        key={
                                                            rate.type +
                                                            '/' +
                                                            rate.unit
                                                        }
                                                    >
                                                        {rate.type} ·{' '}
                                                        {Number(
                                                            rate.amount,
                                                        ).toLocaleString(
                                                            'id-ID',
                                                            {
                                                                style: 'currency',
                                                                currency: 'IDR',
                                                            },
                                                        )}{' '}
                                                        /{' '}
                                                        {
                                                            (
                                                                {
                                                                    year: 'tahun',
                                                                    semester:
                                                                        'semester',
                                                                    month: 'bulan',
                                                                    day: 'hari',
                                                                } as Record<
                                                                    string,
                                                                    string
                                                                >
                                                            )[rate.unit]
                                                        }
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
                {step >= 3 && (!documentsReady || !buildingsReady) && (
                    <div className="border-warning/40 bg-warning/10 space-y-3 rounded-xl border p-4">
                        <p role="status" className="font-semibold">
                            Lengkapi konfigurasi sebelum membuka pendaftaran.
                        </p>
                        {!documentsReady && (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p>
                                    Periksa dokumen wajib. KIP-K memerlukan
                                    dokumen perjanjian.
                                </p>
                                <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={() => setStep(1)}
                                >
                                    Atur dokumen
                                </button>
                            </div>
                        )}
                        {selected.length === 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p>
                                    {catalog.length === 0
                                        ? 'Belum ada gedung yang menerima kategori ini.'
                                        : 'Belum ada gedung yang dipilih.'}
                                </p>
                                <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={() => setStep(2)}
                                >
                                    Pilih gedung
                                </button>
                                {catalog.length === 0 && masterHousingUrl && (
                                    <a
                                        className="btn btn-sm"
                                        href={masterHousingUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Atur Gedung &amp; Kamar
                                    </a>
                                )}
                                {catalog.length === 0 && !masterHousingUrl && (
                                    <p className="text-sm">
                                        Minta admin Gedung &amp; Kamar mengatur
                                        kategori penghuni.
                                    </p>
                                )}
                            </div>
                        )}
                        {buildingIssues.map(({ id, building, message }) => (
                            <div
                                key={id}
                                className="flex flex-wrap items-center justify-between gap-2"
                            >
                                <p>
                                    {building?.nama_gedung ?? 'Gedung terpilih'}{' '}
                                    · {message}
                                </p>
                                {building?.settings_url ? (
                                    <a
                                        className="btn btn-sm"
                                        href={building.settings_url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Atur gedung ini
                                    </a>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-sm"
                                        onClick={() => setStep(2)}
                                    >
                                        Ubah pilihan gedung
                                    </button>
                                )}
                            </div>
                        ))}
                        {!buildingsReady && (
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline"
                                    disabled={refreshing}
                                    onClick={() =>
                                        router.reload({
                                            only: [
                                                'policyCatalog',
                                                'buildings',
                                            ],
                                            onStart: () => setRefreshing(true),
                                            onFinish: () =>
                                                setRefreshing(false),
                                        })
                                    }
                                >
                                    {refreshing
                                        ? 'Memeriksa…'
                                        : 'Periksa ulang konfigurasi'}
                                </button>
                                <span className="text-sm">
                                    Gunakan setelah menyimpan perubahan di
                                    Gedung &amp; Kamar.
                                </span>
                            </div>
                        )}
                    </div>
                )}
                {step === 3 && documentsReady && buildingsReady && (
                    <div className="space-y-2">
                        <p>Dokumen siap.</p>
                        <p>Gedung terpilih memiliki tarif yang sesuai.</p>
                    </div>
                )}
                {step === 4 && (
                    <p>
                        {categories[form.data.category]} · {selected.length}{' '}
                        gedung · {documents.join(', ')}
                    </p>
                )}
                {Object.entries(form.errors).map(([key, error]) => (
                    <p role="alert" className="text-error" key={key}>
                        {error}
                    </p>
                ))}

                <div className="flex gap-2">
                    {step > 0 && (
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setStep(step - 1)}
                        >
                            Kembali
                        </button>
                    )}
                    {step < 4 && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setStep(step + 1)}
                        >
                            Lanjut
                        </button>
                    )}
                    {step === 4 && (
                        <button
                            disabled={
                                form.processing ||
                                (form.data.settings.open &&
                                    (!buildingsReady || !documentsReady))
                            }

                            className="btn btn-primary"
                        >
                            {form.data.settings.open
                                ? 'Buka Pendaftaran'
                                : 'Tutup Pendaftaran'}
                        </button>
                    )}
                </div>
            </form>
        </Panel>
    );
}

function Applications({
    rooms,

    programs,

    items,
}: {
    rooms: Room[];

    programs: Program[];

    items: Application[];
}) {
    const [count, setCount] = useState(1);

    const [kind, setKind] = useState('international');

    return (
        <div className="space-y-5">
            <Panel title="Permohonan internasional, S2/S3, dan kegiatan">
                <ActionForm
                    url={applications.store.url()}

                    label="Simpan permohonan dan peserta"
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field name="number" label="Nomor surat / permohonan" />

                        <Field name="kind" label="Jenis">
                            <select
                                className={input}
                                name="kind"
                                value={kind}
                                onChange={(e) => setKind(e.target.value)}
                            >
                                <option value="international">
                                    Internasional
                                </option>

                                <option value="postgraduate">
                                    S2 / S3 mandiri
                                </option>

                                <option value="summer_course">
                                    Summer Course
                                </option>
                            </select>
                        </Field>

                        <Field
                            name="institution"

                            label="Institusi / penyelenggara / pembayar"

                            required={kind !== 'postgraduate'}
                        />

                        <Field
                            name="recipient_email"

                            label="Email penerima invoice"

                            type="email"
                        />

                        <Field
                            name="letter"

                            label="Surat permohonan (opsional untuk S2/S3 mandiri)"

                            required={kind !== 'postgraduate'}

                            type="file"
                        />

                        <Field name="funding" label="Pembiayaan">
                            <select
                                className={input}
                                name="funding"
                                key={kind}
                                defaultValue={
                                    kind === 'postgraduate'
                                        ? 'personal'
                                        : 'sponsor'
                                }
                            >
                                {kind !== 'postgraduate' && (
                                    <option value="sponsor">
                                        Institusi / rektorat / penyelenggara
                                    </option>
                                )}

                                <option value="personal">Pribadi</option>
                            </select>
                        </Field>

                        <Field
                            name="starts_at"

                            label="Mulai tinggal"

                            type="date"
                        />

                        <Field
                            name="ends_at"

                            label="Akhir tinggal"

                            type="date"
                        />

                        <Field
                            name="rate_unit"

                            label="Satuan tarif (Summer Course selalu harian)"
                        >
                            <select name="rate_unit" className={input}>
                                <option value="year">Tahun</option>

                                <option value="semester">Semester</option>

                                <option value="month">Bulan</option>

                                <option value="day">Hari</option>
                            </select>
                        </Field>
                    </div>

                    {Array.from({ length: count }, (_, i) => (
                        <fieldset
                            className="grid gap-3 rounded border p-3 sm:grid-cols-2"

                            key={i}
                        >
                            <legend className="font-medium">
                                Peserta {i + 1}
                            </legend>

                            <Field
                                name={`participants[${i}][nama]`}

                                label="Nama sesuai identitas"
                            />

                            <Field
                                name={`participants[${i}][nim_nip]`}

                                label="NIM / nomor identitas"
                            />

                            <Field
                                name={`participants[${i}][email]`}

                                label="Email"

                                type="email"
                            />

                            <Field
                                name={`participants[${i}][gender]`}

                                label="Jenis kelamin"
                            >
                                <select
                                    className={input}

                                    name={`participants[${i}][gender]`}
                                >
                                    <option value="perempuan">Perempuan</option>

                                    <option value="laki_laki">Laki-laki</option>
                                </select>
                            </Field>

                            <Field
                                name={`participants[${i}][kamar_id]`}

                                label="Kamar"
                            >
                                <select
                                    className={input}

                                    name={`participants[${i}][kamar_id]`}

                                    required
                                >
                                    <option value="">Pilih kamar</option>

                                    {rooms.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.lantai.gedung.nama_gedung} /{' '}
                                            {r.nomor_kamar}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                name={`participants[${i}][prodi_id]`}

                                label="Program studi (bila mahasiswa)"
                            >
                                <select
                                    className={input}

                                    name={`participants[${i}][prodi_id]`}

                                    required={kind === 'postgraduate'}
                                >
                                    <option value="">Tidak ada</option>

                                    {programs
                                        .filter(
                                            (p) =>
                                                kind !== 'postgraduate' ||
                                                ['S2', 'S3'].includes(
                                                    p.jenjang,
                                                ),
                                        )
                                        .map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.jenjang}
                                            </option>
                                        ))}
                                </select>
                            </Field>

                            <Field
                                name={`participants[${i}][sponsor_limit]`}

                                label="Batas tanggungan sponsor (kosong = seluruh biaya)"

                                type="number"

                                required={false}
                            />
                        </fieldset>
                    ))}

                    <div className="flex gap-2">
                        <button
                            className="btn btn-sm"

                            type="button"

                            onClick={() => setCount(count + 1)}
                        >
                            Tambah peserta
                        </button>

                        <button
                            className="btn btn-sm"

                            type="button"

                            onClick={() => setCount(Math.max(1, count - 1))}
                        >
                            Kurangi peserta
                        </button>
                    </div>
                </ActionForm>
            </Panel>

            {items.map((a) => (
                <Panel
                    key={a.id}
                    title={`${a.number} · ${a.institution ?? 'Mandiri'}`}
                >
                    <p>
                        {categories[a.kind]} · {a.registrations.length} peserta
                    </p>

                    {a.letter_path && (
                        <a
                            className="link"
                            href={applications.letter.url(a.id)}
                        >
                            Unduh surat
                        </a>
                    )}

                    {a.approved_at ? (
                        <p className="text-success">
                            Dukungan pembiayaan disahkan.
                        </p>
                    ) : (
                        <ActionForm
                            url={applications.approve.url(a.id)}

                            label="Sahkan dukungan"
                        >
                            <Confirm name="support_verified">
                                Surat dan penanggung biaya telah diverifikasi.
                            </Confirm>
                        </ActionForm>
                    )}

                    <p className="text-sm">
                        Invoice final Summer Course diterbitkan setelah masa
                        sewa berakhir. Kunci dicatat kembali per peserta.
                    </p>
                </Panel>
            ))}
        </div>
    );
}

function Finance({
    references,

    invoices,

    groups,

    applicationItems,

    proofs,
}: {
    proofs: Props['paymentProofs'];

    references: Reference[];

    invoices: Invoice[];

    groups: Props['invoiceGroups'];

    applicationItems: Application[];
}) {
    const [rows, setRows] = useState(1);

    return (
        <div className="space-y-5">
            <Panel title="Catat transaksi resmi DPUB">
                <p>
                    Bukti transfer penghuni tetap perlu dicocokkan dengan
                    catatan resmi. Pencatatan ini belum membukukan dana sampai
                    alokasinya disahkan.
                </p>

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
                            <select name="payer_type" className={input}>
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

                    <Confirm name="official_source_confirmed">
                        Saya telah memeriksa sumber resmi DPUB, termasuk
                        referensi, tanggal, dan nominal.
                    </Confirm>
                </ActionForm>
            </Panel>

            {references.map((ref) => (
                <Panel
                    key={ref.id}

                    title={`${ref.reference} · ${formatRupiah(Number(ref.amount))}`}
                >
                    <p>
                        {ref.source} · {statuses[ref.status]} ·{' '}
                        {ref.payer_type === 'sponsor' ? 'Institusi' : 'Pribadi'}
                    </p>

                    <a
                        className="link"

                        href={workflow.paymentEvidence.url(ref.id)}
                    >
                        Lihat catatan resmi
                    </a>

                    {ref.status === 'unmatched' && (
                        <ActionForm
                            url={workflow.reconcile.url(ref.id)}

                            label="Cocokkan dan bukukan"
                        >
                            <p className="text-sm">
                                Jumlah alokasi harus tepat sama dengan dana
                                masuk. Jika belum cocok, biarkan transaksi
                                berada dalam antrean ini.
                            </p>

                            {Array.from({ length: rows }, (_, i) => (
                                <div
                                    key={i}

                                    className="grid gap-2 sm:grid-cols-2"
                                >
                                    <Field
                                        name={`allocations[${i}][tagihan_id]`}

                                        label="Tagihan"
                                    >
                                        <select
                                            className={input}

                                            name={`allocations[${i}][tagihan_id]`}

                                            required
                                        >
                                            <option value="">
                                                Pilih tagihan
                                            </option>

                                            {invoices.map((inv) => (
                                                <option
                                                    key={inv.id}

                                                    value={inv.id}
                                                >
                                                    {inv.mahasiswa?.user.nama} /{' '}
                                                    {inv.nomor} / sisa{' '}
                                                    {formatRupiah(
                                                        ref.payer_type ===
                                                            'sponsor'
                                                            ? Number(
                                                                  inv.sponsor_total,
                                                              ) -
                                                                  Number(
                                                                      inv.sponsor_paid,
                                                                  )
                                                            : Number(
                                                                  inv.total,
                                                              ) -
                                                                  Number(
                                                                      inv.total_dibayar,
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
                                    />

                                    <Field
                                        name={`allocations[${i}][payment_proof_id]`}

                                        label="Bukti transfer yang dicocokkan (opsional)"
                                    >
                                        <select
                                            name={`allocations[${i}][payment_proof_id]`}

                                            className={input}
                                        >
                                            <option value="">
                                                Tanpa bukti unggahan
                                            </option>

                                            {proofs.map((proof) => (
                                                <option
                                                    key={proof.id}

                                                    value={proof.id}
                                                >
                                                    {proof.mahasiswa.user.nama}{' '}
                                                    — {proof.kode_transaksi} —{' '}
                                                    {formatRupiah(
                                                        Number(proof.nominal),
                                                    )}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            ))}

                            <div className="flex gap-2">
                                <button
                                    className="btn btn-sm"

                                    type="button"

                                    onClick={() => setRows(rows + 1)}
                                >
                                    Tambah alokasi
                                </button>

                                <button
                                    className="btn btn-sm"

                                    type="button"

                                    onClick={() =>
                                        setRows(Math.max(1, rows - 1))
                                    }
                                >
                                    Kurangi alokasi
                                </button>
                            </div>
                        </ActionForm>
                    )}
                </Panel>
            ))}

            <Panel title="Invoice gabungan institusi">
                <ActionForm
                    url={invoiceActions.store.url()}

                    label="Terbitkan invoice final"
                >
                    <Field
                        name="residence_application_id"

                        label="Permohonan institusi"
                    >
                        <select
                            className={input}

                            name="residence_application_id"

                            required
                        >
                            <option value="">Pilih permohonan</option>

                            {applicationItems.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.number} — {a.institution}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field name="nomor" label="Nomor invoice" />

                        <Field name="payer_type" label="Jenis kewajiban">
                            <select className={input} name="payer_type">
                                <option value="sponsor">Institusi</option>

                                <option value="personal">Pribadi</option>
                            </select>
                        </Field>

                        <Field name="recipient" label="Penerima" />

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

                        <Field name="signer" label="Penandatangan" />
                    </div>

                    <fieldset>
                        <legend className="font-medium">
                            Pilih tagihan peserta dari permohonan yang sama
                        </legend>

                        {invoices.map((inv) => (
                            <label
                                className="flex gap-2 py-1 text-sm"

                                key={inv.id}
                            >
                                <input
                                    type="checkbox"

                                    name="invoice_ids[]"

                                    value={inv.id}
                                />
                                {inv.mahasiswa?.user.nama} — {inv.nomor}
                            </label>
                        ))}
                    </fieldset>
                </ActionForm>

                {groups.map((group) => (
                    <div className="border-t pt-3" key={group.id}>
                        <a
                            href={invoiceActions.download.url(group.id)}

                            className="link"
                        >
                            {group.nomor}
                        </a>

                        {group.residence_application_id &&
                            (['queued', 'sent'].includes(
                                group.delivery_status ?? '',
                            ) ? (
                                <p className="text-sm">
                                    {group.delivery_status === 'sent'
                                        ? 'Email diserahkan ke layanan pengiriman.'
                                        : 'Menunggu pengiriman email.'}
                                </p>
                            ) : (
                                <ActionForm
                                    url={applications.sendInvoice.url(group.id)}

                                    label={
                                        group.delivery_status === 'failed'
                                            ? 'Pengiriman gagal — coba kirim ulang'
                                            : 'Kirim invoice ke institusi'
                                    }
                                />
                            ))}
                    </div>
                ))}
            </Panel>
        </div>
    );
}

export default function ResidenceWorkflowPage(props: Props) {
    const [tab, setTab] = useState('registrations');

    const { errors } = usePage().props;

    const isOfficerView = !props.studentView;

    const tabs = [
        ['registrations', 'Pendaftaran'],

        ...(props.manager
            ? [
                  ['policies', 'Kebijakan'],

                  ['applications', 'Institusi / kegiatan'],

                  ['public', 'Penyewa umum'],

                  ['contracts', 'Kamar bersama'],
              ]
            : []),

        ...(props.finance ? [['finance', 'Rekonsiliasi & invoice']] : []),
    ];

    return (
        <div className="space-y-5">
            <Head
                title={
                    isOfficerView
                        ? 'Proses Pendaftaran'
                        : 'Status Pendaftaran Asrama'
                }
            />

            <header>
                <h1 className="text-2xl font-bold">
                    {isOfficerView
                        ? 'Proses Pendaftaran'
                        : 'Pendaftaran & Status Hunian Saya'}
                </h1>

                <p className="text-base-content/70">
                    {isOfficerView
                        ? 'Administrasi, pembiayaan, check-in fisik, dan pengembalian kunci.'
                        : 'Pantau status pengajuan kamar, kelengkapan berkas, pembayaran, dan check-in Anda.'}
                </p>
            </header>

            {Object.entries(errors ?? {}).map(([key, error]) => (
                <p key={key} className="alert alert-error" role="alert">
                    {String(error)}
                </p>
            ))}

            {isOfficerView && (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        {Object.entries(props.summary).map(([key, count]) => (
                            <div
                                className="bg-base-100 rounded border p-4"

                                key={key}
                            >
                                <p className="text-2xl font-semibold">
                                    {['receivables', 'credits'].includes(key)
                                        ? formatRupiah(count)
                                        : count}
                                </p>

                                <p className="text-sm">
                                    {
                                        {
                                            applicants: 'Pendaftar',

                                            allocated: 'Alokasi belum masuk',

                                            ready: 'Siap check-in',

                                            occupants: 'Penghuni tercatat',

                                            historical:
                                                'Histori perlu konfirmasi',

                                            physical:
                                                'Penghuni fisik terkonfirmasi',

                                            credits: 'Kredit lebih bayar',

                                            receivables:
                                                'Piutang pribadi & institusi',
                                        }[key]
                                    }
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-2" role="tablist">
                        {tabs.map(([key, title]) => (
                            <button
                                key={key}

                                role="tab"

                                aria-selected={tab === key}

                                onClick={() => setTab(key)}

                                className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                {title}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {tab === 'registrations' && (
                <div className="space-y-4">
                    {props.registrations.data.length === 0 && (
                        <p className="bg-base-100 text-base-content/70 rounded border p-6 text-sm">
                            {isOfficerView
                                ? 'Belum ada pendaftaran dalam lingkup akses Anda.'
                                : 'Anda belum memiliki pengajuan pendaftaran asrama.'}
                        </p>
                    )}

                    {props.registrations.data.map((r) => (
                        <RegistrationCard
                            rooms={props.rooms}

                            key={r.id}

                            r={r}

                            manager={props.manager}

                            leader={props.leader}
                        />
                    ))}

                    {props.registrations.last_page > 1 && (
                        <nav
                            className="flex flex-wrap gap-2"

                            aria-label="Halaman pendaftaran"
                        >
                            {props.registrations.links.map(
                                (link, i) =>
                                    link.url && (
                                        <Link
                                            key={i}

                                            href={link.url}

                                            className={`btn btn-sm ${link.active ? 'btn-primary' : 'btn-ghost'}`}
                                        >
                                            {link.label

                                                .replace(/&laquo;/g, '‹')

                                                .replace(/&raquo;/g, '›')}
                                        </Link>
                                    ),
                            )}
                        </nav>
                    )}
                </div>
            )}

            {tab === 'public' && <GeneralPublic rooms={props.rooms} />}

            {tab === 'policies' && (
                <Policies
                    buildings={props.buildings}

                    policyCatalog={props.policyCatalog}
                    masterHousingUrl={props.masterHousingUrl}

                    policies={props.policies}
                />
            )}

            {tab === 'applications' && (
                <Applications
                    rooms={props.rooms}

                    programs={props.programs}

                    items={props.applications}
                />
            )}

            {tab === 'finance' && (
                <Finance
                    proofs={props.paymentProofs}

                    references={props.reconciliations}

                    invoices={props.invoices}

                    groups={props.invoiceGroups}

                    applicationItems={props.applications}
                />
            )}

            {tab === 'contracts' && (
                <Panel title="Pengesahan kontrak kamar bersama">
                    <p>
                        Anggota menerima undangan teman sekamar terlebih dahulu.
                        Pilih seluruh pendaftar untuk satu kamar; total tarif
                        kamar dibagi tepat kepada anggota yang disahkan.
                    </p>

                    <ActionForm
                        url={workflow.contract.url()}

                        label="Sahkan anggota dan terbitkan tagihan"
                    >
                        {props.registrations.data

                            .filter(
                                (r) =>
                                    r.billing_basis === 'room' &&
                                    !r.room_contract_id &&
                                    !r.completed_at &&
                                    r.status !== 'rejected',
                            )

                            .map((r) => (
                                <label key={r.id} className="flex gap-2">
                                    <input
                                        type="checkbox"

                                        name="registration_ids[]"

                                        value={r.id}
                                    />
                                    {r.student_profile.user.nama} —{' '}
                                    {r.reserved_room?.nomor_kamar}
                                </label>
                            ))}
                    </ActionForm>
                </Panel>
            )}
        </div>
    );
}

function GeneralPublic({ rooms }: { rooms: Room[] }) {
    return (
        <Panel title="Permohonan penyewa umum">
            <p>
                Pencatatan dan penempatan melalui pengelola. Setelah tagihan
                terbit, unggah bukti transfer atau ajukan penundaan kepada
                pimpinan, lalu verifikasi berkas dan serah kunci.
            </p>

            <ActionForm
                url={storeGeneralStay.url()}

                label="Daftarkan penyewa umum"
            >
                <input type="hidden" name="stay_kind" value="non_student" />

                <div className="grid gap-3 sm:grid-cols-2">
                    <Field name="nama" label="Nama sesuai identitas" />

                    <Field name="nim_nip" label="NIK / nomor paspor" />

                    <Field
                        name="email"

                        label="Email (opsional)"

                        type="email"

                        required={false}
                    />

                    <Field name="gender" label="Jenis kelamin">
                        <select className={input} name="gender">
                            <option value="perempuan">Perempuan</option>

                            <option value="laki_laki">Laki-laki</option>
                        </select>
                    </Field>

                    <Field name="starts_at" label="Tanggal masuk" type="date" />

                    <Field name="ends_at" label="Tanggal keluar" type="date" />

                    <Field name="kamar_id" label="Kamar">
                        <select className={input} name="kamar_id" required>
                            <option value="">Pilih kamar</option>

                            {rooms.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.lantai.gedung.nama_gedung} /{' '}
                                    {r.nomor_kamar}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
            </ActionForm>
        </Panel>
    );
}
