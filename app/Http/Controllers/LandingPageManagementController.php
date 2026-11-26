<?php

namespace App\Http\Controllers;

use App\Models\Gedung;
use App\Models\Informasi;
use App\Models\LandingContent;
use App\Models\MediaAsset;
use App\Models\OrganizationPosition;
use App\Models\Program;
use App\Models\ProgramSub;
use App\Models\Testimoni;
use App\Services\LandingContentService;
use App\Services\LandingMedia;
use App\Services\LandingRichText;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LandingPageManagementController extends Controller
{
    public const SECTIONS = ['beranda', 'sejarah', 'visi-misi', 'struktur-organisasi', 'kontak', 'galeri', 'media', 'berita', 'pengumuman', 'regulasi', 'sop', 'panduan', 'program', 'testimoni'];

    public function index(Request $request, string $section = 'beranda'): Response
    {
        $this->authorizePermission($request, 'landing.manage');
        abort_unless(in_array($section, self::SECTIONS, true), 404);
        $key = str_replace('-', '_', $section);
        $record = in_array($key, ['sejarah', 'visi_misi', 'struktur_organisasi'], true) ? LandingContent::firstOrCreate(['key' => $key], ['title' => match ($key) {
            'sejarah' => 'Sejarah', 'visi_misi' => 'Visi dan Misi', default => 'Struktur Organisasi'
        }, 'content' => '', 'published' => false]) : null;
        if ($record) {
            $record->content = LandingRichText::html($record->content);
        }

        $autoGalleryPreview = [];
        if ($section === 'galeri') {
            $autoGalleryPreview = Gedung::whereNotNull('foto')->where('foto', '!=', '')->orderBy('kode_gedung')->limit(4)->get()
                ->map(fn (Gedung $gedung): array => ['title' => $gedung->nama_gedung, 'image' => '/storage/'.$gedung->foto, 'category' => 'Hunian (Otomatis)'])
                ->concat(
                    ProgramSub::whereHas('program', fn ($query) => $query->where('published', true))
                        ->whereNotNull('gambar')->where('gambar', '!=', '')->orderBy('urutan')->limit(4)->get()
                        ->map(fn (ProgramSub $sub): array => ['title' => $sub->judul, 'image' => '/storage/'.$sub->gambar, 'category' => 'Program (Otomatis)'])
                )
                ->values()
                ->all();
        }

        return Inertia::render('admin/landing-manage', [
            'initialUser' => app(RolePageController::class)->userPayload($request),
            'role' => $request->user()->hasRole('superadmin') ? 'superadmin' : 'staff_admin',
            'page' => 'landing-page/'.$section,
            'section' => $section,
            'record' => $record,
            'settings' => LandingContentService::settings(),
            'galleryAutoPreview' => $autoGalleryPreview,
            'positions' => $section === 'struktur-organisasi' ? OrganizationPosition::orderBy('sort_order')->orderBy('id')->get() : [],
            'rows' => match (true) {
                in_array($section, Informasi::KATEGORI, true) => Informasi::where('kategori', $section)->latest('tanggal')->get(),
                $section === 'program' => Program::with('sub')->orderBy('urutan')->get(),
                $section === 'testimoni' => Testimoni::orderBy('urutan')->get(),
                default => [],
            },
        ]);
    }

    public function uploadGalleryPhoto(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'landing.manage');
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'category' => ['required', 'string', 'max:100'],
            'file' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $asset = app(LandingMedia::class)->store($request->file('file'), 'landing/media');

        $current = LandingContentService::settings();
        $gallery = array_values($current['gallery'] ?? []);
        $gallery[] = [
            'title' => $validated['title'],
            'category' => $validated['category'],
            'image' => '/storage/'.$asset->path,
        ];
        $current['gallery'] = $gallery;

        $row = LandingContent::firstOrCreate(
            ['key' => 'site_settings'],
            ['title' => 'Pengaturan Situs', 'content' => '', 'published' => true, 'settings' => $current]
        );
        $row->update(['settings' => $current]);

        return back()->with('toast', ['type' => 'success', 'message' => 'Foto berhasil diunggah ke galeri Kehidupan di Andalas Residence.']);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'landing.manage');
        $current = LandingContentService::settings();
        $galleryItems = is_array($current['gallery'] ?? null) ? $current['gallery'] : [];
        $existingGalleryImages = array_values(array_filter(array_column($galleryItems, 'image'), 'is_string'));
        $images = array_values(array_unique([
            ...MediaAsset::where('mime_type', 'like', 'image/%')->pluck('path')->map(fn (string $path): string => '/storage/'.$path)->all(),
            ...$existingGalleryImages,
        ]));

        $rules = ['settings' => ['required', 'array:hero,headings,steps,categories,services,faqs,registration_tracks,facilities,core_rules,payment_steps,site,gallery,show_auto_gallery']];
        foreach (['hero', 'headings', 'site'] as $group) {
            $rules['settings.'.$group] = ['required', 'array:'.implode(',', array_keys($current[$group]))];
            foreach ($current[$group] as $field => $value) {
                $rules['settings.'.$group.'.'.$field] = ['present', 'nullable', 'string', 'max:3000'];
            }
        }
        $rules['settings.hero.image'] = ['present', 'nullable', Rule::in([$current['hero']['image'], ...$images])];
        $rules['settings.site.logo'] = ['present', 'nullable', Rule::in([$current['site']['logo'], ...$images])];
        $rules['settings.site.email'] = ['nullable', 'email', 'max:255'];
        foreach (['maps_url', 'map_embed'] as $field) {
            $rules['settings.site.'.$field] = ['nullable', 'url:https', 'max:2000'];
        }
        foreach (['steps', 'categories', 'services', 'faqs'] as $group) {
            $fields = $group === 'faqs' ? ['q', 'a'] : ['title', 'text'];
            $rules['settings.'.$group] = ['present', 'array', 'list', 'max:50'];
            $rules['settings.'.$group.'.*'] = ['required', 'array:'.implode(',', $fields)];
            foreach ($fields as $field) {
                $rules['settings.'.$group.'.*.'.$field] = ['required', 'string', 'max:3000'];
            }
        }
        foreach (['facilities', 'core_rules', 'payment_steps'] as $group) {
            $rules['settings.'.$group] = ['sometimes', 'array', 'list', 'max:50'];
            $rules['settings.'.$group.'.*'] = ['required', 'array:title,text'];
            foreach (['title', 'text'] as $field) {
                $rules['settings.'.$group.'.*.'.$field] = ['required', 'string', 'max:3000'];
            }
        }
        $rules['settings.registration_tracks'] = ['sometimes', 'array', 'list', 'max:20'];
        $rules['settings.registration_tracks.*'] = ['required', 'array:badge,title,description,points_text,cta_label,cta_href'];
        foreach (['badge', 'title', 'description', 'points_text', 'cta_label', 'cta_href'] as $field) {
            $rules['settings.registration_tracks.*.'.$field] = $field === 'badge' || $field === 'cta_href'
                ? ['present', 'nullable', 'string', 'max:300']
                : ['required', 'string', 'max:3000'];
        }
        $rules['settings.gallery'] = ['present', 'array', 'list', 'max:50'];
        $rules['settings.gallery.*'] = ['required', 'array:title,image,category'];
        $rules['settings.gallery.*.title'] = ['required', 'string', 'max:200'];
        $rules['settings.gallery.*.category'] = ['required', 'string', 'max:100'];
        $rules['settings.gallery.*.image'] = ['required', Rule::in($images)];
        $rules['settings.show_auto_gallery'] = ['sometimes', 'boolean'];
        $rules['section'] = ['sometimes', 'in:beranda,kontak,galeri'];
        $data = $request->validate($rules)['settings'];
        $groups = match ($request->input('section')) {
            'beranda' => ['hero', 'headings', 'steps', 'categories', 'services', 'faqs', 'registration_tracks', 'facilities', 'core_rules', 'payment_steps'],
            'kontak' => ['site'],
            'galeri' => ['gallery', 'headings', 'show_auto_gallery'],
            default => array_keys($data),
        };
        $data = [...$current, ...array_intersect_key($data, array_flip($groups))];
        $row = LandingContent::firstOrCreate(
            ['key' => 'site_settings'],
            ['title' => 'Pengaturan Situs', 'content' => '', 'published' => true, 'settings' => $data]
        );
        $row->update(['settings' => $data]);

        return back()->with('toast', ['type' => 'success', 'message' => 'Tampilan landing page diperbarui.']);
    }
}
