import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import ResidenceMarketplace, {
    type ResidenceListing,
} from './ResidenceMarketplace';

const building: ResidenceListing = {
    id: 'one',
    name: 'Gedung Andalas',
    code: 'A',
    gender: 'perempuan',
    address: 'Limau Manis',
    description: 'Hunian kampus',
    image: null,
    floors: 2,
    rooms: 10,
    types: [
        {
            type: 'standar',
            rooms: 10,
            capacity: 2,
            facilities: 'Meja belajar, lemari',
        },
    ],
    offers: [
        {
            category: 'local_non_kipk',
            type: 'standar',
            unit: 'year',
            amount: 1500000,
            places: 3,
        },
    ],
};

it('shows comparable annual prices, available places and room facilities', () => {
    const html = renderToStaticMarkup(
        <ResidenceMarketplace listings={[building]} />,
    );
    expect(html).toContain('1.500.000');
    expect(html).toContain('3 tempat tersedia');
    expect(html).toContain('Meja belajar, lemari');
    expect(html).toContain('Hunian putri');
    expect(html).toContain('Kategori penghuni');
    expect(html).toContain('Bandingkan tarif per');
});
it('does not claim availability or fabricate a price for an unopened category', () => {
    const html = renderToStaticMarkup(
        <ResidenceMarketplace listings={[{ ...building, offers: [] }]} />,
    );
    expect(html).toContain('Pendaftaran belum dibuka');
    expect(html).toContain('Menunggu publikasi pengelola');
    expect(html).not.toContain('Rp0');
    expect(html).not.toContain('3 tempat tersedia');
});
it('offers a useful empty state without invented listings', () => {
    const html = renderToStaticMarkup(<ResidenceMarketplace />);
    expect(html).toContain('Belum ada hunian yang cocok');
    expect(html).toContain('Reset pencarian');
});
