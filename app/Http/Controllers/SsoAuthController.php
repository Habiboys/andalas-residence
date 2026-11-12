<?php

namespace App\Http\Controllers;

use App\Enums\ClientProfileCategory;
use App\Models\MahasiswaProfil;
use App\Models\User;
use App\Services\StudentCohort;
use App\Services\UnandSso;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class SsoAuthController extends Controller
{
    public function redirect(Request $request, UnandSso $sso): RedirectResponse
    {
        if (! $sso->isConfigured()) {
            return $this->fail('SSO Unand belum dikonfigurasi.');
        }

        $state = Str::random(64);
        $verifier = Str::random(96);
        $request->session()->put('unand_sso', [
            'state' => $state,
            'verifier' => $verifier,
            'expires_at' => now()->addMinutes(10)->timestamp,
        ]);

        return redirect()->away($sso->endpoint('auth').'?'.http_build_query([
            'client_id' => config('services.unand_sso.client_id'),
            'redirect_uri' => config('services.unand_sso.redirect'),
            'response_type' => 'code',
            'scope' => 'openid profile email',
            'state' => $state,
            'code_challenge' => rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '='),
            'code_challenge_method' => 'S256',
        ], '', '&', PHP_QUERY_RFC3986));
    }

    public function callback(Request $request, UnandSso $sso): RedirectResponse
    {
        $flow = $request->session()->pull('unand_sso');
        $state = $request->query('state');
        if (! is_array($flow) || ! is_string($state) || $state === ''
            || ! hash_equals($flow['state'], $state) || $flow['expires_at'] < now()->timestamp) {
            return $this->fail('Sesi SSO tidak valid atau kedaluwarsa. Silakan login kembali.');
        }

        if ($request->has('error')) {
            return $this->fail('Login SSO dibatalkan atau ditolak. Silakan coba kembali.');
        }

        $code = $request->query('code');
        if (! $sso->isConfigured() || ! is_string($code) || $code === '') {
            return $this->fail('Konfigurasi atau kode login SSO tidak valid.');
        }

        try {
            $claims = $sso->user($code, $flow['verifier']);
        } catch (Throwable $exception) {
            Log::warning('SSO token/userinfo gagal', ['message' => $exception->getMessage()]);

            return $this->fail('Tidak dapat memverifikasi akun ke SSO Unand. Silakan coba kembali.');
        }

        $identifier = $sso->identifier($claims);
        Log::info('SSO userinfo claims', [
            'claims' => $claims,
            'extracted_identifier' => $identifier,
        ]);
        if ($identifier === null) {
            Log::warning('SSO identifier tidak valid', ['claims' => $claims]);

            return $this->fail('SSO tidak memberikan NIM/NIP yang valid. Hubungi administrator.');
        }

        try {
            $user = DB::transaction(function () use ($claims, $identifier, $sso): User {
                $subject = $claims['sub'];
                $linkedUser = User::query()->where('sso_id', $subject)->first();
                $user = $linkedUser ?? User::query()->where('nim_nip', $identifier)->first();

                if ($user && ($user->nim_nip !== $identifier || ($user->sso_id && $user->sso_id !== $subject))) {
                    throw ValidationException::withMessages(['sso' => 'Identitas SSO tidak sesuai dengan akun Residence. Hubungi administrator.']);
                }

                if ($user && $user->status !== 'aktif' && $user->inactive_reason !== 'letter_issued') {
                    throw ValidationException::withMessages(['sso' => 'Akun Residence dinonaktifkan oleh administrator.']);
                }

                if (! $user) {
                    $email = $claims['email'] ?? null;
                    $name = $sso->displayName($claims);
                    if (! preg_match('/^\d{10}$/D', $identifier)
                        || ! is_string($email) || strlen($email) > 255 || ! filter_var($email, FILTER_VALIDATE_EMAIL)
                        || ! is_string($name) || trim($name) === '' || mb_strlen($name) > 255) {
                        Log::warning('SSO auto-create ditolak', [
                            'identifier' => $identifier,
                            'email' => $email,
                            'name' => $name,
                            'preferred_username' => $claims['preferred_username'] ?? null,
                            'claims' => $claims,
                        ]);

                        throw ValidationException::withMessages(['sso' => 'Pembuatan akun otomatis memerlukan NIM mahasiswa 10 digit, nama, dan email dari SSO.']);
                    }

                    if (User::query()->where('email', $email)->exists()) {
                        throw ValidationException::withMessages(['sso' => 'Email SSO sudah digunakan akun lain. Hubungi administrator.']);
                    }

                    $cohort = StudentCohort::fromNim($identifier);
                    $user = User::create([
                        'nim_nip' => $identifier,
                        'nama' => trim($name),
                        'email' => $email,
                        'email_verified_at' => now(),
                        'password' => Str::random(64),
                        'client_profile_category' => ClientProfileCategory::Student,
                        'status' => 'aktif',
                    ]);
                    $user->assignRole('mahasiswa');
                    MahasiswaProfil::create([
                        'user_id' => $user->id,
                        'angkatan' => $cohort,
                        'barcode_code' => 'BC-'.Str::uuid(),
                        'status_huni' => 'calon',
                    ]);
                }

                $user->forceFill([
                    'sso_id' => $subject,
                    'email_verified_at' => $user->email_verified_at ?? now(),
                ])->save();

                return $user;
            });
        } catch (ValidationException $exception) {
            return $this->fail(collect($exception->errors())->flatten()->first());
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $request->session()->put('unand_sso_authenticated', true);

        $profile = $user->mahasiswaProfil;
        if ($user->hasRole('mahasiswa') && $profile && (! $user->gender || ! $profile->prodi_id || ! $profile->angkatan)) {
            return redirect()->route('mahasiswa.layanan');
        }

        return redirect()->intended(route('dashboard.redirect'));
    }

    public function logout(Request $request, UnandSso $sso): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if (! $sso->isConfigured()) {
            return redirect()->route('landing');
        }

        $url = $sso->endpoint('logout').'?'.http_build_query([
            'client_id' => config('services.unand_sso.client_id'),
            'post_logout_redirect_uri' => config('services.unand_sso.post_logout_redirect_uri') ?: rtrim(config('app.url'), '/').'/',
        ], '', '&', PHP_QUERY_RFC3986);

        return $request->header('X-Inertia') ? Inertia::location($url) : redirect()->away($url);
    }

    private function fail(string $message): RedirectResponse
    {
        Log::warning('SSO login gagal: '.$message);

        return redirect()->route('login')->withErrors(['sso' => $message]);
    }
}
