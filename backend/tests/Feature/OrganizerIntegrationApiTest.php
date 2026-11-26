<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventOrganizer;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrganizerIntegrationApiTest extends TestCase
{
    use RefreshDatabase;

    private function organizer(array $attributes = []): User
    {
        $user = User::factory()->organizer()->create($attributes);

        EventOrganizer::create([
            'user_id' => $user->id,
            'organization_name' => 'Attendly Test Organization',
            'contact_number' => '+63 917 123 4567',
        ]);

        return $user->fresh('organizer');
    }

    private function event(User $organizer, array $overrides = []): Event
    {
        return Event::factory()->create(array_merge([
            'organizer_id' => $organizer->organizer->id,
            'status' => 'published',
            'review_status' => 'approved',
            'event_date' => now()->addDays(2)->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
        ], $overrides));
    }

    public function test_organizer_dashboard_returns_database_metrics_and_events(): void
    {
        $organizer = $this->organizer();
        $upcoming = $this->event($organizer);

        Sanctum::actingAs($organizer);

        $this->getJson('/api/organizer/dashboard')
            ->assertOk()
            ->assertJsonPath('stats.published', 1)
            ->assertJsonPath('stats.registrations', 0)
            ->assertJsonPath('upcoming.0.id', $upcoming->id)
            ->assertJsonPath('performance', null);
    }

    public function test_organizer_can_view_attendees_for_only_their_own_events(): void
    {
        $organizer = $this->organizer();
        $otherOrganizer = $this->organizer();
        $event = $this->event($organizer);
        $otherEvent = $this->event($otherOrganizer);
        $student = User::factory()->create([
            'student_id' => '2026-12345',
            'course' => 'BS Information Technology',
            'year_level' => '3rd Year',
        ]);

        $registration = Registration::create([
            'user_id' => $student->id,
            'event_id' => $event->id,
            'status' => 'registered',
        ]);

        Sanctum::actingAs($organizer);

        $this->getJson('/api/organizer/attendees?event_id='.$event->id)
            ->assertOk()
            ->assertJsonPath('event.id', $event->id)
            ->assertJsonPath('rows.0.id', $registration->id)
            ->assertJsonPath('rows.0.name', $student->name)
            ->assertJsonPath('rows.0.studentId', '2026-12345')
            ->assertJsonPath('rows.0.email', $student->email)
            ->assertJsonMissing(['id' => $otherEvent->id]);
    }

    public function test_organizer_registration_list_contains_only_their_upcoming_registrations(): void
    {
        $organizer = $this->organizer();
        $otherOrganizer = $this->organizer();
        $event = $this->event($organizer);
        $otherEvent = $this->event($otherOrganizer);
        $student = User::factory()->create();

        $registration = Registration::create([
            'user_id' => $student->id,
            'event_id' => $event->id,
            'status' => 'registered',
        ]);

        Registration::create([
            'user_id' => User::factory()->create()->id,
            'event_id' => $otherEvent->id,
            'status' => 'registered',
        ]);

        Sanctum::actingAs($organizer);

        $this->getJson('/api/organizer/registrations')
            ->assertOk()
            ->assertJsonPath('upcoming', 1)
            ->assertJsonPath('rows.0.id', $registration->id)
            ->assertJsonPath('rows.0.eventId', $event->id)
            ->assertJsonPath('rows.0.eventTitle', $event->title)
            ->assertJsonCount(1, 'rows');
    }

    public function test_organizer_can_read_and_update_their_profile(): void
    {
        $organizer = $this->organizer();
        Sanctum::actingAs($organizer);

        $this->getJson('/api/organizer/profile')
            ->assertOk()
            ->assertJsonPath('organizationName', 'Attendly Test Organization')
            ->assertJsonPath('contactNumber', '+63 917 123 4567');

        $this->putJson('/api/organizer/profile', [
            'name' => 'Updated Contact Person',
            'organizationName' => 'Updated Organization',
            'contactNumber' => '+63 900 111 2222',
            'notifications' => [
                'registrations' => false,
                'capacity' => true,
                'daily' => true,
            ],
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Organizer profile updated successfully.');

        $this->assertDatabaseHas('users', [
            'id' => $organizer->id,
            'name' => 'Updated Contact Person',
        ]);
        $this->assertDatabaseHas('event_organizers', [
            'user_id' => $organizer->id,
            'organization_name' => 'Updated Organization',
            'contact_number' => '+63 900 111 2222',
        ]);
    }

    public function test_non_organizer_cannot_access_organizer_integration_endpoints(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/organizer/dashboard')->assertForbidden();
        $this->getJson('/api/organizer/attendees')->assertForbidden();
        $this->getJson('/api/organizer/registrations')->assertForbidden();
        $this->getJson('/api/organizer/profile')->assertForbidden();
    }
}