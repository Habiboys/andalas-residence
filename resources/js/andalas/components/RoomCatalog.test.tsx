import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import RoomCatalog, { roomPrice, type CatalogRoom } from './RoomCatalog';
import RoomInvitations, { InviteRoommateButton } from './RoomInvitations';
import FloorAvailability from './FloorAvailability';
import RoomPhotoEditor from './RoomPhotoEditor';

const room: CatalogRoom = {
    id: 'room-1',
    nomor_kamar: '101',
    tipe_kamar: 'standar',
    tarif_per_periode: '2500000',
    foto: 'kamar/101.jpg',
    kapasitas: 2,
    available_places: 1,
    facilities: 'Dipan, Lemari',
    lantai: {
        id: 'floor-1',
        gedung_id: 'building-1',
        nama_lantai: 'Lantai 1',
        gedung: { nama_gedung: 'Gedung A' },
    },
};

it('shows hotel style room cards with photos facilities capacity price and selection', () => {
    const html = renderToStaticMarkup(
        <RoomCatalog
            rooms={[room]}
            rates={[]}
            selected={room.id}
            onSelect={() => {}}
            unit="year"
            basis="person"
        />,
    );
    for (const text of [
        'Kamar 101',
        'Dipan, Lemari',
        '/storage/kamar/101.jpg',
        'Gedung A',
        '1 tempat tersedia',
        'Kamar dipilih',
        'Filter gedung',
        'Filter tipe kamar',
        'Harga terendah',
    ])
        expect(html).toContain(text);
    expect(html).toContain('aria-pressed="true"');
});

it('does not offer whole room booking when another place is already occupied or reserved', () => {
    const html = renderToStaticMarkup(
        <RoomCatalog
            rooms={[room]}
            rates={[
                {
                    gedung_id: 'building-1',
                    tipe_kamar: 'standar',
                    unit: 'year',
                    amount: '2500000',
                    room_amount: '5000000',
                },
            ]}
            selected=""
            onSelect={() => {}}
            unit="year"
            basis="room"
        />,
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('Sewa seluruh kamar memerlukan kamar kosong.');
});

it('uses student daily rates and refuses missing whole room prices', () => {
    const rates = [
        {
            gedung_id: 'building-1',
            tipe_kamar: 'umum',
            unit: 'day',
            amount: '100000',
            student_amount: '75000',
        },
    ];
    expect(roomPrice(room, rates, 'day', 'person')).toBe(75000);
    expect(roomPrice(room, rates, 'day', 'person', false)).toBe(100000);
    expect(roomPrice(room, rates, 'year', 'room')).toBe(0);
    expect(roomPrice(room, [], 'month', 'person')).toBe(0);
});

it('offers roommate invitations through a closed modal rather than inline fields', () => {
    const html = renderToStaticMarkup(
        <InviteRoommateButton registrationId="registration-1" />,
    );
    expect(html).toContain('Ajak calon penghuni lain');
    expect(html).not.toContain('<input');
});

it('shows incoming invitations with explicit accept and reject actions', () => {
    const html = renderToStaticMarkup(
        <RoomInvitations
            invitations={[
                {
                    id: 'invite-1',
                    incoming: true,
                    status: 'pending',
                    expires_at: '2026-10-18T12:00:00+07:00',
                    sender_name: 'Teman',
                    invitee_name: 'Saya',
                    room_number: '101',
                    building_name: 'Gedung A',
                    floor_name: 'Lantai 1',
                    rate_unit: 'year',
                },
            ]}
        />,
    );
    expect(html).toContain('Dari Teman');
    expect(html).toContain('Terima undangan');
    expect(html).toContain('Tolak');
    expect(html).not.toContain('<input');
});

it('shows floor release status and priority without edit fields until requested', () => {
    const html = renderToStaticMarkup(
        <FloorAvailability
            floors={[
                {
                    id: 'floor-1',
                    nomor_lantai: 1,
                    nama_lantai: 'Lantai 1',
                    booking_open: false,
                    booking_priority: 2,
                },
            ]}
        />,
    );
    expect(html).toContain('Prioritas 2');
    expect(html).toContain('Ditutup untuk pilihan baru');
    expect(html).toContain('Atur lantai');
    expect(html).not.toContain('<input');
});

it('uses a submit action when saving room photos for the catalog', () => {
    const html = renderToStaticMarkup(
        <RoomPhotoEditor room={{ id: room.id, foto: room.foto }} initialOpen />,
    );
    expect(html).toMatch(/<button type="submit"[^>]*>Simpan foto<\/button>/);
});
