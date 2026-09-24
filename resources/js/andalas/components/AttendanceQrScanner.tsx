import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Link2, QrCode } from 'lucide-react';
import { absensi } from '@/routes/mahasiswa';
import { parseAttendanceQr } from '../lib/attendance-qr';

type Detector = { detect: (video: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };
type DetectorConstructor = { new (options: { formats: string[] }): Detector; getSupportedFormats: () => Promise<string[]> };

export default function AttendanceQrScanner({ onRead }: { onRead: (value: { sessionId: string; token: string }) => void }) {
    const video = useRef<HTMLVideoElement>(null);
    const stream = useRef<MediaStream | null>(null);
    const stopped = useRef(true);
    const mounted = useRef(true);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [running, setRunning] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [link, setLink] = useState('');

    function stop() {
        stopped.current = true;
        if (timer.current) clearTimeout(timer.current);
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        if (mounted.current) { setRunning(false); setBusy(false); }
    }

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; stopped.current = true; if (timer.current) clearTimeout(timer.current); stream.current?.getTracks().forEach((track) => track.stop()); };
    }, []);

    function accept(value: string) {
        const parsed = parseAttendanceQr(value, window.location.origin, absensi.url());
        if (!parsed) { setError('QR tidak dikenali. Gunakan QR absensi kegiatan dari fasilitator.'); return false; }
        stop(); setError(''); onRead(parsed); return true;
    }

    async function start() {
        setError('');
        const BarcodeDetector = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            setError('Kamera memerlukan HTTPS atau localhost. Anda juga dapat memindai melalui kamera ponsel dan membuka tautan QR.');
            return;
        }
        if (!BarcodeDetector) {
            setError('Pemindai langsung belum didukung browser ini. Gunakan kamera bawaan ponsel untuk membuka QR, atau tempel tautannya di bawah.');
            return;
        }
        setBusy(true); stopped.current = false;
        try {
            if (!(await BarcodeDetector.getSupportedFormats()).includes('qr_code')) throw new Error('unsupported');
            if (stopped.current || !mounted.current) return;
            const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
            if (!mounted.current || stopped.current) { media.getTracks().forEach((track) => track.stop()); return; }
            stream.current = media;
            if (!video.current) { stop(); return; }
            video.current.srcObject = media;
            await video.current.play();
            if (stopped.current || !mounted.current) return;
            setRunning(true); setBusy(false);
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            async function scan() {
                if (stopped.current || !video.current) return;
                try {
                    const codes = await detector.detect(video.current);
                    if (stopped.current || !mounted.current) return;
                    if (codes[0] && accept(codes[0].rawValue)) return;
                } catch { /* The next video frame may be readable. */ }
                if (!stopped.current) timer.current = setTimeout(scan, 400);
            }
            void scan();
        } catch {
            stop();
            if (mounted.current) setError('Kamera tidak dapat dibuka. Periksa izin kamera, atau gunakan kamera ponsel dan tempel tautan QR di bawah.');
        }
    }

    return <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-base-200/50 p-5">
            <video ref={video} playsInline muted className={running || busy ? 'mx-auto aspect-square max-h-80 w-full rounded-xl bg-black object-cover' : 'hidden'} />
            {!running && !busy && <div className="flex flex-col items-center gap-3 py-6 text-center"><QrCode className="size-12 text-primary" /><p className="max-w-xs text-sm text-base-content/60">Arahkan kamera ke QR kegiatan yang ditampilkan fasilitator.</p></div>}
            <div className="mt-4 flex justify-center gap-2">
                {running || busy ? <button className="btn btn-outline btn-sm gap-2" type="button" onClick={stop}><CameraOff className="size-4" /> Tutup kamera</button>
                    : <button className="btn btn-primary gap-2" type="button" onClick={() => void start()}><Camera className="size-4" /> Buka kamera / Scan QR</button>}
            </div>
        </div>
        <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); accept(link); }}>
            <label htmlFor="attendance-qr-link" className="text-xs font-medium">Sudah memindai dengan kamera ponsel? Tempel tautan QR</label>
            <div className="flex flex-col gap-2 sm:flex-row"><input id="attendance-qr-link" className="input input-bordered w-full" type="text" value={link} onChange={(event) => setLink(event.target.value)} placeholder="Tautan absensi dari QR fasilitator" required /><button className="btn btn-outline shrink-0 gap-2" type="submit"><Link2 className="size-4" /> Baca tautan</button></div>
        </form>
        {error && <p className="text-sm text-error" role="alert">{error}</p>}
    </div>;
}
