import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vite-plus/test";
import { RoomDetailModal } from "./RoomGridMap";

it("opens the room detail with assets, residents and their payment status", () => {
    const html = renderToStaticMarkup(
        <RoomDetailModal
            onClose={() => {}}
            room={{
                id: "room-1",
                nomor_kamar: "101",
                kapasitas: 2,
                status: "terisi_sebagian",
                aset: [
                    {
                        id: "a1",
                        nama_aset: "Meja Belajar",
                        kode_inventaris: "INV-MJR-01",
                        jumlah: 1,
                        kondisi: "baik",
                    },
                ],
                penempatan_kamar: [
                    {
                        mahasiswa: {
                            user: { nama: "Siti A", nim_nip: "2599000001" },
                            prodi: { name: "Teknik Informatika" },
                            angkatan: "2025",
                            status_huni: "aktif",
                            tanggal_masuk: "2026-08-01",
                            pembayaran: [{ status: "lunas", nominal: 900000 }],
                        },
                    },
                ],
            }}
        />,
    );

    for (const text of [
        "Detail Kamar 101",
        "Aset Kamar",
        "Meja Belajar",
        "INV-MJR-01",
        "Siti A",
        "2599000001",
        "Teknik Informatika",
        "Angkatan 2025",
        "Terverifikasi",
        "900.000",
    ]) {
        expect(html).toContain(text);
    }
});

it("shows an empty state when the room has no assets or residents yet", () => {
    const html = renderToStaticMarkup(
        <RoomDetailModal
            onClose={() => {}}
            room={{
                id: "room-2",
                nomor_kamar: "202",
                kapasitas: 2,
                status: "kosong",
            }}
        />,
    );

    expect(html).toContain("Belum ada aset terdaftar di kamar ini.");
    expect(html).toContain("Kamar ini belum berpenghuni.");
});
