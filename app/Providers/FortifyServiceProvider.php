<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\LoginResponse;
use App\Http\Responses\RegisterResponse;
use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\Prodi;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(LoginResponseContract::class, LoginResponse::class);
        $this->app->singleton(RegisterResponseContract::class, RegisterResponse::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureAuthentication();
        $this->configurePasswordResetMail();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    private function configurePasswordResetMail(): void
    {
        ResetPassword::toMailUsing(function (object $notifiable, string $token): MailMessage {
            $email = method_exists($notifiable, 'getEmailForPasswordReset')
                ? $notifiable->getEmailForPasswordReset()
                : ($notifiable->email ?? '');

            $resetUrl = url(route('password.reset', [
                'token' => $token,
                'email' => $email,
            ], false));

            $expireMinutes = (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60);

            return (new MailMessage)
                ->subject('Atur Ulang Kata Sandi - Andalas Residence')
                ->greeting('Halo, '.($notifiable->name ?? 'Penghuni').'!')
                ->line('Anda menerima email ini karena ada permintaan untuk mengatur ulang kata sandi akun Andalas Residence Anda.')
                ->action('Atur Ulang Kata Sandi', $resetUrl)
                ->line("Tautan pemulihan kata sandi ini hanya berlaku selama {$expireMinutes} menit.")
                ->line('Jika Anda tidak merasa mengajukan permintaan ini, abaikan email ini dan kata sandi Anda tetap aman.')
                ->salutation('Salam hormat, Pengelola Andalas Residence');
        });
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    private function configureAuthentication(): void
    {
        Fortify::authenticateUsing(function (Request $request) {
            $login = $request->input('email');
            $user = User::query()
                ->where('email', $login)
                ->orWhere('nim_nip', $login)
                ->first();

            if ($user && ($user->status === 'aktif' || $user->inactive_reason === 'letter_issued') && Hash::check($request->password, $user->password)) {
                return $user;
            }

            return null;
        });
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::registerView(fn () => Inertia::render('auth/register', [
            'fakultas' => Faculty::orderBy('name')->get(['id', 'name']),
            'departemen' => Departemen::orderBy('name')->get(['id', 'name', 'faculty_id']),
            'prodi' => Prodi::orderBy('name')->get(['id', 'name', 'jenjang', 'departemen_id']),
        ]));

        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'status' => $request->session()->get('status'),
            'ssoUrl' => route('sso.redirect'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

    }
}
