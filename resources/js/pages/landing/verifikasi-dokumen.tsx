import { Head, Link } from '@inertiajs/react';
import { BadgeCheck, FileWarning } from 'lucide-react';

type Document = {
    nomor: string;
    jenis: string;
    nama: string;
    nim: string;
    fakultas: string;
    program: string;
    status: string;
    tanggal_terbit: string;
    penandatangan: string;
    nip_penandatangan: string;
    template: string;
    checksum: string;
};

type Props = {
    valid: boolean;
    document: Document | null;
    reason: string | null;
};

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className="border-base-300 bg-base-200/60 rounded-field min-w-0 px-3 py-2">
            <dt className="text-base-content/60 text-[11px] leading-snug font-medium">
                {label}
            </dt>
            <dd className="mt-0.5 text-sm break-words font-medium">
                {value || '-'}
            </dd>
        </div>
    );
}

export default function VerifikasiDokumen({ valid, document, reason }: Props) {
    return (
        <div className="bg-base-200 min-h-screen">
            <Head title="Verifikasi Dokumen" />

            <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-16">
                <div className="mb-6 flex flex-col items-center gap-3 text-center">
                    <img
                        src="/images/unand.png"
                        alt="Universitas Andalas"
                        className="h-16 w-auto"
                    />
                    <div>
                        <h1 className="text-xl font-semibold">
                            Verifikasi Dokumen Andalas Residence
                        </h1>
                        <p className="text-base-content/60 text-sm">
                            Pindai QR code pada surat untuk memastikan keaslian
                            dokumen.
                        </p>
                    </div>
                </div>

                <div className="bg-base-100 rounded-box border-base-300 border p-5">
                    {valid && document ? (
                        <>
                            <div className="text-success mb-4 flex items-center gap-2">
                                <BadgeCheck className="size-5" aria-hidden="true" />
                                <span className="font-semibold">
                                    Dokumen ini sah dan diterbitkan oleh
                                    Andalas Residence.
                                </span>
                            </div>

                            <h2 className="font-semibold">{document.jenis}</h2>
                            <p className="text-base-content/60 text-sm">
                                Nomor {document.nomor}
                            </p>

                            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                                <Field label="Nama" value={document.nama} />
                                <Field label="NIM" value={document.nim} />
                                <Field label="Fakultas" value={document.fakultas} />
                                <Field
                                    label="Program studi"
                                    value={document.program}
                                />
                                <Field
                                    label="Tanggal terbit"
                                    value={document.tanggal_terbit}
                                />
                                <Field
                                    label="Penandatangan"
                                    value={document.penandatangan}
                                />
                                <Field
                                    label="NIP penandatangan"
                                    value={document.nip_penandatangan}
                                />
                                <Field
                                    label="Kode dokumen"
                                    value={document.checksum}
                                />
                            </dl>
                        </>
                    ) : (
                        <div className="text-error flex items-start gap-2">
                            <FileWarning
                                className="mt-0.5 size-5 shrink-0"
                                aria-hidden="true"
                            />
                            <div>
                                <p className="font-semibold">
                                    Dokumen tidak dapat diverifikasi.
                                </p>
                                <p className="text-base-content/70 mt-1 text-sm">
                                    {reason}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-base-content/60 mt-6 text-center text-xs">
                    Halaman ini menampilkan data resmi dari sistem Andalas
                    Residence. Hubungi pengelola asrama bila menemukan
                    ketidaksesuaian.{' '}
                    <Link href="/" className="link">
                        Kembali ke beranda
                    </Link>
                </p>
            </div>
        </div>
    );
}
