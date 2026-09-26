import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="bg-gold text-forest-dark flex aspect-square size-8 items-center justify-center rounded-sm">
                <AppLogoIcon className="size-5" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    Andalas Residen
                </span>
                <span className="text-muted-foreground truncate text-[10px]">
                    Universitas Andalas
                </span>
            </div>
        </>
    );
}
