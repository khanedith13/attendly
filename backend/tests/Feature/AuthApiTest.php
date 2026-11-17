<?php

namespace Tests\Feature;

use App\Models\EventOrganizer;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\SettingsSeeder::class);

        Setting::updateOrCreate(
            ['key' => 'school_domain'],
            ['value' => 'school.edu.ph']
        );

        Setting::updateOrCreate(
            ['key' => 'require_school_gmail'],
            ['value' => 'true']
        );

        Setting::updateOrCreate(
            ['key' => 'allow_organizer_signup'],
            ['value' => 'true']
        );

        Setting::updateOrCreate(
            ['key' => 'platform_name'],
            ['value' => 'Attendly']
        );

        Cache::forget('settings');
    }

    public function test_student_can_register_as_active(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'firstName' => 'Test',
            'lastName' => 'Student',
            'email' => 'student@school.edu.ph',
            'password' => 'password123',
            'confirmPassword' => 'password123',
            'role' => 'student',
            'agree' => true,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.name', 'Test Student')
            ->assertJsonPath('user.role', 'student')
            ->assertJsonPath('user.status', 'active');

        $this->assertDatabaseHas('users', [
            'email' => 'student@school.edu.ph',
            'role' => 'student',
            'status' => 'active',
        ]);
    }

    public function test_organizer_registration_creates_pending_organizer(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'firstName' => 'Test',
            'lastName' => 'Organizer',
            'email' => 'organizer@school.edu.ph',
            'password' => 'password123',
            'confirmPassword' => 'password123',
            'role' => 'organizer',
            'agree' => true,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.role', 'organizer')
            ->assertJsonPath('user.status', 'pending');

        $user = User::where(
            'email',
            'organizer@school.edu.ph'
        )->firstOrFail();

        $this->assertDatabaseHas('event_organizers', [
            'user_id' => $user->id,
            'organization_name' => 'Test Organizer',
        ]);
    }

    public function test_admin_registration_is_rejected(): void
    {
        $this->postJson('/api/auth/register', [
            'firstName' => 'Test',
            'lastName' => 'Admin',
            'email' => 'admin@school.edu.ph',
            'password' => 'password123',
            'confirmPassword' => 'password123',
            'role' => 'admin',
            'agree' => true,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');
    }

    public function test_non_school_email_registration_is_rejected(): void
    {
        $this->postJson('/api/auth/register', [
            'firstName' => 'Test',
            'lastName' => 'Student',
            'email' => 'student@gmail.com',
            'password' => 'password123',
            'confirmPassword' => 'password123',
            'role' => 'student',
            'agree' => true,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_user_can_login_and_receive_token(): void
    {
        User::factory()->create([
            'email' => 'student@school.edu.ph',
            'password' => 'password123',
            'role' => 'student',
            'status' => 'active',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'student@school.edu.ph',
            'password' => 'password123',
            'remember' => true,
        ])
            ->assertOk()
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'role', 'status'],
                'token',
            ]);
    }

    public function test_wrong_password_returns_email_validation_error(): void
    {
        User::factory()->create([
            'email' => 'student@school.edu.ph',
            'password' => 'password123',
            'role' => 'student',
            'status' => 'active',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'student@school.edu.ph',
            'password' => 'wrong-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email')
            ->assertJsonPath(
                'errors.email.0',
                'Invalid email or password.'
            );
    }

    public function test_suspended_user_cannot_login(): void
    {
        User::factory()->create([
            'email' => 'suspended@school.edu.ph',
            'password' => 'password123',
            'role' => 'student',
            'status' => 'suspended',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'suspended@school.edu.ph',
            'password' => 'password123',
        ])
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'This account has been suspended. Contact an administrator.'
            );
    }

    public function test_suspended_user_token_is_revoked_on_next_request(): void
    {
        $user = User::factory()->create([
            'role' => 'student',
            'status' => 'suspended',
        ]);

        $token = $user->createToken('web');

        $this->withToken($token->plainTextToken)
            ->getJson('/api/auth/me')
            ->assertForbidden();

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $token->accessToken->id,
        ]);
    }

    public function test_student_cannot_access_organizer_route(): void
    {
        Route::middleware([
            'auth:sanctum',
            'active',
            'role:organizer',
        ])->get('/api/test/organizer-only', function () {
            return response()->json(['success' => true]);
        });

        $student = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
        ]);

        $token = $student->createToken('web')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/test/organizer-only')
            ->assertForbidden();
    }
}