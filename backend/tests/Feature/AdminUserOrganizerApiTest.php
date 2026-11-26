<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventOrganizer;
use App\Models\Registration;
use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserOrganizerApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\SettingsSeeder::class);
        app(SettingsService::class)->flush();
    }

    public function test_admin_can_list_users_without_exposing_passwords(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create();
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'role' => 'student',
                'status' => 'active',
            ])
            ->assertJsonMissingPath('data.0.password');
    }

    public function test_admin_can_create_users_and_organizer_profile(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
    
        $this->postJson('/api/admin/users', [
            'name' => 'New Organizer',
            'email' => 'NEW.ORGANIZER@school.edu.ph',
            'password' => 'temporary-password',
            'role' => 'organizer',
        ])
            ->assertCreated()
            ->assertJsonPath('user.name', 'New Organizer')
            ->assertJsonPath('user.email', 'new.organizer@school.edu.ph')
            ->assertJsonPath('user.role', 'organizer')
            ->assertJsonPath('user.status', 'active');
    
        $created = User::where('email', 'new.organizer@school.edu.ph')->firstOrFail();
    
        $this->assertTrue(Hash::check('temporary-password', $created->password));
        $this->assertDatabaseHas('event_organizers', [
            'user_id' => $created->id,
            'organization_name' => 'New Organizer',
        ]);
    }

    public function test_admin_user_creation_obeys_the_school_email_domain_setting(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson('/api/admin/users', [
            'name' => 'Outside User',
            'email' => 'outside@example.com',
            'password' => 'temporary-password',
            'role' => 'student',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertDatabaseMissing('users', [
            'email' => 'outside@example.com',
        ]);
    }

    public function test_admin_can_update_user_and_suspension_revokes_tokens(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create();
        $student->createToken('test-device');
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/users/{$student->id}", [
            'name' => 'Updated Student',
            'status' => 'suspended',
        ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Updated Student')
            ->assertJsonPath('user.status', 'suspended');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_admin_cannot_change_own_role_or_status(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/users/{$admin->id}", [
            'role' => 'student',
        ])
            ->assertStatus(409)
            ->assertJsonPath('message', 'You cannot change your own role or status.');
    }

    public function test_admin_can_list_organizers_with_event_and_registration_counts(): void
    {
        $admin = User::factory()->admin()->create();
        $organizerUser = User::factory()->organizer()->create();
        $organizer = EventOrganizer::create([
            'user_id' => $organizerUser->id,
            'organization_name' => 'Campus Club',
            'contact_number' => '09171234567',
        ]);
        $event = Event::factory()->create(['organizer_id' => $organizer->id]);
        Registration::create([
            'user_id' => User::factory()->create()->id,
            'event_id' => $event->id,
        ]);
        Registration::create([
            'user_id' => User::factory()->create()->id,
            'event_id' => $event->id,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/organizers')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $organizerUser->id,
                'name' => 'Campus Club',
                'phone' => '09171234567',
                'events' => 1,
                'registrations' => 2,
                'status' => 'active',
                'contactPerson' => $organizerUser->name,
                'email' => $organizerUser->email,
            ]);
    }

    public function test_admin_can_approve_and_reject_organizer_applications(): void
    {
        $admin = User::factory()->admin()->create();
        $organizer = User::factory()->organizer()->pending()->create();
        EventOrganizer::create([
            'user_id' => $organizer->id,
            'organization_name' => 'Pending Club',
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/organizers/{$organizer->id}/status", [
            'action' => 'approve',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'active');

        $this->patchJson("/api/admin/organizers/{$organizer->id}/status", [
            'action' => 'suspend',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'suspended');

        $this->patchJson("/api/admin/organizers/{$organizer->id}/status", [
            'action' => 'reactivate',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'active');
    }

    public function test_admin_can_reject_a_pending_organizer_application(): void
    {
        $admin = User::factory()->admin()->create();
        $organizer = User::factory()->organizer()->pending()->create();
        EventOrganizer::create([
            'user_id' => $organizer->id,
            'organization_name' => 'Rejected Club',
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/organizers/{$organizer->id}/status", [
            'action' => 'reject',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'suspended');

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->id,
            'action' => 'Rejected organizer application',
            'target' => 'Rejected Club',
        ]);
    }

    public function test_organizer_status_transition_must_match_current_status(): void
    {
        $admin = User::factory()->admin()->create();
        $organizer = User::factory()->organizer()->create(['status' => 'active']);
        EventOrganizer::create([
            'user_id' => $organizer->id,
            'organization_name' => 'Active Club',
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/organizers/{$organizer->id}/status", [
            'action' => 'approve',
        ])->assertStatus(409);
    }

    public function test_non_admin_cannot_access_user_or_organizer_administration(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/admin/users')->assertForbidden();
        $this->postJson('/api/admin/users', [])->assertForbidden();
        $this->getJson('/api/admin/organizers')->assertForbidden();
    }
}