import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="flex w-full max-w-md flex-col gap-6">
                <Link
                    href="/"
                    className="flex items-center gap-2 self-center font-medium"
                >
                    <div className="flex h-9 w-9 items-center justify-center">
                        <AppLogoIcon className="size-9 fill-current text-black dark:text-white" />
                    </div>
                </Link>

                <div className="card bg-base-100 shadow-sm">
                    <div className="card-body px-10 py-8">
                        <div className="mb-6 text-center">
                            <h1 className="card-title justify-center text-xl">{title}</h1>
                            <p className="text-base-content/70 text-sm">{description}</p>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
