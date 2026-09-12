import { Component, Suspense, type ReactNode } from "react";
import { Head } from "@inertiajs/react";
import { CircleAlert } from "lucide-react";
import { resolvePage } from "@/andalas/config/pages";

type Props = {
    role: string;
    page: string;
    pageTitle?: string;
};

class PanelErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
    state = { error: null as Error | null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            return (
                <div className="p-6">
                    <div role="alert" className="alert alert-error items-start">
                        <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                        <div>
                            <p className="font-medium">Halaman ini gagal dimuat</p>
                            <p className="text-xs">{this.state.error.message}</p>
                            <p className="mt-1 text-xs">
                                Muat ulang halaman. Kalau tetap gagal, laporkan pesan di atas ke
                                pengelola sistem.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

function Loading() {
    return (
        <div className="space-y-4 p-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Memuat halaman</span>
            <div className="skeleton h-8 w-48" />
            <div className="skeleton h-40 w-full" />
            <div className="skeleton h-40 w-full" />
        </div>
    );
}

export default function AndalasPanel({ role, page, pageTitle }: Props) {
    const def = resolvePage(role, page);
    const Page = def?.component;
    const title = pageTitle || def?.title || "Aplikasi";

    return (
        <>
            <Head title={title} />
            {Page ? (
                <Suspense fallback={<Loading />}>
                    <PanelErrorBoundary>
                        <Page />
                    </PanelErrorBoundary>
                </Suspense>
            ) : (
                <div className="p-6">
                    <div className="alert alert-warning">
                        Halaman <span className="text-identifier">{page}</span> tidak ada untuk peran{" "}
                        {role}. Pilih menu lain di sidebar.
                    </div>
                </div>
            )}
        </>
    );
}
