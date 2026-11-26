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
use Tests\TestCase;

class GuestAttendanceApiTest extends TestCase
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
        $this->registration = $this->createRegistration(
            $this->student,
            $this->event,
        );
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        app(SettingsService::class)->flush();

        parent::tearDown();
    }

    public function test_guest_can_check_in_with_valid_student_details_and_event_qr_token(): void
    {
        $response = $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => UploadedFile::fake()->create('check-in.png', 100, 'image/png'),
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('attendance.event.id', $this->event->id)
            ->assertJsonPath('attendance.student.studentId', $this->student->student_id)
            ->assertJsonPath('attendance.status', 'late');

        $attendance = Attendance::query()
            ->where('registration_id', $this->registration->id)
            ->firstOrFail();

        $this->assertNotNull($attendance->time_in);
        $this->assertNotNull($attendance->selfie_in_path);
        $this->assertNull($attendance->selfie_out_path);

        $this->assertTrue(Storage::disk('local')->exists($attendance->selfie_in_path));
    }

    public function test_guest_can_check_out_after_checking_in(): void
    {
        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => UploadedFile::fake()->create('check-in.png', 100, 'image/png'),
        ])->assertCreated();

        Carbon::setTestNow($this->testNow->copy()->addMinutes(45));

        $response = $this->post('/api/attendance/guest/check-out', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_out_token,
            'selfie' => UploadedFile::fake()->create('check-out.png', 100, 'image/png'),
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('attendance.event.id', $this->event->id)
            ->assertJsonPath('attendance.student.studentId', $this->student->student_id);

        $attendance = Attendance::query()
            ->where('registration_id', $this->registration->id)
            ->firstOrFail();

        $this->assertNotNull($attendance->time_out);
        $this->assertNotNull($attendance->selfie_in_path);
        $this->assertNotNull($attendance->selfie_out_path);
        $this->assertNotSame($attendance->selfie_in_path, $attendance->selfie_out_path);

        $this->assertTrue(Storage::disk('local')->exists($attendance->selfie_in_path));
        $this->assertTrue(Storage::disk('local')->exists($attendance->selfie_out_path));
    }

    public function test_guest_check_in_rejects_student_details_that_do_not_match(): void
    {
        $payload = $this->studentPayload();
        $payload['name'] = 'A Different Student';

        $this->post('/api/attendance/guest/check-in', [
            ...$payload,
            'qr_token' => $this->event->qr_in_token,
            'selfie' => UploadedFile::fake()->create('selfie.png', 100, 'image/png'),
        ])->assertUnprocessable();

        $this->assertDatabaseCount('attendances', 0);

        $this->assertCount(0, Storage::disk('local')->allFiles('attendance/selfies'));
    }

    public function test_guest_check_in_rejects_a_student_without_an_active_registration(): void
    {
        $unregisteredStudent = $this->createStudent();

        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload($unregisteredStudent),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => UploadedFile::fake()->create('selfie.png', 100, 'image/png'),
        ])->assertUnprocessable();

        $this->assertDatabaseCount('attendances', 0);

        $this->assertCount(0, Storage::disk('local')->allFiles('attendance/selfies'));
    }

    public function test_guest_check_in_rejects_an_unknown_valid_format_qr_token(): void
    {
        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => (string) Str::uuid(),
            'selfie' => UploadedFile::fake()->create('selfie.png', 100, 'image/png'),
        ])->assertNotFound();

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_guest_check_in_rejects_a_malformed_qr_token(): void
    {
        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => 'not-a-uuid',
            'selfie' => UploadedFile::fake()->create('selfie.png', 100, 'image/png'),
        ])->assertUnprocessable()->assertJsonValidationErrors('qr_token');

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_guest_check_in_requires_a_selfie(): void
    {
        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
        ])->assertUnprocessable()->assertJsonValidationErrors('selfie');

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_guest_check_in_rejects_a_non_image_selfie(): void
    {
        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => UploadedFile::fake()->create(
                'document.pdf',
                100,
                'application/pdf',
            ),
        ])->assertUnprocessable()->assertJsonValidationErrors('selfie');

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_guest_cannot_check_in_twice_for_the_same_registration(): void
    {
        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => UploadedFile::fake()->create('selfie.png', 100, 'image/png'),
        ])->assertCreated();

        $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => UploadedFile::fake()->create('duplicate.png', 100, 'image/png'),
        ])->assertStatus(409);

        $this->assertDatabaseCount('attendances', 1);

        $this->assertCount(1, Storage::disk('local')->allFiles('attendance/selfies'));
    }

    public function test_guest_cannot_check_out_without_an_active_attendance_session(): void
    {
        $this->post('/api/attendance/guest/check-out', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_out_token,
            'selfie' => UploadedFile::fake()->create('selfie.png', 100, 'image/png'),
        ])->assertStatus(409);

        $this->assertDatabaseCount('attendances', 0);
    }

    private function studentPayload(?User $student = null): array
    {
        $student ??= $this->student;

        return [
            'student_id' => $student->student_id,
            'name' => $student->name,
            'email' => $student->email,
            'course' => $student->course,
            'year_level' => $student->year_level,
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
            'student_id' => sprintf('2026-%05d', 10000 + ++self::$studentSequence),
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

    private function createRegistration(
        User $student,
        Event $event,
    ): Registration {
        return Registration::query()->create([
            'user_id' => $student->id,
            'event_id' => $event->id,
            'qr_token' => (string) Str::uuid(),
            'status' => 'registered',
            'registered_at' => now(),
        ]);
    }
}