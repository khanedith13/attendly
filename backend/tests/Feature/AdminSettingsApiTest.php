<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Setting;
use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminSettingsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\SettingsSeeder::class);
        app(SettingsService::class)->flush();
    }

    public function test_admin_can_read_all_platform_settings(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/admin/settings')
            ->assertOk()
            ->assertJsonPath('settings.platformName', 'Attendly')
            ->assertJsonPath('settings.schoolDomain', 'school.edu.ph')
            ->assertJsonPath('settings.requireSchoolGmail', true)
            ->assertJsonPath('settings.lateGraceMinutes', 15)
            ->assertJsonPath('settings.sessionTimeoutMinutes', 60)
            ->assertJsonPath('settings.twoFactorAdmins', false);
    }

    public function test_admin_can_update_settings_and_changes_are_audited(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $this->putJson('/api/admin/settings', $this->settingsPayload([
            'platformName' => 'Attendly Campus',
            'schoolDomain' => 'CAMPUS.EXAMPLE.EDU',
            'lateGraceMinutes' => 10,
            'requireEventApproval' => true,
        ]))
            ->assertOk()
            ->assertJsonPath('changed', 4);

        $this->assertDatabaseHas('settings', [
            'key' => 'platform_name',
            'value' => 'Attendly Campus',
        ]);
        $this->assertDatabaseHas('settings', [
            'key' => 'school_domain',
            'value' => 'campus.example.edu',
        ]);
        $this->assertDatabaseHas('settings', [
            'key' => 'late_grace_minutes',
            'value' => '10',
        ]);
        $this->assertDatabaseHas('settings', [
            'key' => 'require_event_approval',
            'value' => 'true',
        ]);

        $this->assertSame(4, AuditLog::where('user_id', $admin->id)
            ->where('action', 'Changed setting')
            ->count());

        app(SettingsService::class)->flush();

        $this->getJson('/api/settings/public')
            ->assertOk()
            ->assertJsonPath('platformName', 'Attendly Campus')
            ->assertJsonPath('schoolDomain', 'campus.example.edu');
    }

    public function test_saving_unchanged_settings_does_not_create_audit_entries(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->putJson('/api/admin/settings', $this->settingsPayload())
            ->assertOk()
            ->assertJsonPath('changed', 0);

        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_invalid_settings_are_rejected_without_saving(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->putJson('/api/admin/settings', $this->settingsPayload([
            'platformName' => '',
            'schoolDomain' => '@invalid',
            'lateGraceMinutes' => 121,
            'sessionTimeoutMinutes' => 4,
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'platformName',
                'schoolDomain',
                'lateGraceMinutes',
                'sessionTimeoutMinutes',
            ]);

        $this->assertDatabaseHas('settings', [
            'key' => 'platform_name',
            'value' => 'Attendly',
        ]);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_non_admin_cannot_read_or_update_platform_settings(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/admin/settings')->assertForbidden();
        $this->putJson('/api/admin/settings', $this->settingsPayload())
            ->assertForbidden();
    }

    private function settingsPayload(array $overrides = []): array
    {
        return array_merge([
            'platformName' => 'Attendly',
            'schoolDomain' => 'school.edu.ph',
            'requireSchoolGmail' => true,
            'allowOrganizerSignup' => true,
            'requireEventApproval' => false,
            'lateGraceMinutes' => 15,
            'autoMarkAbsent' => true,
            'sessionTimeoutMinutes' => 60,
            'twoFactorAdmins' => false,
            'emailNewOrganizer' => true,
            'emailFlaggedEvent' => true,
        ], $overrides);
    }
}