<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CreateAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_an_active_admin_with_a_hashed_password(): void
    {
        $this->artisan('attendly:create-admin', [
            'email' => 'Head.Admin@School.edu.ph',
            'name' => 'Head Admin',
        ])
            ->expectsQuestion('Password (at least 12 characters)', 'a-long-secret-1')
            ->assertSuccessful();

        $admin = User::query()->where('email', 'head.admin@school.edu.ph')->firstOrFail();

        $this->assertSame('Head Admin', $admin->name);
        $this->assertSame('admin', $admin->role);
        $this->assertSame('active', $admin->status);
        $this->assertTrue(Hash::check('a-long-secret-1', $admin->password));
    }

    public function test_the_new_admin_can_log_in(): void
    {
        $this->artisan('attendly:create-admin', [
            'email' => 'head.admin@school.edu.ph',
            'name' => 'Head Admin',
        ])
            ->expectsQuestion('Password (at least 12 characters)', 'a-long-secret-1')
            ->assertSuccessful();

        $this->postJson('/api/auth/login', [
            'email' => 'head.admin@school.edu.ph',
            'password' => 'a-long-secret-1',
        ])->assertOk();
    }

    public function test_it_rejects_a_password_shorter_than_twelve_characters(): void
    {
        $this->artisan('attendly:create-admin', [
            'email' => 'head.admin@school.edu.ph',
            'name' => 'Head Admin',
        ])
            ->expectsQuestion('Password (at least 12 characters)', 'short')
            ->assertFailed();

        $this->assertDatabaseCount('users', 0);
    }

    public function test_it_rejects_an_email_that_already_exists(): void
    {
        User::factory()->create(['email' => 'head.admin@school.edu.ph']);

        $this->artisan('attendly:create-admin', [
            'email' => 'HEAD.ADMIN@school.edu.ph',
            'name' => 'Head Admin',
        ])->assertFailed();

        $this->assertDatabaseCount('users', 1);
    }
}