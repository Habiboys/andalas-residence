import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Props = {
    latitude: number;
    longitude: number;
    radius: number;
    accuracy?: number;
};

export default function AttendanceMap({
    latitude,
    longitude,
    radius,
    accuracy,
}: Props) {
    const container = useRef<HTMLDivElement>(null);
    const [error, setError] = useState('');
    useEffect(() => {
        if (!container.current) return;
        const element = container.current;
        let cancelled = false;
        let map: LeafletMap | undefined;
        let resize: ResizeObserver | undefined;
        setError('');
        void import('leaflet')
            .then((L) => {
                if (cancelled) return;
                map = L.map(element, { scrollWheelZoom: false }).setView(
                    [latitude, longitude],
                    17,
                );
                const currentMap = map;
                const boundary = L.circle([latitude, longitude], {
                    radius: Math.max(1, radius),
                    color: 'var(--color-primary)',
                    weight: 2,
                    fillOpacity: 0.09,
                }).addTo(map);
                const bounds = boundary.getBounds();
                if (accuracy !== undefined && Number.isFinite(accuracy)) {
                    const uncertainty = L.circle([latitude, longitude], {
                        radius: accuracy,
                        color: 'var(--color-warning)',
                        dashArray: '5 5',
                        weight: 2,
                        fillOpacity: 0.05,
                    }).addTo(map);
                    bounds.extend(uncertainty.getBounds());
                }
                L.circleMarker([latitude, longitude], {
                    radius: 6,
                    color: 'white',
                    weight: 2,
                    fillColor: 'var(--color-info)',
                    fillOpacity: 1,
                })
                    .addTo(map)
                    .bindTooltip('Titik GPS perangkat');
                map.fitBounds(bounds.pad(0.3), { maxZoom: 18 });
                resize = new ResizeObserver(() => currentMap.invalidateSize());
                resize.observe(element);
                const google = L.tileLayer(
                    'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
                    {
                        maxZoom: 20,
                        attribution:
                            '&copy; <a href="https://maps.google.com/">Google Maps</a>',
                    },
                ).addTo(map);
                google.once('tileerror', () => {
                    if (cancelled) return;
                    currentMap.removeLayer(google);
                    L.tileLayer(
                        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        {
                            maxZoom: 19,
                            attribution:
                                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                        },
                    )
                        .addTo(currentMap)
                        .once('tileerror', () => {
                            if (!cancelled)
                                setError(
                                    'Peta belum dapat dimuat. Periksa koneksi internet. Lokasi GPS tetap digunakan.',
                                );
                        });
                    setError(
                        'Layer Google Maps tidak tersedia; menampilkan OpenStreetMap.',
                    );
                });
            })
            .catch(() => {
                if (!cancelled)
                    setError(
                        'Peta belum dapat dimuat. Periksa koneksi internet.',
                    );
            });
        return () => {
            cancelled = true;
            resize?.disconnect();
            map?.remove();
        };
    }, [latitude, longitude, radius, accuracy]);
    return (
        <div className="space-y-2">
            <div
                ref={container}
                className="border-base-300 relative isolate z-0 h-64 w-full rounded-lg border"
                role="region"
                aria-label="Peta lokasi GPS dan radius absensi"
            />
            <p className="text-base-content/70 text-xs">
                Garis utuh: radius absensi {radius} m.{' '}
                {accuracy !== undefined &&
                    `Garis putus-putus: perkiraan akurasi GPS ±${Math.round(accuracy)} m.`}{' '}
                Titik lokasi mengikuti GPS.
            </p>
            {error && (
                <p role="status" className="text-warning text-xs">
                    {error}
                </p>
            )}
        </div>
    );
}
