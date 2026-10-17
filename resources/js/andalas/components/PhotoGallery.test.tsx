import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';
import {
    PhotoCarousel,
    PhotoEditor,
    photoFields,
    photoPaths,
    reorderPhotos,
} from './PhotoGallery';
import RoomPhotoEditor from './RoomPhotoEditor';

describe('photo galleries', () => {
    it('keeps legacy photos and respects an explicitly empty gallery', () => {
        expect(photoPaths({ foto: 'gedung/old.jpg' })).toEqual([
            'gedung/old.jpg',
        ]);
        expect(photoPaths({ foto: 'gedung/old.jpg', photos: [] })).toEqual([]);
        expect(
            photoPaths({ foto: 'gedung/old.jpg', photos: ['gedung/new.jpg'] }),
        ).toEqual(['gedung/new.jpg']);
    });
    it('reorders a mixed gallery without losing the association between upload indices and files', () => {
        const first = new File(['a'], 'first.jpg', { type: 'image/jpeg' });
        const cover = new File(['b'], 'cover.jpg', { type: 'image/jpeg' });
        const value = {
            ...photoFields(['gedung/old.jpg']),
            photos: [first, cover],
            photo_order: ['gedung/old.jpg', 'new:0', 'new:1'],
        };
        const changed = reorderPhotos(value, 2, 0);
        expect(changed.photos).toEqual([cover, first]);
        expect(changed.photo_order).toEqual([
            'new:0',
            'gedung/old.jpg',
            'new:1',
        ]);
        expect(changed.retained_photos).toEqual(['gedung/old.jpg']);
        expect(value.photos).toEqual([first, cover]);
        expect(reorderPhotos(value, 0, -1)).toBe(value);
    });
    it('provides multiple upload and clearly identifies the first photo as cover', () => {
        const html = renderToStaticMarkup(
            <PhotoEditor
                value={photoFields(['gedung/one.jpg', 'gedung/two.jpg'])}
                onChange={() => {}}
            />,
        );
        expect(html).toContain('multiple=""');
        expect(html).toContain('Cover');
        expect(html).toContain('aria-label="Geser foto 2 ke kiri"');
        expect(html).toContain('aria-label="Hapus foto 1"');
        expect(html).toContain('/storage/gedung/two.jpg');
    });
    it('renders a large cover with navigation thumbnails and an autoplay pause control', () => {
        const html = renderToStaticMarkup(
            <PhotoCarousel
                photos={['kamar/cover.jpg', 'kamar/inside.jpg']}
                title="Kamar 101"
            />,
        );
        expect(html).toContain('aria-roledescription="carousel"');
        expect(html).toContain('alt="Kamar 101, foto 1"');
        expect(html).toContain('aria-label="Foto berikutnya"');
        expect(html).toContain('aria-label="Jeda slideshow"');
        expect(html).toContain('aria-label="Tampilkan foto 2"');
    });
    it('does not show slideshow controls for one photo or no photos', () => {
        expect(
            renderToStaticMarkup(
                <PhotoCarousel photos={[]} title="Gedung A" />,
            ),
        ).toContain('Belum ada foto');
        expect(
            renderToStaticMarkup(
                <PhotoCarousel photos={['gedung/one.jpg']} title="Gedung A" />,
            ),
        ).not.toContain('Jeda slideshow');
    });
    it('keeps room photo inputs hidden until the edit action is selected', () => {
        const html = renderToStaticMarkup(
            <RoomPhotoEditor
                room={{ id: 'room-1', photos: ['kamar/one.jpg'] }}
            />,
        );
        expect(html).toContain('aria-label="Edit foto kamar"');
        expect(html).not.toContain('type="file"');
    });
});
