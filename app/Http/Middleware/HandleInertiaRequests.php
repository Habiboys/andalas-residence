<?php

namespace App\Http\Middleware;

use App\Models\RoomType;
use App\Models\User;
use App\Services\UnandSso;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'logoutUrl' => $request->session()->get('unand_sso_authenticated') ? route('sso.logout') : route('logout'),
            'roomTypeCatalog' => fn () => RoomType::orderBy('created_at')->orderBy('code')->get(['id', 'code', 'name', 'active']),
            'ssoUrl' => app(UnandSso::class)->isConfigured() ? route('sso.redirect') : null,
            'auth' => [
                'user' => $request->user()
                    ? $this->formatAuthUser($request->user()->load('roles', 'mahasiswaProfil'))
                    : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatAuthUser(User $user): array
    {
        $data = $user->toArray();
        $data['name'] = $user->nama;
        $data['avatar'] = $user->foto_profil;
        $data['raw_role'] = $user->roles->first()?->name;

        return $data;
    }
}
