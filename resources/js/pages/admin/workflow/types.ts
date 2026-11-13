export type Building = {
    id: string;
    nama_gedung: string;
    kode_gedung: string;
    settings_url?: string | null;
};

export type Room = {
    id: string;
    nomor_kamar: string;
    kapasitas: number;
    lantai: { gedung: Building };
};

export type Program = {
    id: string;
    name: string;
    jenjang: string;
    departemen_id?: string;
};

export type FacultyItem = { id: string; name: string };
export type DepartemenItem = { id: string; name: string; faculty_id: string };

export type Invoice = {
    id: string;
    nomor: string;
    total: string;
    total_dibayar: string;
    sponsor_total: string;
    sponsor_paid: string;
    mahasiswa?: { user: { nama: string } };
    registration?: {
        id: string;
        tagihan_id?: string | null;
        residence_application_id?: string | null;
    } | null;
};

export type Document = {
    id: string;
    kind: string;
    version: number;
    status: string;
    notes?: string;
    reviewed_at?: string;
    reviewer?: { nama: string };
};

export type Decision = {
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

export type Rate = {
    gedung_id: string;
    type: string;
    unit: string;
    amount: string;
    room_amount: string;
};

export type Settings = {
    open: boolean;
    documents: string[];
    building_ids: string[];
    rates: Rate[];
    month_days: number;
    day_basis: string;
    monthly_allowed: boolean;
};

export type Policy = {
    id: string;
    category: string;
    version: number;
    settings: Settings;
    published_at?: string;
};

export type Registration = {
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

export type Application = {
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

export type Reference = {
    id: string;
    reference: string;
    source: string;
    amount: string;
    status: string;
    payer_type: string;
};

export type TemplateItem = {
    id: string;
    category: string;
    kind: string;
    original_name: string;
    updated_at?: string;
};

export type PaymentProof = {
    id: string;
    kode_transaksi: string;
    nominal: string;
    mahasiswa: { user: { nama: string } };
};

export type InvoiceGroupItem = {
    id: string;
    nomor: string;
    sent_at?: string;
    delivery_status?: string;
    residence_application_id?: string;
};

export type PublicStay = {
    id: string;
    stay_kind: string;
    starts_at: string;
    ends_at: string;
    ended_at?: string | null;
    checked_in_at?: string | null;
    keys_returned_at?: string | null;
    status: string;
    student_profile?: { user?: { nama: string; nim_nip: string } };
    reserved_room?: Room | null;
    placement?: { status: string; kamar?: Room } | null;
    tagihan?: Invoice | null;
};

export type WorkflowProps = {
    studentView?: boolean;
    detailMode?: boolean;
    section?: string;
    filters?: {
        search?: string;
        status?: string;
        category?: string;
    };
    pendingRoomContracts?: Registration[];
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
    programs: Program[];
    buildings: Building[];
    masterHousingUrl: string | null;
    policyCatalog: Record<
        string,
        Array<{ id: string; name: string; rates: Rate[]; issue: string | null }>
    >;
    rooms: Room[];
    policies: Policy[];
    templates?: TemplateItem[];
    applications: Application[];
    reconciliations: Reference[];
    invoices: Invoice[];
    paymentProofs: PaymentProof[];
    invoiceGroups: InvoiceGroupItem[];
    publicStays?: PublicStay[];
};

export const CATEGORY_LABELS: Record<string, string> = {
    local_non_kipk: 'Lokal non-KIP-K',
    local_kipk: 'Lokal KIP-K',
    international: 'Internasional / S2 / S3',
    postgraduate: 'S2 / S3 mandiri',
    summer_course: 'Summer Course',
    non_student: 'Penyewa Umum',
};

export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
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

export const DECISION_LABELS: Record<string, string> = {
    full: 'Bayar penuh',
    installment: 'Cicilan',
    defer: 'Penundaan pembayaran',
    monthly: 'Persetujuan bulanan',
    transfer_permission: 'Izin berdasarkan bukti transfer',
};

export const STANDARD_DOC_KINDS: Array<{ key: string; label: string }> = [
    { key: 'perjanjian', label: 'Surat Perjanjian Hunian' },
    { key: 'ktp', label: 'KTP / Identitas Resmi' },
    { key: 'pernyataan_ortu', label: 'Surat Pernyataan Orang Tua / Wali' },
    { key: 'kipk_rekomendasi', label: 'Bukti KIP-K / Rekomendasi' },
    { key: 'pas_foto', label: 'Pas Foto Formal' },
];

export function formatDocumentLabel(kind: string): string {
    const matched = STANDARD_DOC_KINDS.find((item) => item.key === kind);
    if (matched) {
        return matched.label;
    }
    if (kind.startsWith('pembiayaan_')) {
        return 'Perjanjian Pembiayaan / Cicilan';
    }
    return kind
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function newReference(): string {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (digit) =>
        (
            Number(digit) ^
            (crypto.getRandomValues(new Uint8Array(1))[0] &
                (15 >> (Number(digit) / 4)))
        ).toString(16),
    );
}
