export function parseAttendanceQr(
    value: string,
    origin: string,
    expectedPath: string,
): { sessionId: string; token: string } | null {
    try {
        const url = new URL(value, origin);
        const sessionId = url.searchParams.get('session_id');
        const token = url.searchParams.get('token');
        if (
            url.origin !== origin ||
            url.pathname !== expectedPath ||
            !sessionId ||
            !token ||
            token.length > 512 ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                sessionId,
            )
        )
            return null;
        return { sessionId, token };
    } catch {
        return null;
    }
}
