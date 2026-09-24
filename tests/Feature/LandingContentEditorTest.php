<?php

use App\Models\Gedung;
use App\Models\Informasi;
use App\Models\LandingContent;
use App\Models\Program;
use App\Models\ProgramSub;
use App\Models\User;
use App\Services\LandingRichText;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->withoutVite();
});

function landingEditorUser(): User
{
    $permission = Permission::findOrCreate('landing.manage');
    $role = Role::findOrCreate('staff_admin');
    $role->givePermissionTo($permission);
    $user = User::factory()->create();
    $user->assignRole($role);

    return $user;
}

test('content creation opens a dedicated editor with navigation context', function (string $section) {
    $this->actingAs(landingEditorUser())->get(route('andalas.landing.editor.create', $section))
        ->assertInertia(fn (Assert $page) => $page->component('admin/landing-editor')
            ->where('section', $section)->where('record', null)->has('initialUser')
            ->where('returnUrl', route('admin.kelola-'.$section)));
})->with(['informasi', 'program', 'testimoni']);

test('profile editor preserves legacy line breaks and accepts rich text', function () {
    $profile = LandingContent::create(['key' => 'sejarah', 'title' => 'Sejarah', 'content' => "Baris pertama\nBaris kedua"]);
    $this->actingAs(landingEditorUser())->get(route('andalas.landing.editor.edit', ['profil', $profile->id]))
        ->assertInertia(fn (Assert $page) => $page->component('admin/landing-editor')
            ->where('record.content', "<p>Baris pertama<br />\nBaris kedua</p>"));
});

test('editor requires authentication and landing permission', function () {
    $url = route('andalas.landing.editor.create', 'informasi');
    $this->get($url)->assertRedirect(route('login'));
    $this->actingAs(User::factory()->create())->get($url)->assertForbidden();
});

test('editor rejects unknown sections and missing parent programs', function () {
    $this->actingAs(landingEditorUser())->get(route('andalas.landing.editor.create', 'unknown'))->assertNotFound();
    $this->get(route('andalas.landing.editor.create', 'program-sub'))->assertNotFound();
});

test('subprogram editor receives its parent and existing record', function () {
    $program = Program::create(['nama' => 'Pembinaan']);
    $sub = ProgramSub::create(['program_id' => $program->id, 'judul' => 'Kegiatan', 'deskripsi' => '<h2>Jadwal</h2>']);
    $this->actingAs(landingEditorUser())->get(route('andalas.landing.editor.edit', ['program-sub', $sub->id]))
        ->assertInertia(fn (Assert $page) => $page->component('admin/landing-editor')
            ->where('parentProgram.id', $program->id)->where('record.deskripsi', '<h2>Jadwal</h2>'));
});

test('saving rich information retains formatting removes unsafe markup and returns to list', function () {
    $this->actingAs(landingEditorUser())->post(route('andalas.landing.informasi.store'), [
        'kategori' => 'panduan', 'judul' => 'Panduan hunian', 'published' => false,
        'konten' => '<h2>Persiapan</h2><ul><li><strong>Kartu identitas</strong></li></ul><script>alert(1)</script><img src="/storage/guide.png" onerror="alert(1)">',
    ])->assertSessionHasNoErrors()->assertRedirect(route('admin.kelola-informasi'));
    $item = Informasi::where('judul', 'Panduan hunian')->firstOrFail();
    expect($item->konten)->toContain('<h2>Persiapan</h2>', '<li><strong>Kartu identitas</strong></li>', 'src="/storage/guide.png"')
        ->not->toContain('<script', 'onerror');
    expect($item->published)->toBeFalse();
});

test('multipart editing replaces documents and preserves them when no replacement is supplied', function () {
    Storage::fake('public');
    Storage::disk('public')->put('informasi/old.pdf', 'old');
    $item = Informasi::create(['kategori' => 'sop', 'judul' => 'SOP', 'file' => 'informasi/old.pdf']);
    $this->actingAs(landingEditorUser())->post(route('andalas.landing.informasi.update', $item), [
        '_method' => 'put', 'judul' => 'SOP terbaru', 'konten' => '<ol><li>Daftar</li></ol>',
        'file' => UploadedFile::fake()->create('panduan.pdf', 50, 'application/pdf'),
    ])->assertSessionHasNoErrors()->assertRedirect(route('admin.kelola-informasi'));
    $path = $item->fresh()->file;
    Storage::disk('public')->assertExists($path);
    Storage::disk('public')->assertMissing('informasi/old.pdf');
    $this->put(route('andalas.landing.informasi.update', $item), ['judul' => 'SOP revisi', 'file' => null])->assertSessionHasNoErrors();
    expect($item->fresh()->file)->toBe($path);
    Storage::disk('public')->assertExists($path);
});

test('editor image upload validates files and returns a persistent URL', function () {
    Storage::fake('public');
    $this->actingAs(landingEditorUser())->postJson(route('andalas.landing.editor.images'), ['image' => UploadedFile::fake()->image('kamar.png')])
        ->assertOk()->assertJsonStructure(['url']);
    expect(Storage::disk('public')->allFiles('landing/editor'))->toHaveCount(1);
    $this->postJson(route('andalas.landing.editor.images'), ['image' => UploadedFile::fake()->create('unsafe.svg', 1, 'image/svg+xml')])->assertUnprocessable()->assertJsonValidationErrors('image');
    expect(Storage::disk('public')->allFiles('landing/editor'))->toHaveCount(1);
});

test('unprivileged users cannot upload editor images', function () {
    $this->actingAs(User::factory()->create())->postJson(route('andalas.landing.editor.images'))->assertForbidden();
});

test('sanitizer drops active content while retaining editorial formatting', function () {
    $html = LandingRichText::html('<p style="text-align:center;position:fixed;color:#15803d">Teks <a href="javascript:alert(1)">tautan</a></p><svg><script>alert(2)</script></svg><iframe src="https://example.com"></iframe><img src="data:image/svg+xml,bad"><a href="https://unand.ac.id">Kampus</a>');
    expect($html)->toContain('text-align:center;color:#15803d', 'href="https://unand.ac.id"', 'Teks')
        ->not->toContain('javascript:', '<svg', '<iframe', 'position:', 'data:image', '<script');
});

test('public information sanitizes previously stored content too', function () {
    Informasi::create(['kategori' => 'panduan', 'judul' => 'Panduan', 'published' => true, 'konten' => '<h2>Daftar</h2><img src=x onerror=alert(1)>']);
    $this->get('/informasi/panduan')->assertInertia(fn (Assert $page) => $page->component('landing/informasi')->where('items.0.konten', '<h2>Daftar</h2>'));
});

test('draft programs cannot be opened using their name or id', function () {
    $program = Program::create(['nama' => 'Draft', 'published' => false]);
    $this->get('/program/'.$program->nama)->assertNotFound();
    $this->get('/program/'.$program->id)->assertNotFound();
});

test('draft profiles are unavailable to public visitors', function () {
    LandingContent::create(['key' => 'sejarah', 'title' => 'Sejarah', 'published' => false]);
    $this->get('/profil/sejarah')->assertNotFound();
});

test('homepage announcements contain only the latest published announcements', function () {
    Informasi::create(['kategori' => 'pengumuman', 'judul' => 'Belum terbit', 'published' => false]);
    Informasi::create(['kategori' => 'panduan', 'judul' => 'Panduan', 'published' => true]);
    Informasi::create(['kategori' => 'pengumuman', 'judul' => 'Pendaftaran', 'published' => true, 'tanggal' => '2026-09-20']);
    $this->get('/')->assertInertia(fn (Assert $page) => $page->component('landing/beranda')->has('pengumuman', 1)->where('pengumuman.0.judul', 'Pendaftaran'));
});

test('homepage gallery uses building photos and published program images', function () {
    Gedung::create(['kode_gedung' => 'A', 'nama_gedung' => 'Gedung A', 'gender_peruntukan' => 'laki_laki', 'foto' => 'gedung/a.jpg']);
    Gedung::create(['kode_gedung' => 'B', 'nama_gedung' => 'Gedung B', 'gender_peruntukan' => 'perempuan']);
    $published = Program::create(['nama' => 'Pembinaan', 'published' => true]);
    $draft = Program::create(['nama' => 'Draft', 'published' => false]);
    ProgramSub::create(['program_id' => $published->id, 'judul' => 'Kegiatan', 'gambar' => 'program/kegiatan.jpg']);
    ProgramSub::create(['program_id' => $draft->id, 'judul' => 'Belum terbit', 'gambar' => 'program/draft.jpg']);

    $this->get('/')->assertInertia(fn (Assert $page) => $page->component('landing/beranda')
        ->has('galeri', 2)->where('galeri.0.foto', '/storage/gedung/a.jpg')
        ->where('galeri.1.judul', 'Kegiatan'));
});
