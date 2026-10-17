import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import LandingPageHero from './LandingPageHero';

const page = vi.hoisted(() => ({
    props: { landingSettings: { hero: { image: '' } } },
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => page,
    Link: ({ children, ...props }: { children: ReactNode; href: string }) => (
        <a {...props}>{children}</a>
    ),
}));

it('uses the managed media image with a readable title and current breadcrumb', () => {
    page.props.landingSettings.hero.image = 'media/hunian.jpg';
    const html = renderToStaticMarkup(
        <LandingPageHero title="Unit Hunian" breadcrumb="Unit" />,
    );

    expect(html).toContain('src="/storage/media/hunian.jpg"');
    expect(html).toContain('alt=""');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Unit Hunian</h1>');
    expect(html).toContain('href="/"');
});

it('supports external media and retains the heading when no image is configured', () => {
    page.props.landingSettings.hero.image = 'https://example.com/hunian.jpg';
    expect(renderToStaticMarkup(<LandingPageHero title="Profil" breadcrumb="Profil" />))
        .toContain('src="https://example.com/hunian.jpg"');

    page.props.landingSettings.hero.image = '';
    const html = renderToStaticMarkup(<LandingPageHero title="Kontak" breadcrumb="Kontak" />);
    expect(html).not.toContain('<img');
    expect(html).toContain('Kontak</h1>');
});
