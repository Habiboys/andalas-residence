import { expect, it } from 'vite-plus/test';
import { parseAttendanceQr } from './attendance-qr';

const origin = 'https://residence.test';
const path = '/mahasiswa/absensi';
const sessionId = '11111111-2222-4333-8444-555555555555';
const query = '?session_id=' + sessionId + '&token=valid-token';

it('reads a residence attendance QR without navigating to arbitrary content', () => {
    expect(parseAttendanceQr(origin + path + query, origin, path)).toEqual({
        sessionId,
        token: 'valid-token',
    });
});
it('rejects other websites, other routes, missing tokens and invalid session identifiers', () => {
    expect(
        parseAttendanceQr('https://other.test' + path + query, origin, path),
    ).toBeNull();
    expect(
        parseAttendanceQr(origin + '/login' + query, origin, path),
    ).toBeNull();
    expect(
        parseAttendanceQr(
            origin + path + '?session_id=' + sessionId,
            origin,
            path,
        ),
    ).toBeNull();
    expect(
        parseAttendanceQr(
            origin + path + '?session_id=bad&token=valid',
            origin,
            path,
        ),
    ).toBeNull();
    expect(parseAttendanceQr('javascript:alert(1)', origin, path)).toBeNull();
});
