import { formatRupiah, mapPaymentStatus } from "../../lib/format";
import { StatusBadge } from "./Badge";

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

/*
 * A resident may have several payments (sewa per period of a cicilan). Show the
 * most recent one so "lunas atau belum" is answerable at a glance; the nominal
 * makes the badge meaningful without opening the payment page.
 */
export function PaymentStatusBadge({
    pembayaran,
}: {
    pembayaran?: ResidentPayment[] | null;
}) {
    const latest = latestPayment(pembayaran);
    if (!latest) {
        return (
            <span className="badge badge-sm font-medium badge-neutral">
                Belum bayar
            </span>
        );
    }

    return (
        <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={mapPaymentStatus(latest.status)} />
            {latest.nominal != null && String(latest.nominal) !== "" && (
                <span className="text-identifier text-xs text-muted">
                    {formatRupiah(Number(latest.nominal))}
                </span>
            )}
        </span>
    );
}
