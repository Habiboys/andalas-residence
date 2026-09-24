import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vite-plus/test";
import { latestPayment, PaymentStatusBadge } from "./PaymentStatusBadge";

it("picks the most recent dated payment as the resident billing status", () => {
    const pembayaran = [
        { status: "ditolak", tanggal_bayar: "2026-08-01T00:00:00.000Z" },
        { status: "lunas", tanggal_bayar: "2026-09-01T00:00:00.000Z" },
    ];
    expect(latestPayment(pembayaran)?.status).toBe("lunas");
});

it("keeps a dated payment ahead of an undated one", () => {
    const pembayaran = [
        { status: "lunas", tanggal_bayar: "2026-09-01T00:00:00.000Z" },
        { status: "menunggu_verifikasi" },
    ];
    expect(latestPayment(pembayaran)?.status).toBe("lunas");
});

it("shows a fallback badge when the resident never paid", () => {
    const html = renderToStaticMarkup(<PaymentStatusBadge pembayaran={[]} />);
    expect(html).toContain("Belum bayar");
});

it("renders the mapped status and nominal of the latest payment", () => {
    const html = renderToStaticMarkup(
        <PaymentStatusBadge
            pembayaran={[
                {
                    status: "lunas",
                    nominal: 1500000,
                    tanggal_bayar: "2026-09-01T00:00:00.000Z",
                },
            ]}
        />,
    );
    expect(html).toContain("Terverifikasi");
    expect(html).toContain("1.500.000");
});
