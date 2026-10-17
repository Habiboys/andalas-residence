import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import PerizinanPanel from './PerizinanPanel';

it('explains the monthly allowance and offers medical leave with mandatory evidence and review', () => {
    const html = renderToStaticMarkup(<PerizinanPanel canSubmit />);
    expect(html).toContain('maksimal 6 hari per bulan');
    expect(html).toContain('Tanggal mulai dan kembali ikut dihitung');
    expect(html).toContain('Sakit tidak mengurangi kuota');
    expect(html).toContain('<option value="sakit">Sakit</option>');
    expect(html).not.toContain('pengajuan sebelumnya lebih dari 6');
});

it('does not block new applications after an approved medical leave period has ended', () => {
    const html = renderToStaticMarkup(
        <PerizinanPanel
            canSubmit
            perizinan={[
                {
                    id: 'medical',
                    jenis: 'sakit',
                    status: 'disetujui',
                    tanggal_mulai: '2000-01-01',
                    tanggal_kembali: '2000-01-02',
                    alasan: 'Sakit',
                    tujuan_alamat: '',
                },
            ]}
        />,
    );
    expect(html).toContain('Ajukan izin baru');
    expect(html).toContain('Disetujui');
    expect(html).not.toContain('Masih ada izin yang berjalan');
});
