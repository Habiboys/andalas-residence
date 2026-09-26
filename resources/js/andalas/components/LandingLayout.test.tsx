import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vite-plus/test';
import LandingLayout from './LandingLayout';

const page = vi.hoisted(() => ({
    props: { auth: { user: null as { id: string } | null } },
}));

vi.mock('@inertiajs/react', () => ({
    router: {},
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    }) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
    usePage: () => page,
}));

it('offers login to visitors and the role-aware dashboard route to signed-in users', () => {
    page.props.auth.user = null;
    const guest = renderToStaticMarkup(
        <LandingLayout>
            <main>Beranda</main>
        </LandingLayout>,
    );
    expect(guest).toContain('/login"');
    expect(guest).toContain('>Masuk</a>');
    expect(guest).not.toContain('/dashboard/redirect');

    page.props.auth.user = { id: 'resident' };
    const authenticated = renderToStaticMarkup(
        <LandingLayout>
            <main>Beranda</main>
        </LandingLayout>,
    );
    expect(authenticated).toContain('/dashboard/redirect"');
    expect(authenticated).toContain('>Dashboard</a>');
    expect(authenticated).not.toContain('/login"');
});
