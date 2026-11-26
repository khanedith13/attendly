<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AuditLog;
use App\Models\Event;
use App\Models\EventOrganizer;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminEventAttendanceDashboardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_non_draft_events_with_registration_counts(): void
    {
        $admin = User::factory()->admin()->create();
        $organizer = $this->organizer();
        $visible = Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'status' => 'published',
            'review_status' => 'pending',
        ]);
        Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'status' => 'draft',
        ]);
        Registration::create([
            'user_id' => User::factory()->create()->id,
            'event_id' => $visible->id,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/events')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $visible->id)
            ->assertJsonPath('0.registered', 1)
            ->assertJsonPath('0.review', 'pending')
            ->assertJsonPath('0.organizer', $organizer->organizer->organization_name);
    }

    public function test_admin_can_flag_and_clear_an_event_with_audit_entries(): void
    {
        $admin = User::factory()->admin()->create();
        $organizer = $this->organizer();
        $event = Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'review_status' => 'pending',
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/events/{$event->id}/review", [
            'status' => 'flagged',
            'note' => 'The event details need policy review.',
        ])
            ->assertOk()
            ->assertJsonPath('review', 'flagged')
            ->assertJsonPath('reviewNote', 'The event details need policy review.');

        $this->patchJson("/api/admin/events/{$event->id}/review", [
            'status' => 'approved',
        ])
            ->assertOk()
            ->assertJsonPath('review', 'approved')
            ->assertJsonPath('reviewNote', '');

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->id,
            'action' => 'Flagged event',
            'target' => $event->title,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->id,
            'action' => 'Cleared event flag',
            'target' => $event->title,
        ]);
    }

    public function test_flagging_requires_a_reason_and_cancelled_events_cannot_be_flagged(): void
    {
        $admin = User::factory()->admin()->create();
        $organizer = $this->organizer();
        $event = Event::factory()->create(['organizer_id' => $organizer->organizer->id]);
        $cancelled = Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'status' => 'cancelled',
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/events/{$event->id}/review", [
            'status' => 'flagged',
            'note' => 'Too short',
        ])->assertUnprocessable()->assertJsonValidationErrors('note');

        $this->patchJson("/api/admin/events/{$cancelled->id}/review", [
            'status' => 'flagged',
            'note' => 'This cancelled event requires policy review.',
        ])->assertStatus(409);
    }

    public function test_admin_attendance_report_includes_present_late_and_absent_records(): void
    {
        $admin = User::factory()->admin()->create();
        $organizer = $this->organizer();

        $lateStudent = User::factory()->create(['student_id' => 'STU-LATE']);
        $lateEvent = Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'event_date' => now()->toDateString(),
            'start_time' => now()->subHour()->format('H:i:s'),
            'end_time' => now()->addHour()->format('H:i:s'),
        ]);
        $lateRegistration = Registration::create([
            'user_id' => $lateStudent->id,
            'event_id' => $lateEvent->id,
        ]);
        $lateAttendance = Attendance::create([
            'registration_id' => $lateRegistration->id,
            'time_in' => now()->subMinutes(20),
        ]);
        $lateAttendance->attendance_status = 'late';
        $lateAttendance->save();

        $absentStudent = User::factory()->create(['student_id' => 'STU-ABSENT']);
        $pastEvent = Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'event_date' => now()->subDay()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
        ]);
        Registration::create([
            'user_id' => $absentStudent->id,
            'event_id' => $pastEvent->id,
        ]);

        $cancelledStudent = User::factory()->create(['student_id' => 'STU-CANCELLED']);
        $cancelledEvent = Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'event_date' => now()->subDay()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'status' => 'cancelled',
        ]);
        Registration::create([
            'user_id' => $cancelledStudent->id,
            'event_id' => $cancelledEvent->id,
        ]);

        $futureStudent = User::factory()->create(['student_id' => 'STU-FUTURE']);
        $futureEvent = Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'event_date' => now()->addDay()->toDateString(),
        ]);
        Registration::create([
            'user_id' => $futureStudent->id,
            'event_id' => $futureEvent->id,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/attendance')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment([
                'name' => $lateStudent->name,
                'studentId' => 'STU-LATE',
                'eventTitle' => $lateEvent->title,
                'outcome' => 'late',
            ])
            ->assertJsonFragment([
                'name' => $absentStudent->name,
                'studentId' => 'STU-ABSENT',
                'eventTitle' => $pastEvent->title,
                'outcome' => 'absent',
            ]);
    }

    public function test_admin_dashboard_returns_database_counts_and_recent_activity(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create();
        $pendingOrganizer = $this->organizer('pending');
        $event = Event::factory()->create([
            'organizer_id' => $pendingOrganizer->organizer->id,
            'review_status' => 'pending',
        ]);
        Event::factory()->create([
            'organizer_id' => $pendingOrganizer->organizer->id,
            'review_status' => 'flagged',
        ]);
        AuditLog::create([
            'user_id' => $admin->id,
            'actor_name' => $admin->name,
            'actor_role' => 'admin',
            'action' => 'Created test record',
            'target' => $event->title,
            'result' => 'success',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('stats.users', 3)
            ->assertJsonPath('stats.organizers', 1)
            ->assertJsonPath('review.organizers', 1)
            ->assertJsonPath('review.events', 1)
            ->assertJsonPath('review.flagged', 1)
            ->assertJsonPath('roles.0.role', 'student')
            ->assertJsonPath('activity.0.action', 'Created test record')
            ->assertJsonPath('stats.uptime', null);
    }

    public function test_non_admin_cannot_access_event_attendance_or_dashboard_admin_apis(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/admin/events')->assertForbidden();
        $this->getJson('/api/admin/attendance')->assertForbidden();
        $this->getJson('/api/admin/dashboard')->assertForbidden();
    }

    private function organizer(string $status = 'active'): User
    {
        $user = User::factory()->organizer()->create(['status' => $status]);
        EventOrganizer::create([
            'user_id' => $user->id,
            'organization_name' => 'Test Organization',
        ]);

        return $user;
    }
}