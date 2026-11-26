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
use Tests\TestCase;

class AttendanceReceiptApiTest extends TestCase
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

    public function test_logged_in_student_receipts_include_signed_selfie_links(): void
    {
        Sanctum::actingAs($this->student);

        $checkIn = $this->postJson('/api/student/attendance/check-in', [
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie('in.png'),
        ])
            ->assertCreated()
            ->assertJsonPath('attendance.selfieOutUrl', null);

        $selfieInUrl = $checkIn->json('attendance.selfieInUrl');

        $this->assertNotNull($selfieInUrl);

        $this->getJson('/api/student/attendance/active')
            ->assertOk()
            ->assertJsonPath('activeSession.selfieInUrl', fn ($url) => filled($url))
            ->assertJsonPath('activeSession.selfieOutUrl', null);

        Carbon::setTestNow($this->testNow->copy()->addMinutes(45));

        $checkOut = $this->postJson('/api/student/attendance/check-out', [
            'qr_token' => $this->event->qr_out_token,
            'selfie' => $this->selfie('out.png'),
        ])
            ->assertOk()
            ->assertJsonPath('attendance.timeIn', fn ($time) => filled($time))
            ->assertJsonPath('attendance.timeOut', fn ($time) => filled($time));

        $this->get($checkOut->json('attendance.selfieInUrl'))->assertOk();
        $this->get($checkOut->json('attendance.selfieOutUrl'))->assertOk();
    }

    public function test_guest_receipts_include_signed_selfie_links(): void
    {
        $checkIn = $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie('in.png'),
        ])
            ->assertCreated()
            ->assertJsonPath('attendance.selfieOutUrl', null);

        $this->assertNotNull($checkIn->json('attendance.selfieInUrl'));

        Carbon::setTestNow($this->testNow->copy()->addMinutes(45));

        $checkOut = $this->post('/api/attendance/guest/check-out', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_out_token,
            'selfie' => $this->selfie('out.png'),
        ])->assertOk();

        $this->get($checkOut->json('attendance.selfieInUrl'))->assertOk();
        $this->get($checkOut->json('attendance.selfieOutUrl'))->assertOk();
    }

    public function test_selfie_link_rejects_a_tampered_unsigned_or_expired_request(): void
    {
        $response = $this->post('/api/attendance/guest/check-in', [
            ...$this->studentPayload(),
            'qr_token' => $this->event->qr_in_token,
            'selfie' => $this->selfie('in.png'),
        ])->assertCreated();

        $url = $response->json('attendance.selfieInUrl');
        $attendanceId = $response->json('attendance.id');

        $this->get(preg_replace('/signature=[^&]+/', 'signature=invalid', $url))
            ->assertForbidden();

        $this->get("/api/attendance/selfies/{$attendanceId}/in")
            ->assertForbidden();

        Carbon::setTestNow($this->testNow->copy()->addMinutes(31));

        $this->get($url)->assertForbidden();
    }

    public function test_selfie_link_returns_not_found_for_an_unknown_direction(): void
    {
        $this->get('/api/attendance/selfies/1/sideways')->assertNotFound();
    }

    private function selfie(string $name): UploadedFile
    {
        return UploadedFile::fake()->create($name, 100, 'image/png');
    }

    private function studentPayload(): array
    {
        return [
            'student_id' => $this->student->student_id,
            'name' => $this->student->name,
            'email' => $this->student->email,
            'course' => $this->student->course,
            'year_level' => $this->student->year_level,
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
            'student_id' => sprintf('2026-%05d', 30000 + ++self::$studentSequence),
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