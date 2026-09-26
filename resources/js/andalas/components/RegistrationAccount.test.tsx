import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import Register from '@/pages/auth/register';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
}));

it('creates an account without assuming the visitor is registering for a room', () => {
    const html = renderToStaticMarkup(<Register />);
    expect(html).toContain('Daftar akun');
    expect(html).toContain('pengurusan surat bebas asrama');
    expect(html).not.toContain('Tahapan pendaftaran');
    expect(html).not.toContain('Langkah 1');
    expect(html).not.toContain('Penghuni aktif');
    expect(html).toContain('Jenis pendaftar');
    expect(html).toContain('Nonmahasiswa');
    expect(html).toContain('value="local_student"');
    expect(html).not.toContain('value="local_kipk"');
    expect(html).not.toContain('value="international_free_facility"');
});
