export default function RegistrationSteps({
    current = 0,
}: {
    current?: number;
}) {
    return (
        <ol
            aria-label="Tahapan pendaftaran"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
            {['Buat akun', 'Pilih kamar', 'Pembayaran', 'Penghuni aktif'].map(
                (label, index) => (
                    <li
                        key={label}
                        aria-current={current === index ? 'step' : undefined}
                        className={`border-t-2 pt-2 text-sm ${index <= current ? 'border-primary text-base-content' : 'border-base-300 text-base-content/50'}`}
                    >
                        <span className="block text-xs">
                            {index < current
                                ? 'Selesai'
                                : `Langkah ${index + 1}`}
                        </span>
                        <span
                            className={index === current ? 'font-semibold' : ''}
                        >
                            {label}
                        </span>
                    </li>
                ),
            )}
        </ol>
    );
}
