export type GpsPosition = {
    latitude: number;
    longitude: number;
    accuracy_meters: number;
};

/** Give GPS time to improve an initial coarse network location. */
export function locateForAttendance(
    targetAccuracy: number,
): Promise<GpsPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(
                new Error(
                    'GPS tidak tersedia. Gunakan HTTPS atau localhost dan izinkan lokasi perangkat.',
                ),
            );
            return;
        }
        let best: GpsPosition | null = null;
        let watchId: number | undefined;
        let finished = false;
        const finish = (error?: string) => {
            if (finished) return;
            finished = true;
            window.clearTimeout(timer);
            if (watchId !== undefined)
                navigator.geolocation.clearWatch(watchId);
            if (best) resolve(best);
            else
                reject(
                    new Error(
                        error ??
                            'Lokasi belum diperoleh. Aktifkan lokasi presisi atau coba perangkat dengan GPS.',
                    ),
                );
        };
        const timer = window.setTimeout(() => finish(), 12000);
        watchId = navigator.geolocation.watchPosition(
            ({ coords }) => {
                if (!Number.isFinite(coords.accuracy) || coords.accuracy < 0)
                    return;
                if (!best || coords.accuracy < best.accuracy_meters) {
                    best = {
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        accuracy_meters: coords.accuracy,
                    };
                }
                if (best.accuracy_meters <= targetAccuracy) finish();
            },
            (error) => {
                if (error.code === 1)
                    finish(
                        'Izin lokasi ditolak. Izinkan lokasi presisi pada browser dan perangkat.',
                    );
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
        );
        if (finished && watchId !== undefined)
            navigator.geolocation.clearWatch(watchId);
    });
}
