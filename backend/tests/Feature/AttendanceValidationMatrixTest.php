<?php

namespace Tests\Feature;

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
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Backend validation rules that must hold for logged-in student attendance
 * and guest attendance alike. Rules already covered by AttendanceApiTest,
 * GuestAttendanceApiTest and AttendanceEvidenceApiTest are not repeated here.
 */
class AttendanceValidationMatrixTest extends TestCase
{
    use RefreshDatabase;

    private Carbon $testNow;

    private User $student;

    private Event $event;

    private Registration $registration;

    private static int $studentSequence = 0;

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

    /** @return array<string, array{string, string}> */
    public static function unavailableEvents(): array
    {
        return [
            'pending review' => ['published', 'pending'],
            'flagged' => ['published', 'flagged'],
            'draft' => ['draft', 'approved'],
            'cancelled' => ['cancelled', 'approved'],
        ];
    }

    /** @return array<string, array{string}> */
    public static function outsideScheduleTimes(): array
    {
        return [
            'before the event starts' => ['08:30:00'],
            'after the event ends' => ['12:30:00'],
        ];
    }

    /** @return array<string, array{string, string}> */
    public static function mismatchedGuestDetails(): array
    {
        return [
            'student id' => ['student_id', '2026-99999'],
            'name' => ['name', 'A Different Student'],
            'email' => ['email', 'someone-else@school.edu.ph'],
            'course' => ['course', 'BS Accountancy'],
            'year level' => ['year_level', '1st Year'],
        ];
    }

    public function test_logged_in_student_rejects_an_unknown_qr_token_for_check_in_and_check_out(): void
    {
        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => (string) Str::uuid(),
            'selfie' => $this->selfie(),
        ])->assertNotFound();

        $this->postJson('/api/student/attendance/check-out', [
            'qr_token' => (string) Str::uuid(),
            'selfie' => $this->selfie(),
        ])->assertNotFound();

        $this->assertDatabaseCount('attendances', 0);
        $this->assertSame([], Storage::disk('local')->allFiles('attendance/selfies'));
    }

    public function test_logged_in_student_cannot_check_out_with_the_attendance_in_qr_token(): void
    {
        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertCreated();

        $this->postJson('/api/student/attendance/check-out', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertNotFound();

        $this->assertDatabaseHas('attendances', [
            'registration_id' => $this->registration->id,
            'time_out' => null,
        ]);
    }

    #[DataProvider('unavailableEvents')]
    public function test_logged_in_student_cannot_check_in_to_an_unavailable_event(
        string $status,
        string $reviewStatus,
    ): void {
        $this->updateEvent(['status' => $status, 'review_status' => $reviewStatus]);

        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertNotFound();

        $this->assertDatabaseCount('attendances', 0);
        $this->assertSame([], Storage::disk('local')->allFiles('attendance/selfies'));
    }

    public function test_logged_in_student_cannot_check_in_after_the_event_ends(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-23 12:30:00', 'Asia/Manila'));
        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertStatus(409);

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_logged_in_student_cannot_check_in_with_a_cancelled_registration(): void
    {
        Registration::query()
            ->whereKey($this->registration->id)
            ->update(['status' => 'cancelled']);

        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertNotFound();

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_logged_in_student_attendance_requires_a_selfie(): void
    {
        Sanctum::actingAs($this->student);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
        ])->assertUnprocessable()->assertJsonValidationErrors('selfie');

        $this->assertDatabaseCount('attendances', 0);

        $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertCreated();

        $this->postJson('/api/student/attendance/check-out', [
            'qr_token' => $this->event->qr_out_token,
        ])->assertUnprocessable()->assertJsonValidationErrors('selfie');

        $this->assertDatabaseHas('attendances', [
            'registration_id' => $this->registration->id,
            'time_out' => null,
        ]);
    }

    public function test_guest_check_out_rejects_an_unknown_qr_token(): void
    {
        $this->post('/api/attendance/guest/check-out', [
            ...$this->studentPayload(),
            'qr_token' => (string) Str::uuid(),
            'selfie' => $this->selfie(),
        ])->assertNotFound();

        $this->assertDatabaseCount('attendances', 0);
        $this->assertSame([], Storage::disk('local')->allFiles('attendance/selfies'));
    }

    public function test_guest_cannot_use_the_qr_token_of_the_wrong_action(): void
    {
        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_out_token,
            'selfie' => $this->selfie(),
        ])->assertNotFound();

        $this->assertDatabaseCount('attendances', 0);

        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertCreated();

        $this->post('/api/attendance/guest/check-out', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertNotFound();

        $this->assertDatabaseHas('attendances', [
            'registration_id' => $this->registration->id,
            'time_out' => null,
        ]);
    }

    #[DataProvider('unavailableEvents')]
    public function test_guest_cannot_check_in_to_an_unavailable_event(
        string $status,
        string $reviewStatus,
    ): void {
        $this->updateEvent(['status' => $status, 'review_status' => $reviewStatus]);

        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertNotFound();

        $this->assertDatabaseCount('attendances', 0);
        $this->assertSame([], Storage::disk('local')->allFiles('attendance/selfies'));
    }

    #[DataProvider('outsideScheduleTimes')]
    public function test_guest_cannot_check_in_outside_the_event_schedule(string $time): void
    {
        Carbon::setTestNow(Carbon::parse("2026-11-23 {$time}", 'Asia/Manila'));

        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertStatus(409);

        $this->assertDatabaseCount('attendances', 0);
        $this->assertSame([], Storage::disk('local')->allFiles('attendance/selfies'));
    }

    public function test_guest_cannot_check_in_with_a_cancelled_registration(): void
    {
        Registration::query()
            ->whereKey($this->registration->id)
            ->update(['status' => 'cancelled']);

        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertUnprocessable();

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_guest_cannot_check_out_twice(): void
    {
        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertCreated();

        Carbon::setTestNow($this->testNow->copy()->addMinutes(45));

        $this->post('/api/attendance/guest/check-out', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_out_token,
            'selfie' => $this->selfie(),
        ])->assertOk();

        $this->post('/api/attendance/guest/check-out', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_out_token,
            'selfie' => $this->selfie(),
        ])->assertStatus(409);
    }

    #[DataProvider('mismatchedGuestDetails')]
    public function test_guest_attendance_rejects_a_mismatched_detail(string $field, string $value): void
    {
        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload([$field => $value]),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertUnprocessable();

        $this->assertDatabaseCount('attendances', 0);

        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertCreated();

        $this->post('/api/attendance/guest/check-out', [
            ...$this->studentPayload([$field => $value]),
            'qr_token' => $this->event->qr_out_token,
            'selfie' => $this->selfie(),
        ])->assertUnprocessable();

        $this->assertDatabaseHas('attendances', [
            'registration_id' => $this->registration->id,
            'time_out' => null,
        ]);
    }

    public function test_guest_check_out_requires_a_selfie(): void
    {
        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie(),
        ])->assertCreated();

        $this->post('/api/attendance/guest/check-out', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_out_token,
        ])->assertUnprocessable()->assertJsonValidationErrors('selfie');

        $this->assertDatabaseHas('attendances', [
            'registration_id' => $this->registration->id,
            'time_out' => null,
        ]);
    }

    /** @param array<string, string> $overrides */
    private function updateEvent(array $overrides): void
    {
        Event::query()->whereKey($this->event->id)->update($overrides);
    }

    private function selfie(): UploadedFile
    {
        return UploadedFile::fake()->create('selfie.png', 100, 'image/png');
    }

    /**
     * @param array<string, string> $overrides
     * @return array<string, mixed>
     */
    private function studentPayload(array $overrides = []): array
    {
        return [
            'student_id' => $this->student->student_id,
            'name' => $this->student->name,
            'email' => $this->student->email,
            'course' => $this->student->course,
            'year_level' => $this->student->year_level,
            ...$overrides,
        ];
    }

    private function createStudent(): User
    {
        $student = new User();

        $student->forceFill([
            'name' => 'Test Student',
            'email' => 'student-'.Str::uuid().'@school.edu.ph',
            'password' => bcrypt('Password123!'),
            'role' => 'student',
            'status' => 'active',
            'student_id' => sprintf('2026-%05d', 40000 + ++self::$studentSequence),
            'course' => 'BS Information Technology',
            'year_level' => '3rd Year',
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

    private function createRegistration(User $student, Event $event): Registration
    {
        return Registration::query()->create([
            'user_id' => $student->id,
            'event_id' => $event->id,
            'qr_token' => (string) Str::uuid(),
            'status' => 'registered',
            'registered_at' => now(),
        ]);
    }
}