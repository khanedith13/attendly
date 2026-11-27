<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SchoolEmailRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['attendly.school_domain' => 'usjr.edu.ph']);

        $this->seed(\Database\Seeders\SettingsSeeder::class);
        app(SettingsService::class)->flush();
    }

    /** @return array<string, array{string}> */
    public static function allowedRoles(): array
    {
        return [
            'student' => ['student'],
            'organizer' => ['organizer'],
        ];
    }

    /** @return array<string, array{string}> */
    public static function rejectedEmails(): array
    {
        return [
            'personal gmail' => ['maria.cruz@gmail.com'],
            'the old demo school domain' => ['maria.cruz@school.edu.ph'],
            'a subdomain' => ['maria.cruz@mail.usjr.edu.ph'],
            'a look-alike domain' => ['maria.cruz@evil-usjr.edu.ph'],
            'the domain as a prefix' => ['maria.cruz@usjr.edu.ph.evil.com'],
        ];
    }

    public function test_the_seeded_school_domain_follows_the_configuration(): void
    {
        $this->assertSame(
            'usjr.edu.ph',
            Setting::query()->whereKey('school_domain')->value('value'),
        );
        $this->assertSame('true', Setting::query()->whereKey('require_school_gmail')->value('value'));
    }

    #[DataProvider('allowedRoles')]
    public function test_an_account_can_be_created_with_a_usjr_email(string $role): void
    {
        $this->postJson('/api/auth/register', $this->payload(['role' => $role]))
            ->assertCreated()
            ->assertJsonPath('user.role', $role);

        $this->assertDatabaseHas('users', ['email' => 'maria.cruz@usjr.edu.ph']);
    }

    public function test_the_email_is_matched_without_regard_to_letter_case(): void
    {
        $this->postJson('/api/auth/register', $this->payload([
            'email' => 'Maria.Cruz@USJR.EDU.PH',
        ]))->assertCreated();

        $this->assertDatabaseHas('users', ['email' => 'maria.cruz@usjr.edu.ph']);
    }

    #[DataProvider('rejectedEmails')]
    public function test_an_account_cannot_be_created_with_any_other_email(string $email): void
    {
        $this->postJson('/api/auth/register', $this->payload(['email' => $email]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertSame(0, User::query()->count());
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'firstName' => 'Maria',
            'lastName' => 'Cruz',
            'email' => 'maria.cruz@usjr.edu.ph',
            'password' => 'password123',
            'confirmPassword' => 'password123',
            'role' => 'student',
            'agree' => true,
            ...$overrides,
        ];
    }
}