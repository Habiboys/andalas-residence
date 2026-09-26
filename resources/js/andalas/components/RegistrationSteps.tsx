export default function RegistrationSteps({
    current,
    steps,
    label = 'Tahapan pendaftaran asrama',
    completed = false,
}: {
    current: number;
    steps: string[];
    label?: string;
    completed?: boolean;
}) {
    return (
        <ol
            aria-label={label}
            className="grid grid-cols-2 gap-3 sm:flex sm:[&>li]:flex-1"
        >
            {steps.map((label, index) => (
                <li
                    key={label}
                    aria-current={
                        !completed && current === index ? 'step' : undefined
                    }
                    className={`border-t-2 pt-2 text-sm ${index <= current ? 'border-primary text-base-content' : 'border-base-300 text-base-content/50'}`}
                >
                    <span className="block text-xs">
                        {completed || index < current
                            ? 'Selesai'
                            : `Langkah ${index + 1}`}
                    </span>
                    <span className={index === current ? 'font-semibold' : ''}>
                        {label}
                    </span>
                </li>
            ))}
        </ol>
    );
}
