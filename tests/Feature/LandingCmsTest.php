<?php

use App\Models\Informasi;
use App\Models\LandingContent;
use App\Models\MediaAsset;
use App\Models\OrganizationPosition;
use App\Models\User;
use App\Services\LandingContentService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function cmsAdmin(): User
{
    $permission = Permission::findOrCreate('landing.manage');
    $role = Role::findOrCreate('staff_admin');
    $role->givePermissionTo($permission);

    return User::factory()->create()->assignRole($role);
}

it('opens separate landing management pages with navigation context', function (string $section) {
    $this->withoutVite();
    $this->actingAs(cmsAdmin())->get(route('andalas.landing.manage', $section))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('admin/landing-manage')->where('section', $section)->where('page', 'landing-page/'.$section));
})->with(['beranda', 'sejarah', 'visi-misi', 'struktur-organisasi', 'media', 'kontak', 'berita', 'pengumuman', 'galeri']);

it('saves hero content and library image and exposes them to the public', function () {
    Storage::fake('public');
    $this->withoutVite();
    $this->actingAs(cmsAdmin());
    $upload = $this->postJson(route('andalas.landing.media.store'), ['file' => UploadedFile::fake()->image('hero.jpg')])->assertCreated();
    $asset = MediaAsset::findOrFail($upload->json('id'));
    $settings = LandingContentService::settings();
    $settings['hero']['title'] = 'Hunian dari database';
    $settings['hero']['image'] = '/storage/'.$asset->path;
    $settings['faqs'] = [['q' => 'FAQ baru', 'a' => 'Jawaban baru']];
    $settings['gallery'] = [['title' => 'Foto kegiatan', 'image' => '/storage/'.$asset->path, 'category' => 'Kegiatan']];
    $this->put(route('andalas.landing.settings'), ['settings' => $settings])->assertSessionHasNoErrors();
    $this->get('/')->assertInertia(fn (Assert $page) => $page->where('landingSettings.hero.title', 'Hunian dari database')->where('landingSettings.hero.image', '/storage/'.$asset->path)->has('landingSettings.faqs', 1)->where('galeri.0.judul', 'Foto kegiatan'));
    $this->deleteJson(route('andalas.landing.media.destroy', $asset))->assertUnprocessable();
    Storage::disk('public')->assertExists($asset->path);
});

it('rejects images outside the media library and unsafe map URLs in settings', function () {
    $this->actingAs(cmsAdmin());
    $settings = LandingContentService::settings();
    $settings['hero']['image'] = '/storage/not-in-library.jpg';
    $settings['site']['map_embed'] = 'javascript:alert(1)';
    $this->put(route('andalas.landing.settings'), ['settings' => $settings])->assertSessionHasErrors(['settings.hero.image', 'settings.site.map_embed']);
});

it('reuses a single document and protects it until all content references are removed', function () {
    Storage::fake('public');
    $this->actingAs(cmsAdmin());
    $upload = $this->postJson(route('andalas.landing.media.store'), ['file' => UploadedFile::fake()->create('aturan.pdf', 20, 'application/pdf')])->assertCreated();
    $asset = MediaAsset::findOrFail($upload->json('id'));
    foreach (['regulasi', 'sop'] as $category) {
        $this->post(route('andalas.landing.informasi.store'), ['kategori' => $category, 'judul' => $category, 'media_id' => $asset->id, 'published' => true])->assertSessionHasNoErrors();
    }
    expect(Informasi::where('file', $asset->path)->count())->toBe(2);
    $this->deleteJson(route('andalas.landing.media.destroy', $asset))->assertUnprocessable();
    foreach (Informasi::all() as $item) {
        $this->delete(route('andalas.landing.informasi.destroy', $item))->assertSessionHasNoErrors();
        Storage::disk('public')->assertExists($asset->path);
    }
    $this->deleteJson(route('andalas.landing.media.destroy', $asset))->assertOk();
    Storage::disk('public')->assertMissing($asset->path);
});

it('provides searchable paginated media and rejects executable uploads', function () {
    Storage::fake('public');
    $this->actingAs(cmsAdmin());
    $this->postJson(route('andalas.landing.media.store'), ['file' => UploadedFile::fake()->image('gedung.jpg')])->assertCreated();
    $this->postJson(route('andalas.landing.media.store'), ['file' => UploadedFile::fake()->create('bad.svg', 1, 'image/svg+xml')])->assertUnprocessable();
    $this->getJson(route('andalas.landing.media.index', ['search' => 'gedung', 'type' => 'image']))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('total', 1);
    $this->getJson(route('andalas.landing.media.index', ['type' => 'document']))->assertJsonCount(0, 'data');
});

it('builds ordered organization branches and rejects hierarchy cycles or parent deletion', function () {
    $this->actingAs(cmsAdmin());
    $this->post(route('andalas.landing.organization.store'), ['title' => 'Kepala', 'sort_order' => 0, 'published' => true])->assertSessionHasNoErrors();
    $root = OrganizationPosition::sole();
    foreach (['Keuangan', 'Layanan'] as $index => $title) {
        $this->post(route('andalas.landing.organization.store'), ['title' => $title, 'name' => 'Pengelola '.$title, 'parent_id' => $root->id, 'sort_order' => $index, 'published' => true])->assertSessionHasNoErrors();
    }
    $child = OrganizationPosition::where('title', 'Keuangan')->sole();
    $this->put(route('andalas.landing.organization.update', $root), ['title' => 'Kepala', 'parent_id' => $child->id, 'sort_order' => 0, 'published' => true])->assertSessionHasErrors('parent_id');
    expect($root->fresh()->parent_id)->toBeNull();
    $this->delete(route('andalas.landing.organization.destroy', $root))->assertSessionHasErrors('position');
    $this->delete(route('andalas.landing.organization.destroy', $child))->assertSessionHasNoErrors();
    $this->assertDatabaseCount('organization_positions', 2);
});

it('keeps draft organization branches and unpublished news out of public payloads', function () {
    $this->withoutVite();
    LandingContent::create(['key' => 'struktur_organisasi', 'title' => 'Struktur', 'published' => true]);
    $root = OrganizationPosition::create(['title' => 'Root', 'sort_order' => 0, 'published' => true]);
    $draft = OrganizationPosition::create(['title' => 'Draft', 'parent_id' => $root->id, 'published' => false]);
    OrganizationPosition::create(['title' => 'Hidden child', 'name' => 'Jangan tampil', 'parent_id' => $draft->id, 'published' => true]);
    $this->get('/profil/struktur-organisasi')->assertInertia(fn (Assert $page) => $page->has('positions', 1)->where('positions.0.title', 'Root'));
    Informasi::create(['kategori' => 'berita', 'judul' => 'Draft berita', 'published' => false]);
    Informasi::create(['kategori' => 'berita', 'judul' => 'Berita resmi', 'published' => true]);
    $this->get('/informasi/berita')->assertInertia(fn (Assert $page) => $page->has('items', 1)->where('items.0.judul', 'Berita resmi'));
    $this->get('/')->assertInertia(fn (Assert $page) => $page->has('berita', 1)->where('berita.0.judul', 'Berita resmi'));
});

it('requires landing permission for management media settings and organizational changes', function () {
    $this->get(route('andalas.landing.manage', 'media'))->assertRedirect(route('login'));
    $this->actingAs(User::factory()->create());
    $this->get(route('andalas.landing.manage', 'media'))->assertForbidden();
    $this->getJson(route('andalas.landing.media.index'))->assertForbidden();
    $this->postJson(route('andalas.landing.media.store'))->assertForbidden();
    $this->put(route('andalas.landing.settings'))->assertForbidden();
    $this->post(route('andalas.landing.organization.store'))->assertForbidden();
});

it('keeps changes to other landing sections when an older editor saves its own section', function () {
    $this->actingAs(cmsAdmin());
    $stale = LandingContentService::settings();
    $updated = $stale;
    $updated['hero']['title'] = 'Judul hero terbaru';
    $this->put(route('andalas.landing.settings'), ['section' => 'beranda', 'settings' => $updated])->assertSessionHasNoErrors();
    $stale['site']['address'] = 'Alamat baru';
    $this->put(route('andalas.landing.settings'), ['section' => 'kontak', 'settings' => $stale])->assertSessionHasNoErrors();
    expect(LandingContentService::settings()['hero']['title'])->toBe('Judul hero terbaru');
    expect(LandingContentService::settings()['site']['address'])->toBe('Alamat baru');
});

it('opens the legacy profile menu directly in the new separate profile editor', function () {
    $this->withoutVite();
    $this->actingAs(cmsAdmin())->get(route('admin.kelola-profil'))
        ->assertInertia(fn (Assert $page) => $page->component('admin/landing-manage')->where('section', 'sejarah')->where('page', 'landing-page/sejarah'));
});
