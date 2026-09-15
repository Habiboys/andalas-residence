<?php

use App\Models\User;

test('guests are redirected to the login page from the redirect route', function () {
    $response = $this->get('/dashboard/redirect');
    $response->assertRedirect(route('login'));
});

test('authenticated users are redirected to their role dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get('/dashboard/redirect');
    $response->assertRedirect(route('mahasiswa.dashboard'));
});
