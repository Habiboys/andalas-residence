type Props = {
    variant?: 'full' | 'icon' | 'stacked';
    size?: 'sm' | 'md' | 'lg';
    theme?: 'light' | 'dark';
    className?: string;
};

const heightMap = {
    sm: 'h-7',
    md: 'h-8',
    lg: 'h-12',
};

export function AndalasLogo({
    variant = 'full',
    size = 'md',
    className = '',
}: Props) {
    const h = heightMap[size];

    const img = (
        <img
            src="/images/logo-andalas-residence.png"
            alt="Andalas Residence"
            className={`${h} w-auto object-contain`}
        />
    );

    if (variant === 'icon') {
        return <div className={className}>{img}</div>;
    }

    if (variant === 'stacked') {
        return (
            <div className={`flex flex-col items-center ${className}`}>
                {img}
            </div>
        );
    }

    return <div className={`flex items-center ${className}`}>{img}</div>;
}
