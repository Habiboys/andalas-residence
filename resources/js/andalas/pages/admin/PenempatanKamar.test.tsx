import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vite-plus/test";
import PenempatanKamar from "./PenempatanKamar";

it("lists placements and exposes a detail action per row", () => {
    const html = renderToStaticMarkup(
        <PenempatanKamar
            penempatan={[
                {
                    id: "one",
                    status: "aktif",
                    tanggal_mulai: "2026-08-01",
                    tanggal_selesai: null,
                    mahasiswa: {
                        user: { nama: "Mahasiswa Satu", nim_nip: "2599000001" },
                        status_huni: "aktif",
                        pembayaran: [{ status: "lunas", nominal: 1500000 }],
                    },
                    kamar: {
                        nomor_kamar: "101",
                        lantai: { gedung: { nama_gedung: "Gedung Asrama" } },
                    },
                },
            ]}
        />,
    );

    for (const text of [
        "Mahasiswa Satu",
        "2599000001",
        "Gedung Asrama / 101",
        "Lihat detail",
    ]) {
        expect(html).toContain(text);
    }
});
