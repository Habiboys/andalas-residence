<?php

use App\Models\User;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    config(['services.unand_sso' => [
        'base_url' => 'https://sso.example.test/auth',
        'realm' => 'unand',
        'client_id' => 'andalasresidence-unand',
        'client_secret' => 'test-secret',
        'redirect' => 'http://localhost:8000/api/auth/callback',
        'post_logout_redirect_uri' => 'http://10.250.30.14:8003/',
    ]]);
    Http::preventStrayRequests();
});

function residenceSsoFlow(): array
{
    return ['unand_sso' => ['state' => 'state-123', 'verifier' => 'verifier-123', 'expires_at' => now()->addMinutes(10)->timestamp]];
}

function residenceSsoFake(array $claims = []): void
{
    Http::fake([
        'https://sso.example.test/auth/realms/unand/protocol/openid-connect/token' => Http::response(['access_token' => 'test-access-token']),
        'https://sso.example.test/auth/realms/unand/protocol/openid-connect/userinfo' => Http::response(array_replace([
            'sub' => 'subject-123',
            'preferred_username' => '2411522001',
            'name' => 'Mahasiswa SSO',
            'email' => '2411522001_nama@student.unand.ac.id',
            'email_verified' => true,
        ], $claims)),
    ]);
}

test('login button targets the application SSO redirect', function () {
    $this->get(route('login'))->assertInertia(fn (Assert $page) => $page
        ->component('auth/login')->where('ssoUrl', route('sso.redirect')));
});

test('redirect starts authorization code login with state and PKCE', function () {
    $response = $this->get(route('sso.redirect'));
    $response->assertRedirect();
    parse_str(parse_url($response->headers->get('Location'), PHP_URL_QUERY), $query);

    expect($query)->toMatchArray([
        'client_id' => 'andalasresidence-unand',
        'response_type' => 'code',
        'scope' => 'openid profile email',
        'redirect_uri' => 'http://localhost:8000/api/auth/callback',
        'code_challenge_method' => 'S256',
    ]);
    $response->assertSessionHas('unand_sso.state', $query['state']);
    expect($query['code_challenge'])->toHaveLength(43);
    expect($response->headers->get('Location'))->not->toContain('test-secret');
    Http::assertNothingSent();
});

test('unconfigured SSO returns a clear error while keeping the SSO option visible', function () {
    config(['services.unand_sso.client_secret' => null]);

    $this->get(route('sso.redirect'))->assertRedirect(route('login'))->assertSessionHasErrors('sso');
    $this->get(route('login'))->assertInertia(fn (Assert $page) => $page->where('ssoUrl', route('sso.redirect')));
    Http::assertNothingSent();
});

test('invalid or expired state does not contact SSO', function (array $session, array $query) {
    $this->withSession($session)->get(route('sso.callback', $query))
        ->assertRedirect(route('login'))->assertSessionHasErrors('sso')->assertSessionMissing('unand_sso');

    $this->assertGuest();
    Http::assertNothingSent();
})->with([
    'missing session' => [[], ['state' => 'state-123', 'code' => 'abc']],
    'mismatched state' => [fn () => residenceSsoFlow(), ['state' => 'wrong', 'code' => 'abc']],
    'array state' => [fn () => residenceSsoFlow(), ['state' => ['bad'], 'code' => 'abc']],
    'expired' => [fn () => ['unand_sso' => ['state' => 'state-123', 'verifier' => 'verifier-123', 'expires_at' => now()->subMinute()->timestamp]], ['state' => 'state-123', 'code' => 'abc']],
]);

test('cancelled login or missing code returns a visible error without contacting SSO', function (array $query) {
    $this->withSession(residenceSsoFlow())->get(route('sso.callback', $query))
        ->assertRedirect(route('login'))->assertSessionHasErrors('sso');

    $this->assertGuest();
    Http::assertNothingSent();
})->with([
    [['state' => 'state-123', 'error' => 'access_denied']],
    [['state' => 'state-123']],
]);

test('successful SSO creates a student and prospective resident profile', function () {
    Role::create(['name' => 'mahasiswa', 'guard_name' => 'web']);
    residenceSsoFake(['realm_access' => ['roles' => ['superadmin']]]);

    $response = $this->withSession(residenceSsoFlow())->get(route('sso.callback', ['state' => 'state-123', 'code' => 'abc']));

    $response->assertRedirect(route('residence.workflow'))->assertSessionMissing('unand_sso');
    $user = User::where('nim_nip', '2411522001')->sole();
    $this->assertAuthenticatedAs($user);
    expect($user->getRoleNames()->all())->toBe(['mahasiswa']);
    $this->assertDatabaseHas('users', ['id' => $user->id, 'sso_id' => 'subject-123', 'status' => 'aktif']);
    $this->assertDatabaseHas('mahasiswa_profil', ['user_id' => $user->id, 'angkatan' => '2024', 'status_huni' => 'calon']);
    Http::assertSent(fn (ClientRequest $request) => str_ends_with($request->url(), '/token')
        && $request['grant_type'] === 'authorization_code' && $request['client_secret'] === 'test-secret'
        && $request['code_verifier'] === 'verifier-123' && $request['redirect_uri'] === 'http://localhost:8000/api/auth/callback');
    Http::assertSent(fn (ClientRequest $request) => str_ends_with($request->url(), '/userinfo')
        && $request->hasHeader('Authorization', 'Bearer test-access-token'));
    Http::assertSentCount(2);
});

test('existing accounts keep their roles and password after linking by NIM', function () {
    Role::create(['name' => 'staff_admin', 'guard_name' => 'web']);
    $user = User::factory()->create(['nim_nip' => '2411522001']);
    $user->assignRole('staff_admin');
    $password = $user->password;
    residenceSsoFake();

    $this->withSession([...residenceSsoFlow(), 'url.intended' => '/admin/dashboard'])
        ->get(route('sso.callback', ['state' => 'state-123', 'code' => 'abc']))->assertRedirect('/admin/dashboard');

    $this->assertAuthenticatedAs($user);
    expect($user->fresh()->getRoleNames()->all())->toBe(['staff_admin']);
    expect($user->fresh()->password)->toBe($password);
    $this->assertDatabaseCount('users', 1);
    Http::assertSentCount(2);
});

test('email-prefix NIM follows the CDC format when the campus email is verified', function () {
    $user = User::factory()->create(['nim_nip' => '2411522001']);
    residenceSsoFake(['preferred_username' => 'nama.mahasiswa']);

    $this->withSession(residenceSsoFlow())->get(route('sso.callback', ['state' => 'state-123', 'code' => 'abc']))
        ->assertRedirect(route('dashboard.redirect'));

    $this->assertAuthenticatedAs($user);
    Http::assertSentCount(2);
});

test('inactive accounts cannot log in through SSO', function () {
    $user = User::factory()->create(['nim_nip' => '2411522001', 'status' => 'nonaktif']);
    residenceSsoFake();

    $this->withSession(residenceSsoFlow())->get(route('sso.callback', ['state' => 'state-123', 'code' => 'abc']))
        ->assertRedirect(route('login'))->assertSessionHasErrors(['sso' => 'Akun Residence dinonaktifkan oleh administrator.']);

    $this->assertGuest();
    expect($user->fresh()->sso_id)->toBeNull();
    Http::assertSentCount(2);
});

test('archived letter-issued accounts retain their existing access policy', function () {
    $user = User::factory()->create(['nim_nip' => '2411522001', 'status' => 'nonaktif', 'inactive_reason' => 'letter_issued']);
    residenceSsoFake();

    $this->withSession(residenceSsoFlow())->get(route('sso.callback', ['state' => 'state-123', 'code' => 'abc']))
        ->assertRedirect(route('dashboard.redirect'));

    $this->assertAuthenticatedAs($user);
    expect($user->fresh()->status)->toBe('nonaktif');
    Http::assertSentCount(2);
});

test('SSO identity conflicts do not replace an existing link', function (string $existingNim, string $existingSubject) {
    $user = User::factory()->create(['nim_nip' => $existingNim]);
    $user->forceFill(['sso_id' => $existingSubject])->save();
    residenceSsoFake();

    $this->withSession(residenceSsoFlow())->get(route('sso.callback', ['state' => 'state-123', 'code' => 'abc']))
        ->assertRedirect(route('login'))->assertSessionHasErrors('sso');

    $this->assertGuest();
    expect($user->fresh()->sso_id)->toBe($existingSubject);
    $this->assertDatabaseCount('users', 1);
    Http::assertSentCount(2);
})->with([
    'NIM has another subject' => ['2411522001', 'other-subject'],
    'subject has another NIM' => ['2411522002', 'subject-123'],
]);

test('invalid identities cannot create student accounts', function (array $claims) {
    residenceSsoFake($claims);

    $this->withSession(residenceSsoFlow())->get(route('sso.callback', ['state' => 'state-123', 'code' => 'abc']))
        ->assertRedirect(route('login'))->assertSessionHasErrors('sso');

    $this->assertGuest();
    $this->assertDatabaseCount('users', 0);
    Http::assertSentCount(2);
})->with([
    'NIP is not a student NIM' => [['preferred_username' => '198501012010121001']],
    'missing subject' => [['sub' => null]],
    'missing email' => [['email' => null]],
    'missing name' => [['name' => '']],
    'unverified email cannot identify an account' => [['preferred_username' => 'nama', 'email_verified' => false]],
    'external email cannot identify an account' => [['preferred_username' => 'nama', 'email' => '2411522001_name@example.org']],
    'future cohort' => [['preferred_username' => '4911522001']],
]);

test('email collisions do not link an unrelated local account', function () {
    $user = User::factory()->create(['email' => '2411522001_nama@student.unand.ac.id']);
    residenceSsoFake();

    $this->withSession(residenceSsoFlow())->get(route('sso.callback', ['state' => 'state-123', 'code' => 'abc']))
        ->assertRedirect(route('login'))->assertSessionHasErrors('sso');

    $this->assertGuest();
    expect($user->fresh()->sso_id)->toBeNull();
    $this->assertDatabaseCount('users', 1);
    Http::assertSentCount(2);
});

test('token failure shows an error without authenticating or exposing the response', function () {
    Http::fake(['https://sso.example.test/auth/realms/unand/protocol/openid-connect/token' => Http::response(['error' => 'private upstream detail'], 400)]);

    $this->withSession(residenceSsoFlow())->get(route('sso.callback', ['state' => 'state-123', 'code' => 'abc']))
        ->assertRedirect(route('login'))->assertSessionHasErrors(['sso' => 'Tidak dapat memverifikasi akun ke SSO Unand. Silakan coba kembali.']);

    $this->assertGuest();
    $this->assertDatabaseCount('users', 0);
    Http::assertSentCount(1);
});

test('SSO logout clears the local session and redirects to the registered logout URI', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->withSession(['sensitive' => 'value'])->post(route('sso.logout'))
        ->assertRedirect('https://sso.example.test/auth/realms/unand/protocol/openid-connect/logout?client_id=andalasresidence-unand&post_logout_redirect_uri=http%3A%2F%2F10.250.30.14%3A8003%2F')
        ->assertSessionMissing('sensitive');

    $this->assertGuest();
    Http::assertNothingSent();
});
