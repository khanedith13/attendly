<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\EventOrganizer;
use App\Models\Registration;
use App\Models\User;
use App\Services\SettingsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceApiTest extends TestCase
{
    use RefreshDatabase;

    private Carbon $testNow;

    private User $student;

    private Event $event;

    private Registration $registration;

    protected function setUp(): void
    {
        parent::setUp();

        $this->testNow = Carbon::parse('2026-11-23 10:00:00', 'Asia/Manila');
        Carbon::setTestNow($this->testNow);

        Storage::fake('local');

        $this->seed(\Database\Seeders\SettingsSeeder::class);
        app(SettingsService::class)->flush();

        $this->student = $this->createStudent();
        $this->event = $this->createEvent();
        $this->registration = $this->createRegistration($this->student, $this->event);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        app(SettingsService::class)->flush();

        parent::tearDown();
    }

    public function test_registered_student_can_check_in_with_the_event_in_qr_token(): void
    {
        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])
            ->assertCreated()
            ->assertJsonPath('attendance.event.id', $this->event->id)
            ->assertJsonPath('attendance.event.title', $this->event->title)
            ->assertJsonPath('attendance.status', 'late')
            ->assertJsonPath('attendance.timeOut', null);

        $this->assertDatabaseHas('attendances', [
            'registration_id' => $this->registration->id,
            'attendance_status' => 'late',
            'time_out' => null,
        ]);

        $this->assertNotNull(
            Attendance::query()->where('registration_id', $this->registration->id)->value('time_in')
        );
    }

    public function test_student_cannot_check_in_without_an_active_registration(): void
    {
        $otherStudent = $this->createStudent();
        Sanctum::actingAs($otherStudent);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertNotFound();

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_student_cannot_check_in_twice_for_the_same_registration(): void
    {
        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie('first.png'),
        ])->assertCreated();

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie('duplicate.png'),
        ])->assertStatus(409);

        $this->assertDatabaseCount('attendances', 1);
        $this->assertCount(1, Storage::disk('local')->allFiles('attendance/selfies'));
    }

    public function test_student_cannot_have_two_active_event_sessions(): void
    {
        $secondEvent = $this->createEvent();
        $this->createRegistration($this->student, $secondEvent);

        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertCreated();

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $secondEvent->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertStatus(409);

        $this->assertDatabaseCount('attendances', 1);
    }

    public function test_student_cannot_use_the_attendance_out_token_for_check_in(): void
    {
        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_out_token,
            'selfie' => $this->selfie(),
        ])->assertNotFound();

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_check_in_is_rejected_outside_the_event_schedule(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-23 08:30:00', 'Asia/Manila'));
        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertStatus(409);

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_student_can_check_out_with_the_event_out_qr_token(): void
    {
        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertCreated();

        Carbon::setTestNow($this->testNow->copy()->addMinutes(45));

        $this->postJson('/api/student/attendance/check-out', [
            'qr_token' => $this->event->qr_out_token,
            'selfie' => $this->selfie(),
        ])
            ->assertOk()
            ->assertJsonPath('attendance.event.id', $this->event->id)
            ->assertJsonPath('attendance.status', 'late');

        $this->assertNotNull(
            Attendance::query()->where('registration_id', $this->registration->id)->value('time_out')
        );
    }

    public function test_student_cannot_check_out_without_an_active_session(): void
    {
        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-out', [
            'qr_token' => $this->event->qr_out_token,
            'selfie' => $this->selfie(),
        ])->assertStatus(409);
    }

    public function test_student_cannot_check_out_with_another_events_qr_token(): void
    {
        $otherEvent = $this->createEvent();
        $this->createRegistration($this->student, $otherEvent);

        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertCreated();

        $this->postJson('/api/student/attendance/check-out', [
            'qr_token' => $otherEvent->qr_out_token,
            'selfie' => $this->selfie(),
        ])->assertStatus(409);

        $this->assertDatabaseHas('attendances', [
            'registration_id' => $this->registration->id,
            'time_out' => null,
        ]);
    }

    public function test_student_cannot_check_out_twice(): void
    {
        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertCreated();

        $this->postJson('/api/student/attendance/check-out', [
            'qr_token' => $this->event->qr_out_token,
            'selfie' => $this->selfie('first-out.png'),
        ])->assertOk();

        $this->postJson('/api/student/attendance/check-out', [
            'qr_token' => $this->event->qr_out_token,
            'selfie' => $this->selfie('duplicate-out.png'),
        ])->assertStatus(409);
    }

    public function test_active_attendance_endpoint_returns_only_the_students_active_session(): void
    {
        Sanctum::actingAs($this->student);

        $this->getJson('/api/student/attendance/active')
            ->assertOk()
            ->assertJsonPath('activeSession', null);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertCreated();

        $this->getJson('/api/student/attendance/active')
            ->assertOk()
            ->assertJsonPath('activeSession.event.id', $this->event->id)
            ->assertJsonPath('activeSession.timeOut', null);
    }

    public function test_attendance_routes_require_an_authenticated_student_account(): void
    {
        $this->getJson('/api/student/attendance/active')->assertUnauthorized();

        Sanctum::actingAs(User::factory()->organizer()->create());

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
        ])->assertForbidden();
    }

    public function test_attendance_requires_the_event_qr_token(): void
    {
        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'selfie' => $this->selfie(),
        ])->assertUnprocessable()->assertJsonValidationErrors('qr_token');

        $this->postJson('/api/student/attendance/check-in', [
            'event_id' => $this->event->id,
            'email' => $this->student->email,
            'selfie' => $this->selfie(),
        ])->assertUnprocessable()->assertJsonValidationErrors('qr_token');

        $this->assertDatabaseCount('attendances', 0);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertCreated();

        $this->postJson('/api/student/attendance/check-out', [
            'selfie' => $this->selfie(),
        ])->assertUnprocessable()->assertJsonValidationErrors('qr_token');

        $this->postJson('/api/student/attendance/check-out', [
            'email' => $this->student->email,
            'selfie' => $this->selfie(),
        ])->assertUnprocessable()->assertJsonValidationErrors('qr_token');

        $this->assertDatabaseHas('attendances', [
            'registration_id' => $this->registration->id,
            'time_out' => null,
        ]);
    }

    private function selfie(string $name = 'selfie.png'): UploadedFile
    {
        return UploadedFile::fake()->create($name, 100, 'image/png');
    }

    private function createStudent(?string $email = null): User
    {
        $student = new User();
        $student->forceFill([
            'name' => 'Test Student',
            'email' => $email ?? 'student-'.Str::uuid().'@school.edu.ph',
            'password' => bcrypt('Password123!'),
            'role' => 'student',
            'status' => 'active',
        ]);
        $student->save();

        return $student->refresh();
    }

    private function createEvent(): Event
    {
        $organizerUser = User::factory()->organizer()->create([
            'status' => 'active',
        ]);

        $organizer = EventOrganizer::query()->create([
            'user_id' => $organizerUser->id,
            'organization_name' => 'Test Organization',
        ]);

        return Event::factory()->create([
            'organizer_id' => $organizer->id,
            'event_date' => $this->testNow->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'status' => 'published',
            'review_status' => 'approved',
            'require_school_gmail' => true,
        ]);
    }

    private function createRegistration(
        User $student,
        Event $event,
        string $status = 'registered',
    ): Registration {
        return Registration::query()->create([
            'user_id' => $student->id,
            'event_id' => $event->id,
            'qr_token' => (string) Str::uuid(),
            'status' => $status,
            'registered_at' => now(),
        ]);
    }

    public function test_student_cannot_check_in_with_a_registration_ticket_token(): void
    {
        $otherStudent = $this->createStudent();
        $otherRegistration = $this->createRegistration($otherStudent, $this->event);

        Sanctum::actingAs($this->student);

        foreach ([$this->registration->qr_token, $otherRegistration->qr_token] as $ticketToken) {
            $this->postJson('/api/student/attendance/check-in', [
                'qr_token' => $ticketToken,
                'selfie' => $this->selfie(),
            ])->assertNotFound();
        }

        $this->assertDatabaseCount('attendances', 0);
        $this->assertSame([], Storage::disk('local')->allFiles('attendance/selfies'));
    }
}