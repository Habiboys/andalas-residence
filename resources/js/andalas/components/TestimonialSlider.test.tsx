import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import TestimonialSlider, { type Testimoni } from './TestimonialSlider';

const stories: Testimoni[] = Array.from({ length: 4 }, (_, index) => ({
    id: String(index),
    nama: `Penghuni ${index + 1}`,
    teks: `Cerita penghuni nomor ${index + 1}`,
    prodi: null,
    foto: null,
}));

it('includes every published story and offers a pause control', () => {
    const html = renderToStaticMarkup(<TestimonialSlider items={stories} />);

    for (const story of stories) {
        expect(html).toContain(story.teks);
        expect(html).toContain(story.nama);
    }
    expect(html).toContain('Jeda geser');
    expect(html).toContain('aria-hidden="true"');
});

it('hides an empty section and shows a single story without a redundant pause control', () => {
    expect(renderToStaticMarkup(<TestimonialSlider items={[]} />)).toBe('');

    const html = renderToStaticMarkup(
        <TestimonialSlider items={[stories[0]]} />,
    );
    expect(html).toContain(stories[0].teks);
    expect(html).not.toContain('Jeda geser');
    expect(html.split(stories[0].teks)).toHaveLength(2);
});
