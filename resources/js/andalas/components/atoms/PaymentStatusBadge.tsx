import { formatRupiah } from '../../lib/format';
import { Badge, StatusBadge } from './Badge';

export type ResidentPayment = {
    status: string;
    nominal?: string | number;
    tanggal_bayar?: string | null;
    jenis_pembayaran?: string;
    termin_ke?: number | null;
};

export function latestPayment(
    pembayaran?: ResidentPayment[] | null,
): ResidentPayment | undefined {
    const paid = (pembayaran ?? []).filter((p) => p.tanggal_bayar);
    paid.sort((a, b) => (a.tanggal_bayar! < b.tanggal_bayar! ? 1 : -1));

    return paid[0] ?? pembayaran?.[0];
}

export type ResidenceInvoice = {
    status: string;
    total: string | number;
    total_dibayar: string | number;
    sponsor_total?: string | number;
};
export type ImportPaymentConfirmation = {
    status: string;
    source?: string;
    reconciliation_status: string;
};
export type PlacementPayment = {
    import_payment_confirmation?: ImportPaymentConfirmation | null;
    registration?: { tagihan?: ResidenceInvoice | null } | null;
};

export function PaymentStatusBadge({
    pembayaran,
    invoice,
    confirmation,
}: {
    pembayaran?: ResidentPayment[] | null;
    invoice?: ResidenceInvoice | null;
    confirmation?: ImportPaymentConfirmation | null;
}) {
    if (invoice) {
        const total = Number(invoice.total);
        const paid = Number(invoice.total_dibayar);
        const remaining = Math.max(0, total - paid);
        if (invoice.status === 'batal')
            return <Badge>Tagihan dibatalkan</Badge>;
        if (invoice.status === 'draft')
            return <Badge>Tagihan belum diterbitkan</Badge>;
        if (total <= 0)
            return (
                <Badge color="green">
                    {Number(invoice.sponsor_total ?? 0) > 0
                        ? 'Ditanggung sponsor'
                        : 'Tidak ada kewajiban bayar'}
                </Badge>
            );
        return (
            <span className="inline-flex flex-wrap items-center gap-2">
                <Badge
                    color={
                        remaining < 0.005
                            ? 'green'
                            : paid > 0
                              ? 'yellow'
                              : 'gray'
                    }
                >
                    {remaining < 0.005
                        ? 'Lunas'
                        : paid > 0
                          ? 'Dibayar sebagian'
                          : 'Belum dibayar'}
                </Badge>
                {remaining >= 0.005 && (
                    <span className="text-muted text-xs">
                        Sisa {formatRupiah(remaining)}
                    </span>
                )}
            </span>
        );
    }
    if (confirmation?.status === 'confirmed_paid') {
        return (
            <span className="inline-flex flex-col gap-1">
                <Badge color="green">Sudah membayar - konfirmasi impor</Badge>
                {confirmation.reconciliation_status === 'pending' && (
                    <span className="text-muted text-xs">
                        Rincian transaksi belum direkonsiliasi
                    </span>
                )}
            </span>
        );
    }
    const latest = latestPayment(pembayaran);
    if (!latest) return <Badge>Belum ada tagihan</Badge>;
    return (
        <span className="inline-flex flex-wrap items-center gap-2">
            {latest.status === 'lunas' ? (
                <Badge color="blue">Pembayaran tercatat</Badge>
            ) : (
                <StatusBadge status={latest.status} />
            )}
            {latest.nominal != null && String(latest.nominal) !== '' && (
                <span className="text-identifier text-muted text-xs">
                    {formatRupiah(Number(latest.nominal))}
                </span>
            )}
        </span>
    );
}
