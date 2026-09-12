import { Link, usePage } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
    andalasAppHref,
    currentAndalasPage,
    filterAdminNav,
} from '@/andalas/config/admin-nav';

type AuthUser = {
    roles?: Array<{ name: string }>;
};

export function AndalasAdminNav() {
    const page = usePage();
    const authUser = (page.props as { auth?: { user?: AuthUser | null } }).auth?.user;
    const isSuperadmin = authUser?.roles?.some((r) => r.name === 'superadmin') ?? false;
    const activePage = currentAndalasPage(page.url);
    const navItems = filterAdminNav(isSuperadmin);

    const groups = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
        const key = item.group ?? '';
        acc[key] ??= [];
        acc[key].push(item);
        return acc;
    }, {});

    return (
        <>
            {Object.entries(groups).map(([group, items]) => (
                <SidebarGroup key={group || 'main'} className="px-2 py-0">
                    {group ? <SidebarGroupLabel>{group}</SidebarGroupLabel> : <SidebarGroupLabel>Andalas Residen</SidebarGroupLabel>}
                    <SidebarMenu>
                        {items.map((item) => (
                            <SidebarMenuItem key={item.page}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={activePage === item.page}
                                    tooltip={{ children: item.title }}
                                >
                                    <Link href={andalasAppHref(item.page)} prefetch preserveState>
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}
