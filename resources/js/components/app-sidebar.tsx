import { Link, usePage } from '@inertiajs/react';
import { AndalasLogo } from '@/andalas/components/AndalasLogo';
import { AndalasAdminNav } from '@/components/andalas-admin-nav';
import { NavUser } from '@/components/nav-user';
import { redirect as dashboardRedirect } from '@/routes/dashboard';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

type AuthUser = {
    roles?: Array<{ name: string }>;
};

function isAndalasAdmin(user: AuthUser | null | undefined): boolean {
    const role = user?.roles?.[0]?.name;
    return role === 'staff_admin' || role === 'superadmin';
}

export function AppSidebar() {
    const { url, props } = usePage<{ auth: { user: AuthUser | null } }>();
    const onAndalasApp = url.startsWith('/admin/');
    const showAndalasAdminNav = onAndalasApp && isAndalasAdmin(props.auth?.user);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboardRedirect()} prefetch>
                                <AndalasLogo size="sm" theme="dark" variant="full" className="group-data-[collapsible=icon]:hidden" />
                                <AndalasLogo size="sm" theme="dark" variant="icon" className="hidden group-data-[collapsible=icon]:flex" />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {showAndalasAdminNav ? <AndalasAdminNav /> : null}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
