<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class UnandSso
{
    public function isConfigured(): bool
    {
        foreach (['base_url', 'realm', 'client_id', 'client_secret', 'redirect'] as $key) {
            if (! filled(config('services.unand_sso.'.$key))) {
                return false;
            }
        }

        return true;
    }

    public function endpoint(string $path): string
    {
        return rtrim((string) config('services.unand_sso.base_url'), '/')
            .'/realms/'.rawurlencode((string) config('services.unand_sso.realm'))
            .'/protocol/openid-connect/'.$path;
    }

    /** @return array<string, mixed> */
    public function user(string $code, string $verifier): array
    {
        $token = Http::asForm()->acceptJson()->timeout(15)
            ->post($this->endpoint('token'), [
                'grant_type' => 'authorization_code',
                'client_id' => config('services.unand_sso.client_id'),
                'client_secret' => config('services.unand_sso.client_secret'),
                'redirect_uri' => config('services.unand_sso.redirect'),
                'code' => $code,
                'code_verifier' => $verifier,
            ])->throw()->json('access_token');

        if (! is_string($token) || $token === '') {
            throw new RuntimeException('SSO access token missing.');
        }

        $user = Http::withToken($token)->acceptJson()->timeout(15)
            ->get($this->endpoint('userinfo'))->throw()->json();

        if (! is_array($user) || ! is_string($user['sub'] ?? null) || $user['sub'] === '') {
            throw new RuntimeException('SSO subject missing.');
        }

        return $user;
    }

    /** @param array<string, mixed> $claims */
    public function identifier(array $claims): ?string
    {
        $uid = trim((string) ($claims['UID'] ?? $claims['uid'] ?? ''));
        if (preg_match('/^\d{4,50}$/D', $uid)) {
            return $uid;
        }

        $email = trim((string) ($claims['email'] ?? ''));
        $local = trim(explode('@', $email, 2)[0] ?? '');
        if (preg_match('/^(\d{4,50})_/', $local, $matches) && preg_match('/@(?:[a-z0-9-]+\.)*unand\.ac\.id$/iD', $email)) {
            return $matches[1];
        }

        $username = trim((string) ($claims['preferred_username'] ?? ''));
        if (preg_match('/^\d{4,50}$/D', $username)) {
            return $username;
        }

        if (preg_match('/^(\d{4,50})_/', $username, $matches)) {
            return $matches[1];
        }

        if (preg_match('/^(\d{4,50})(?:_[^@]+)?@(?:[a-z0-9-]+\.)*unand\.ac\.id$/iD', $email, $matches)) {
            return $matches[1];
        }

        return null;
    }

    /** @param array<string, mixed> $claims */
    public function displayName(array $claims): ?string
    {
        $name = trim((string) ($claims['name'] ?? ''));
        if ($name !== '') {
            return $name;
        }

        $given = trim((string) ($claims['given_name'] ?? ''));
        $family = trim((string) ($claims['family_name'] ?? ''));
        $combined = trim($given.' '.$family);
        if ($combined !== '') {
            return $combined;
        }

        $email = trim((string) ($claims['email'] ?? ''));
        $local = trim(explode('@', $email, 2)[0] ?? '');
        if (preg_match('/^\d+_(.+)$/', $local, $matches)) {
            $fromEmail = trim(str_replace(['_', '.', '-'], ' ', $matches[1]));
            if ($fromEmail !== '') {
                return Str::title($fromEmail);
            }
        }

        $username = trim((string) ($claims['preferred_username'] ?? ''));
        if ($username !== '' && ! preg_match('/^\d+$/D', $username)) {
            $cleaned = trim(preg_replace('/^\d+_/', '', $username) ?? $username);
            if ($cleaned !== '') {
                return Str::title(str_replace(['_', '.', '-'], ' ', $cleaned));
            }
        }

        return null;
    }
}
