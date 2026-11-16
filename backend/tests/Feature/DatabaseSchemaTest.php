<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class DatabaseSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_student_cannot_register_twice_for_one_event(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->create();

        Registration::create([
            'user_id' => $user->id,
            'event_id' => $event->id,
        ]);

        $this->expectException(UniqueConstraintViolationException::class);

        Registration::create([
            'user_id' => $user->id,
            'event_id' => $event->id,
        ]);
    }

    public function test_demo_accounts_keep_ids_one_two_and_three(): void
    {
        $this->seed();
    
        $demoAccounts = User::whereIn('id', [1, 2, 3])
            ->orderBy('id')
            ->get(['id', 'name', 'email', 'role']);
    
        $this->assertSame([1, 2, 3], $demoAccounts->pluck('id')->all());
        $this->assertSame(
            ['admin@school.edu.ph', 'student@school.edu.ph', 'organizer@school.edu.ph'],
            $demoAccounts->pluck('email')->all(),
        );
        $this->assertSame(['admin', 'student', 'organizer'], $demoAccounts->pluck('role')->all());
    }

    public function test_event_and_registration_qr_tokens_are_generated_as_uuids(): void
    {
        $event = Event::factory()->create();
        $user = User::factory()->create();
        $registration = Registration::create([
            'user_id' => $user->id,
            'event_id' => $event->id,
        ]);

        $this->assertTrue(Str::isUuid($event->qr_in_token));
        $this->assertTrue(Str::isUuid($event->qr_out_token));
        $this->assertTrue(Str::isUuid($registration->qr_token));
        $this->assertNotSame($event->qr_in_token, $event->qr_out_token);
    }

    public function test_attendance_is_limited_to_one_row_per_registration(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->create();
        $registration = Registration::create([
            'user_id' => $user->id,
            'event_id' => $event->id,
        ]);

        Attendance::create(['registration_id' => $registration->id]);

        $this->expectException(UniqueConstraintViolationException::class);

        Attendance::create(['registration_id' => $registration->id]);
    }

    public function test_all_attendly_tables_and_existing_year_level_column_exist(): void
    {
        foreach ([
            'event_organizers',
            'events',
            'registrations',
            'attendances',
            'settings',
            'audit_logs',
        ] as $table) {
            $this->assertTrue(Schema::hasTable($table), "Missing table: {$table}");
        }

        $this->assertTrue(Schema::hasColumn('users', 'year_level'));
    }
}