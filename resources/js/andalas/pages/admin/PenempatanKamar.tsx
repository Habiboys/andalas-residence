import { useState } from "react";
import { Link } from "@inertiajs/react";
import {
    PageHeader,
    Card,
    Table,
    StatusBadge,
    Modal,
    RowActions,
} from "../../components/ui";
import {
    PaymentStatusBadge,
    type ResidentPayment,
} from "../../components/atoms/PaymentStatusBadge";
import { formatDate } from "../../lib/format";
import { registrationReview as adminReview } from "@/routes/admin";
import { registrationReview as layananReview } from "@/routes/admin_layanan";

type Placement = {
    id: string;
    status: string;
    tanggal_mulai?: string | null;
    tanggal_selesai?: string | null;
    mahasiswa?: {
        user?: {
            nama: string;
            nim_nip: string;
            email?: string | null;
            no_hp?: string | null;
        };
        prodi?: { name?: string } | null;
        angkatan?: number | string | null;
        status_huni: string;
        tanggal_masuk?: string | null;
        pembayaran?: ResidentPayment[];
    };
    kamar?: {
        nomor_kamar: string;
        lantai?: { gedung?: { nama_gedung: string } };
    };
};

function DetailRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 py-1.5">
            <dt className="shrink-0 text-muted">{label}</dt>
            <dd className="text-right font-medium">{children}</dd>
        </div>
    );
}

export default function PenempatanKamar({
    penempatan = [],
    role,
}: {
    penempatan?: Placement[];
    role?: string;
}) {
    const [selected, setSelected] = useState<Placement | null>(null);

    return (
        <div className="space-y-4">
            <PageHeader
                title="Penempatan Kamar"
                subtitle="Riwayat penempatan dari pendaftaran asrama."
            />
            <Card className="space-y-2 p-5">
                <p>
                    Tempatkan calon penghuni melalui review pendaftaran agar
                    kamar, tagihan, dan status hunian tetap terhubung.
                </p>
                <Link
                    className="link link-primary"
                    href={(role === "admin_layanan"
                        ? layananReview
                        : adminReview
                    ).url()}
                >
                    Buka review pendaftaran
                </Link>
            </Card>
            <Card>
                <Table
                    columns={[
                        {
                            key: "student",
                            label: "Penghuni",
                            render: (row: Placement) =>
                                row.mahasiswa?.user?.nama ?? "-",
                        },
                        {
                            key: "identity",
                            label: "NIM / identitas",
                            render: (row: Placement) =>
                                row.mahasiswa?.user?.nim_nip ?? "-",
                        },
                        {
                            key: "room",
                            label: "Gedung / kamar",
                            render: (row: Placement) =>
                                [
                                    row.kamar?.lantai?.gedung?.nama_gedung,
                                    row.kamar?.nomor_kamar,
                                ]
                                    .filter(Boolean)
                                    .join(" / "),
                        },
                        {
                            key: "status",
                            label: "Penempatan",
                            render: (row: Placement) => (
                                <StatusBadge status={row.status} />
                            ),
                        },
                        {
                            key: "occupancy",
                            label: "Status penghuni",
                            render: (row: Placement) => (
                                <StatusBadge
                                    status={row.mahasiswa?.status_huni ?? ""}
                                />
                            ),
                        },
                        {
                            key: "aksi",
                            label: "Aksi",
                            render: (row: Placement) => (
                                <RowActions onDetail={() => setSelected(row)} />
                            ),
                        },
                    ]}
                    data={penempatan}
                    emptyMessage="Belum ada penempatan kamar."
                />
            </Card>

            <Modal
                open={!!selected}
                onClose={() => setSelected(null)}
                title={
                    selected?.mahasiswa?.user?.nama
                        ? `Detail Penempatan ${selected.mahasiswa.user.nama}`
                        : "Detail Penempatan"
                }
            >
                {selected && (
                    <div className="space-y-5 text-sm">
                        <section>
                            <h3 className="mb-1 font-medium">Penempatan</h3>
                            <dl>
                                <DetailRow label="Status">
                                    <StatusBadge status={selected.status} />
                                </DetailRow>
                                <DetailRow label="Gedung / kamar">
                                    {[
                                        selected.kamar?.lantai?.gedung
                                            ?.nama_gedung,
                                        selected.kamar?.nomor_kamar,
                                    ]
                                        .filter(Boolean)
                                        .join(" / ") || "-"}
                                </DetailRow>
                                <DetailRow label="Periode huni">
                                    {formatDate(selected.tanggal_mulai)}
                                    {" – "}
                                    {formatDate(selected.tanggal_selesai)}
                                </DetailRow>
                            </dl>
                        </section>

                        <section>
                            <h3 className="mb-1 font-medium">Penghuni</h3>
                            <dl>
                                <DetailRow label="Nama">
                                    {selected.mahasiswa?.user?.nama ?? "-"}
                                </DetailRow>
                                <DetailRow label="NIM">
                                    {selected.mahasiswa?.user?.nim_nip ?? "-"}
                                </DetailRow>
                                <DetailRow label="Prodi">
                                    {selected.mahasiswa?.prodi?.name ?? "-"}
                                </DetailRow>
                                <DetailRow label="Angkatan">
                                    {selected.mahasiswa?.angkatan ?? "-"}
                                </DetailRow>
                                <DetailRow label="No. HP">
                                    {selected.mahasiswa?.user?.no_hp || "-"}
                                </DetailRow>
                                <DetailRow label="Email">
                                    {selected.mahasiswa?.user?.email || "-"}
                                </DetailRow>
                                <DetailRow label="Masuk asrama">
                                    {formatDate(
                                        selected.mahasiswa?.tanggal_masuk,
                                    )}
                                </DetailRow>
                                <DetailRow label="Status huni">
                                    <StatusBadge
                                        status={
                                            selected.mahasiswa?.status_huni ??
                                            ""
                                        }
                                    />
                                </DetailRow>
                                <DetailRow label="Pembayaran">
                                    <PaymentStatusBadge
                                        pembayaran={
                                            selected.mahasiswa?.pembayaran
                                        }
                                    />
                                </DetailRow>
                            </dl>
                        </section>
                    </div>
                )}
            </Modal>
        </div>
    );
}
