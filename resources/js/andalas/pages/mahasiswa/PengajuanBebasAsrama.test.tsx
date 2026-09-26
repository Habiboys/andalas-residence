import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import PengajuanBebasAsrama from './PengajuanBebasAsrama';
it('explains automatic classification without asking the user to select residence history', () => {
    const html = renderToStaticMarkup(
        <PengajuanBebasAsrama initialUser={{ angkatan: '2025' }} />,
    );
    expect(html).toContain('Jenis surat ditentukan otomatis');
    expect(html).toContain('Surat Keterangan Tidak Tinggal di Asrama');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('type="file"');
});
it('offers historical evidence only when allowed by the server', () => {
    const html = renderToStaticMarkup(
        <PengajuanBebasAsrama
            historical_evidence_allowed
            initialUser={{ residence_state: 'alumni' }}
        />,
    );
    expect(html).toContain('Anda terdata sebagai alumni');
    expect(html).toContain('Bukti pembayaran');
    expect(html).toContain('Rekening koran');
    expect(html).not.toContain('<select');
});
it('links unpaid applications to billing', () => {
    const html = renderToStaticMarkup(
        <PengajuanBebasAsrama
            bebas_asrama={[
                {
                    id: 'one',
                    nomor_pengajuan: 'BA-1',
                    status: 'diverifikasi',
                    tagihan_id: 'invoice',
                },
            ]}
        />,
    );
    expect(html).toContain('Lihat tagihan');
});
it('keeps the letter pending until a PDF exists', () => {
    for (const file of [undefined, 'letters/one.pdf']) {
        const html = renderToStaticMarkup(
            <PengajuanBebasAsrama
                bebas_asrama={[
                    {
                        id: 'one',
                        nomor_pengajuan: 'BA-1',
                        status: 'disetujui',
                        file_surat_path: file,
                    },
                ]}
            />,
        );
        expect(html.includes('Unduh surat')).toBe(Boolean(file));
        expect(html.includes('Surat sedang disiapkan')).toBe(!file);
    }
});
it('blocks active residents from applying for a letter', () => {
    const html = renderToStaticMarkup(
        <PengajuanBebasAsrama initialUser={{ residence_state: 'hunian' }} />,
    );
    expect(html).toContain('Selesaikan check-out');
    expect(html).not.toContain('<form');
});
