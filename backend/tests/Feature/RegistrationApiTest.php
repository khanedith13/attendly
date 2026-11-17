<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventOrganizer;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegistrationApiTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private Event $event;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = $this->createStudent();
        $this->event = $this->createEvent(capacity: 2);
    }

    public function test_student_can_register_for_published_approved_event(): void
    {
        Sanctum::actingAs($this->student);

        $response = $this->postJson(
            "/api/student/events/{$this->event->id}/register"
        );

        $response
            ->assertCreated()
            ->assertJsonPath(
                'registration.registrationStatus',
                'registered'
            )
            ->assertJsonPath(
                'registration.eventId',
                $this->event->id
            );

        $this->assertDatabaseHas('registrations', [
            'user_id' => $this->student->id,
            'event_id' => $this->event->id,
            'status' => 'registered',
        ]);
    }

    public function test_student_cannot_register_twice_for_same_event(): void
    {
        Sanctum::actingAs($this->student);

        $this->postJson(
            "/api/student/events/{$this->event->id}/register"
        )->assertCreated();

        $this->postJson(
            "/api/student/events/{$this->event->id}/register"
        )->assertStatus(409);

        $this->assertDatabaseCount('registrations', 1);
    }

    public function test_student_cannot_register_for_full_event(): void
    {
        $this->event->update(['capacity' => 1]);

        Registration::create([
            'user_id' => $this->createStudent()->id,
            'event_id' => $this->event->id,
            'qr_token' => (string) Str::uuid(),
            'status' => 'registered',
            'registered_at' => now(),
        ]);

        Sanctum::actingAs($this->student);

        $this->postJson(
            "/api/student/events/{$this->event->id}/register"
        )->assertStatus(409);

        $this->assertDatabaseCount('registrations', 1);
    }

    public function test_student_cannot_register_for_unapproved_event(): void
    {
        $this->event->update([
            'review_status' => 'pending',
        ]);

        Sanctum::actingAs($this->student);

        $this->postJson(
            "/api/student/events/{$this->event->id}/register"
        )->assertNotFound();

        $this->assertDatabaseCount('registrations', 0);
    }

    public function test_student_can_cancel_their_registration(): void
    {
        $registration = $this->createRegistration(
            $this->student,
            $this->event
        );

        Sanctum::actingAs($this->student);

        $this->deleteJson(
            "/api/student/registrations/{$registration->id}"
        )->assertOk();

        $this->assertDatabaseHas('registrations', [
            'id' => $registration->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_student_cannot_cancel_another_students_registration(): void
    {
        $otherStudent = $this->createStudent();

        $registration = $this->createRegistration(
            $otherStudent,
            $this->event
        );

        Sanctum::actingAs($this->student);

        $this->deleteJson(
            "/api/student/registrations/{$registration->id}"
        )->assertNotFound();

        $this->assertDatabaseHas('registrations', [
            'id' => $registration->id,
            'status' => 'registered',
        ]);
    }

    public function test_student_can_re_register_after_cancellation(): void
    {
        $registration = $this->createRegistration(
            $this->student,
            $this->event,
            'cancelled'
        );

        Sanctum::actingAs($this->student);

        $response = $this->postJson(
            "/api/student/events/{$this->event->id}/register"
        );

        $response->assertCreated();

        $this->assertDatabaseCount('registrations', 1);

        $this->assertDatabaseHas('registrations', [
            'id' => $registration->id,
            'status' => 'registered',
        ]);
    }

    public function test_my_registrations_returns_the_students_records(): void
    {
        $this->createRegistration($this->student, $this->event);

        Sanctum::actingAs($this->student);

        $this->getJson('/api/student/registrations')
            ->assertOk()
            ->assertJsonCount(1, 'upcoming')
            ->assertJsonPath(
                'upcoming.0.eventId',
                $this->event->id
            )
            ->assertJsonPath(
                'counts.upcoming',
                1
            );
    }

    public function test_student_routes_reject_unauthenticated_requests(): void
    {
        $this->postJson(
            "/api/student/events/{$this->event->id}/register"
        )->assertUnauthorized();

        $this->getJson('/api/student/registrations')
            ->assertUnauthorized();
    }

    private function createStudent(): User
    {
        return User::query()->create([
            'name' => 'Test Student',
            'email' => 'student-' . Str::uuid() . '@school.edu.ph',
            'password' => bcrypt('Password123!'),
            'role' => 'student',
            'status' => 'active',
        ]);
    }

    private function createEvent(int $capacity = 10): Event
    {
        $organizerUser = User::query()->create([
            'name' => 'Test Organizer',
            'email' => 'organizer-' . Str::uuid() . '@school.edu.ph',
            'password' => bcrypt('Password123!'),
            'role' => 'organizer',
            'status' => 'active',
        ]);

        $organizer = EventOrganizer::query()->create([
            'user_id' => $organizerUser->id,
            'organization_name' => 'Test Organization',
        ]);

        return Event::query()->create([
            'organizer_id' => $organizer->id,
            'title' => 'Test Event',
            'description' => 'Registration API test event',
            'category' => 'Technology',
            'venue' => 'Innovation Hall',
            'event_date' => now()->addDays(7)->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'capacity' => $capacity,
            'status' => 'published',
            'review_status' => 'approved',
            'require_school_gmail' => true,
            'send_confirmation_email' => false,
            'qr_in_token' => (string) Str::uuid(),
            'qr_out_token' => (string) Str::uuid(),
        ]);
    }

    private function createRegistration(
        User $student,
        Event $event,
        string $status = 'registered'
    ): Registration {
        return Registration::query()->create([
            'user_id' => $student->id,
            'event_id' => $event->id,
            'qr_token' => (string) Str::uuid(),
            'status' => $status,
            'registered_at' => now(),
        ]);
    }
}