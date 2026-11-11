<?php

use App\Enums\LaporanKerusakanStatus as Status;
use App\Jobs\SendDamageReportNotification;
use App\Models\Aset;
use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Kuesioner;
use App\Models\KuesionerPertanyaan;
use App\Models\Lantai;
use App\Models\LaporanKerusakan;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\User;
use App\Services\DamageReportWorkflow;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function damageToBeUser(string $role): User
{
    Role::findOrCreate($role);
    $u = User::factory()->create();
    $u->assignRole($role);
    if ($role === 'teknisi') {
        $u->givePermissionTo(Permission::findOrCreate('tiket.update'));
    }
    if ($role === 'mahasiswa') {
        $u->givePermissionTo(Permission::findOrCreate('tiket.create'));
    }
    return $u;
}

function damageToBeResident(?Kamar $room = null, string $start = '-2 days'): array
{
    $u = damageToBeUser('mahasiswa');
    $p = MahasiswaProfil::create(['user_id' => $u->id, 'barcode_code' => 'DB-'.Str::uuid(), 'status_huni' => 'aktif']);
    if (! $room) {
        $b = Gedung::create(['kode_gedung' => 'D-'.Str::random(8), 'nama_gedung' => 'Gedung UAT']);
        $f = Lantai::create(['gedung_id' => $b->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Satu']);
        $room = Kamar::create(['lantai_id' => $f->id, 'nomor_kamar' => 'D-'.Str::random(8), 'kapasitas' => 4, 'status' => 'terisi_sebagian']);
    }
    $placement = PenempatanKamar::create(['mahasiswa_id' => $p->id, 'kamar_id' => $room->id, 'tanggal_mulai' => now()->modify($start)->toDateString(), 'status' => 'aktif']);
    return ['user' => $u, 'profile' => $p, 'room' => $room, 'placement' => $placement];
}

beforeEach(function () { $this->withoutVite(); });

it('accepts a report without registered inventory using its authorised room', function () {
    Storage::fake('local'); $f = damageToBeResident();
    $this->actingAs($f['user'])->post(route('andalas.laporan.store'), ['deskripsi' => 'Dinding retak', 'location_label' => 'Dinding dekat jendela', 'request_key' => (string) Str::uuid(), 'foto_awal' => [UploadedFile::fake()->image('awal.jpg')]])->assertSessionHasNoErrors();
    expect(LaporanKerusakan::sole()->aset_id)->toBeNull()->and(LaporanKerusakan::sole()->kamar_id)->toBe($f['room']->id);
});

it('shares full room evidence only within current occupancy', function () {
    Storage::fake('local'); $f = damageToBeResident(); $mate = damageToBeResident($f['room']); $other = damageToBeResident();
    $report = app(DamageReportWorkflow::class)->resident($f['user'], 'Retak', ['before/test.jpg'], null);
    Storage::disk('local')->put('before/test.jpg', 'test');
    expect($mate['user']->can('view', $report))->toBeTrue()->and($other['user']->can('view', $report))->toBeFalse();
    $this->actingAs($mate['user'])->get(route('andalas.tiket.photo', $report->photos->first()))->assertOk();
    $mate['placement']->update(['status' => 'berakhir']);
    expect($mate['user']->can('view', $report))->toBeFalse();
    $later = damageToBeResident($f['room'], '+1 day');
    expect($later['user']->can('view', $report))->toBeFalse();
});

it('scopes facilitator lists and direct photo access to the assigned building', function () {
    Storage::fake('local'); $a = damageToBeResident(); $b = damageToBeResident(); $fac = damageToBeUser('fasilitator');
    FasilitatorWilayah::create(['user_id' => $fac->id, 'gedung_id' => $a['room']->lantai->gedung_id]);
    $report = app(DamageReportWorkflow::class)->resident($b['user'], 'Retak', ['before/b.jpg'], null);
    Storage::disk('local')->put('before/b.jpg', 'test');
    $this->actingAs($fac)->get('/pelaporan')->assertOk()->assertInertia(fn (AssertableInertia $p) => $p->has('reports.data', 0));
    $this->get(route('andalas.tiket.photo', $report->photos->first()))->assertForbidden();
    expect($fac->can('triage', $report))->toBeFalse();
});

it('prevents duplicate incidents without forbidding distinct incidents', function () {
    $f = damageToBeResident(); $w = app(DamageReportWorkflow::class);
    $first = $w->resident($f['user'], 'Keran bocor', [], null);
    expect(fn () => $w->resident($f['user'], 'Sama', [], null))->toThrow(ValidationException::class);
    $second = $w->resident($f['user'], 'Pintu rusak', [], null, ['different_incident_reason' => 'Pintu, bukan keran']);
    expect($second->id)->not->toBe($first->id);
});

it('returns identical creation retries and rejects reused keys with changed payload', function () {
    $f = damageToBeResident(); $w = app(DamageReportWorkflow::class); $key = (string) Str::uuid();
    $a = $w->resident($f['user'], 'Bocor', [], null, ['request_key' => $key]);
    $b = $w->resident($f['user'], 'Bocor', [], null, ['request_key' => $key]);
    expect($a->id)->toBe($b->id);
    expect(fn () => $w->resident($f['user'], 'Lain', [], null, ['request_key' => $key]))->toThrow(ValidationException::class);
    $this->assertDatabaseCount('laporan_kerusakan', 1);
});

it('records a roommate confirmation once without creating another ticket', function () {
    $f = damageToBeResident(); $mate = damageToBeResident($f['room']); $w = app(DamageReportWorkflow::class);
    $r = $w->resident($f['user'], 'Bocor', [], null);
    $w->confirm($r, $mate['user']); $w->confirm($r, $mate['user']);
    $this->assertDatabaseCount('damage_report_confirmations', 1); $this->assertDatabaseCount('laporan_kerusakan', 1);
});

it('makes claim retries idempotent and refuses takeover', function () {
    $f = damageToBeResident(); $w = app(DamageReportWorkflow::class); $r = $w->resident($f['user'], 'Bocor', [], null); $t = damageToBeUser('teknisi'); $other = damageToBeUser('teknisi');
    $w->claim($r, $t); $w->claim($r, $t);
    expect(fn () => $w->claim($r, $other))->toThrow(AuthorizationException::class);
    $this->assertDatabaseCount('laporan_kerusakan_assignments', 1); $this->assertDatabaseCount('laporan_kerusakan_status_histories', 2);
});

it('tracks team membership and grants progress but not completion to members', function () {
    $f = damageToBeResident(); $w = app(DamageReportWorkflow::class); $r = $w->resident($f['user'], 'Bocor', [], null);
    $lead = damageToBeUser('teknisi'); $member = damageToBeUser('teknisi'); $other = damageToBeUser('teknisi');
    $r = $w->claim($r, $lead); $w->team($r, $lead, [$member->id], 'Butuh bantuan'); $w->team($r, $lead, [$member->id], 'Butuh bantuan');
    expect($member->can('view', $r))->toBeTrue()->and($member->can('progress', $r))->toBeTrue()->and($member->can('complete', $r))->toBeFalse()->and($other->can('view', $r))->toBeFalse();
    $this->assertDatabaseCount('laporan_kerusakan_assignments', 2);
    $w->team($r, $lead, [], 'Bantuan selesai');
    expect($member->can('view', $r))->toBeFalse();
});

it('rejects assigning an inactive technician', function () {
    $f = damageToBeResident(); $w = app(DamageReportWorkflow::class); $r = $w->resident($f['user'], 'Bocor', [], null); $lead = damageToBeUser('teknisi'); $off = damageToBeUser('teknisi'); $off->update(['status' => 'nonaktif']);
    $r = $w->claim($r, $lead);
    expect(fn () => $w->team($r, $lead, [$off->id], 'Bantu'))->toThrow(ValidationException::class);
});

it('stores blocked daily progress once and permits work on another ticket', function () {
    $f = damageToBeResident(); $w = app(DamageReportWorkflow::class); $r = $w->resident($f['user'], 'Bocor', [], null); $t = damageToBeUser('teknisi'); $r = $w->claim($r, $t);
    $data = ['description' => 'Menunggu material', 'work_date' => today()->toDateString(), 'is_blocked' => true, 'request_key' => (string) Str::uuid()];
    $w->progress($r, $t, $data); $w->progress($r, $t, $data);
    $second = $w->resident($f['user'], 'Pintu', [], null, ['different_incident_reason' => 'Pintu terpisah']); $w->claim($second, $t);
    expect($r->fresh()->status)->toBe(Status::SedangDikerjakan)->and($r->fresh()->is_blocked)->toBeTrue();
    $this->assertDatabaseCount('damage_report_progress', 1);
    $this->actingAs($t)->get('/pelaporan')->assertOk()->assertInertia(fn (AssertableInertia $p) => $p->has('daily.data', 1)->where('blocked_count', 1));
});

it('records leader orders without preempting work already underway', function () {
    $f = damageToBeResident(); $w = app(DamageReportWorkflow::class); $r = $w->resident($f['user'], 'Bocor', [], null); $t = damageToBeUser('teknisi'); $w->claim($r, $t);
    $leader = damageToBeUser('pimpinan');
    $order = $w->order($leader, ['gedung_id' => $f['room']->lantai->gedung_id, 'location_label' => 'Halaman', 'deskripsi' => 'Perbaiki pagar', 'priority' => 'high', 'request_key' => (string) Str::uuid()]);
    expect($order->source)->toBe('leader')->and($order->kamar_id)->toBeNull()->and($r->fresh()->status)->toBe(Status::SedangDikerjakan);
});

it('completes once and delivers a durable private notification exactly once', function () {
    $f = damageToBeResident(); $w = app(DamageReportWorkflow::class); $r = $w->resident($f['user'], 'Bocor', [], null); $t = damageToBeUser('teknisi'); $r = $w->claim($r, $t);
    $w->complete($r, $t, 'Sudah baik', ['after/one.jpg']); $w->complete($r, $t, 'Sudah baik', ['after/one.jpg']);
    expect(fn () => $w->complete($r, $t, 'Berbeda', ['after/two.jpg']))->toThrow(ValidationException::class);
    $event = DB::table('damage_report_notifications')->sole();
    (new SendDamageReportNotification($event->id))->handle(); (new SendDamageReportNotification($event->id))->handle();
    $this->assertDatabaseCount('notifications', 1); $this->assertDatabaseCount('laporan_kerusakan_photos', 1);
    expect($r->fresh()->status)->toBe(Status::Selesai);
});

it('audits cancellation and refuses cancelling a completed report', function () {
    $f = damageToBeResident(); $w = app(DamageReportWorkflow::class); $r = $w->resident($f['user'], 'Bocor', [], null); $t = damageToBeUser('teknisi'); $admin = damageToBeUser('staff_admin'); $r = $w->claim($r, $t);
    expect(fn () => $w->cancel($r, $admin, ''))->toThrow(ValidationException::class);
    $w->cancel($r, $admin, 'Salah kejadian'); $w->cancel($r, $admin, 'Salah kejadian');
    expect($r->fresh()->assignments()->whereNull('ended_at')->count())->toBe(0)->and($r->fresh()->cancellation_reason)->toBe('Salah kejadian');
    $second = $w->resident($f['user'], 'Baru', [], null); $second = $w->claim($second, $t); $w->complete($second, $t, 'Selesai', ['after/x.jpg']);
    expect(fn () => $w->cancel($second, $admin, 'Batal'))->toThrow(AuthorizationException::class);
});

it('links an unregistered asset only in its original location and preserves history', function () {
    $f = damageToBeResident(); $other = damageToBeResident(); $w = app(DamageReportWorkflow::class); $r = $w->resident($f['user'], 'Bocor', [], null); $admin = damageToBeUser('admin_aset');
    $bad = Aset::create(['kamar_id' => $other['room']->id, 'kode_inventaris' => 'BAD-'.Str::uuid(), 'nama_aset' => 'Keran lain', 'kategori' => 'Air']);
    expect(fn () => $w->linkAsset($r, $admin, $bad->id, 'Cocokkan'))->toThrow(ValidationException::class);
    $good = Aset::create(['kamar_id' => $f['room']->id, 'kode_inventaris' => 'GOOD-'.Str::uuid(), 'nama_aset' => 'Keran', 'kategori' => 'Air']);
    $w->linkAsset($r, $admin, $good->id, 'Inventaris baru');
    expect($r->fresh()->aset_id)->toBe($good->id)->and($r->fresh()->deskripsi)->toBe('Bocor')->and($r->statusHistories()->count())->toBe(2);
});

it('accepts a valid technician rating after completion using the status enum', function () {
    $f = damageToBeResident(); $w = app(DamageReportWorkflow::class); $r = $w->resident($f['user'], 'Bocor', [], null); $t = damageToBeUser('teknisi'); $r = $w->claim($r, $t); $w->complete($r, $t, 'Baik', ['after/r.jpg']);
    $admin = damageToBeUser('staff_admin'); $admin->givePermissionTo(Permission::findOrCreate('tiket.rate'));
    $q = Kuesioner::create(['kode' => 'KRS-TEST', 'nama' => 'Uji', 'jenis' => 'penilaian_teknisi', 'versi' => 1, 'status' => 'aktif', 'dibuat_oleh' => $admin->id]);
    $question = KuesionerPertanyaan::create(['kuesioner_id' => $q->id, 'kode_pertanyaan' => 'K1', 'teks_pertanyaan' => 'Kualitas', 'tipe_jawaban' => 'skala', 'bobot' => 1, 'skor_minimal' => 1, 'skor_maksimal' => 5, 'wajib' => true, 'urutan' => 1]);
    $this->actingAs($admin)->post(route('andalas.penilaian.store', $r), ['answers' => [$question->id => ['nilai_skor' => 5]]])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('penilaian_teknisi', ['laporan_kerusakan_id' => $r->id, 'status' => 'final']);
});

it('preserves notes from the legacy update route as idempotent daily progress', function () {
    $f = damageToBeResident(); $w = app(DamageReportWorkflow::class); $r = $w->resident($f['user'], 'Bocor', [], null); $t = damageToBeUser('teknisi');
    $data = ['status' => 'sedang_dikerjakan', 'catatan_penyelesaian' => 'Mulai memeriksa', 'request_key' => (string) Str::uuid()];
    $this->actingAs($t)->put(route('andalas.tiket.update', $r), $data)->assertSessionHasNoErrors();
    $this->put(route('andalas.tiket.update', $r), $data)->assertSessionHasNoErrors();
    expect($r->progress()->count())->toBe(1)->and($r->progress()->sole()->description)->toBe('Mulai memeriksa');
});

it('does not retain extra files when an HTTP creation is replayed', function () {
    Storage::fake('local'); $f = damageToBeResident();
    $data = ['deskripsi' => 'Retak', 'location_label' => 'Dinding', 'request_key' => (string) Str::uuid(), 'foto_awal' => [UploadedFile::fake()->image('awal.jpg')]];
    $this->actingAs($f['user'])->post(route('andalas.laporan.store'), $data)->assertSessionHasNoErrors();
    $this->post(route('andalas.laporan.store'), $data)->assertSessionHasNoErrors();
    expect(Storage::disk('local')->allFiles())->toHaveCount(1);
    $this->assertDatabaseCount('laporan_kerusakan', 1);
});
