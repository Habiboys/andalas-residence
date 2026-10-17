import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <button
                    type="button"
                    onClick={() => {
                        if (window.history.length > 1) {
                            window.history.back();

                            return;
                        }

                        router.visit('/');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium hover:bg-accent"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Kembali
                </button>
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
        </header>
    );
}
