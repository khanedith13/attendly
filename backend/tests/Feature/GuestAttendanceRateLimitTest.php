<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuestAttendanceRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_attendance_allows_a_venue_of_students_on_one_ip_up_to_the_ip_limit(): void
    {
        for ($i = 1; $i <= 300; $i++) {
            $response = $this->postJson('/api/attendance/guest/check-in', [
                'student_id' => sprintf('2026-%05d', $i),
            ]);

            $this->assertNotSame(429, $response->status(), "Request {$i} was throttled.");
        }

        $this->postJson('/api/attendance/guest/check-in', [
            'student_id' => '2026-99999',
        ])->assertStatus(429);
    }

    public function test_guest_attendance_limits_repeated_attempts_for_one_student(): void
    {
        for ($i = 1; $i <= 10; $i++) {
            $this->postJson('/api/attendance/guest/check-out', [
                'student_id' => '2026-12345',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/attendance/guest/check-out', [
            'student_id' => '2026-12345',
        ])->assertStatus(429);

        $this->postJson('/api/attendance/guest/check-out', [
            'student_id' => '2026-54321',
        ])->assertUnprocessable();
    }
}