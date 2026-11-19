
<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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
            [
                'admin@school.edu.ph',
                'student@school.edu.ph',
                'organizer@school.edu.ph',
            ],
            $demoAccounts->pluck('email')->all(),
        );

        $this->assertSame(
            ['admin', 'student', 'organizer'],
            $demoAccounts->pluck('role')->all(),
        );
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

        Attendance::create([
            'registration_id' => $registration->id,
        ]);

        $this->expectException(UniqueConstraintViolationException::class);

        Attendance::create([
            'registration_id' => $registration->id,
        ]);
    }

    public function test_all_attendly_tables_and_required_columns_exist(): void
    {
        foreach ([
            'event_organizers',
            'events',
            'registrations',
            'attendances',
            'settings',
            'audit_logs',
        ] as $table) {
            $this->assertTrue(
                Schema::hasTable($table),
                "Missing table: {$table}",
            );
        }

        $this->assertTrue(Schema::hasColumns('users', [
            'name',
            'email',
            'role',
            'status',
            'student_id',
            'course',
            'year_level',
            'notification_preferences',
            'password_changed_at',
        ]));

        $this->assertTrue(Schema::hasColumns('events', [
            'organizer_id',
            'title',
            'category',
            'venue',
            'event_date',
            'start_time',
            'end_time',
            'capacity',
            'status',
            'review_status',
            'qr_in_token',
            'qr_out_token',
        ]));

        $this->assertTrue(Schema::hasColumns('registrations', [
            'user_id',
            'event_id',
            'qr_token',
            'status',
            'registered_at',
        ]));

        $this->assertTrue(Schema::hasColumns('attendances', [
            'registration_id',
            'time_in',
            'time_out',
            'attendance_status',
        ]));

        $this->assertTrue(Schema::hasColumns('audit_logs', [
            'user_id',
            'actor_name',
            'actor_role',
            'action',
            'target',
            'result',
            'ip_address',
            'created_at',
        ]));
    }

    public function test_mysql_check_constraints_exist(): void
    {
        $constraints = collect(DB::select(
            'SELECT CONSTRAINT_NAME
             FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE()
             AND CONSTRAINT_TYPE = ?',
            ['CHECK'],
        ))->pluck('CONSTRAINT_NAME')->all();

        $this->assertContains('chk_events_times', $constraints);
        $this->assertContains('chk_events_capacity', $constraints);
        $this->assertContains('chk_attendance_times', $constraints);
    }

    public function test_foreign_keys_use_the_expected_update_and_delete_rules(): void
    {
        $rules = collect(DB::select(
            'SELECT TABLE_NAME, REFERENCED_TABLE_NAME, UPDATE_RULE, DELETE_RULE
             FROM information_schema.REFERENTIAL_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE()'
        ))->map(fn ($constraint) => [
            $constraint->TABLE_NAME,
            $constraint->REFERENCED_TABLE_NAME,
            strtoupper($constraint->UPDATE_RULE),
            strtoupper($constraint->DELETE_RULE),
        ])->all();

        $this->assertContains(
            ['event_organizers', 'users', 'CASCADE', 'CASCADE'],
            $rules,
        );

        $this->assertContains(
            ['events', 'event_organizers', 'CASCADE', 'RESTRICT'],
            $rules,
        );

        $this->assertContains(
            ['registrations', 'users', 'CASCADE', 'CASCADE'],
            $rules,
        );

        $this->assertContains(
            ['registrations', 'events', 'CASCADE', 'CASCADE'],
            $rules,
        );

        $this->assertContains(
            ['attendances', 'registrations', 'CASCADE', 'CASCADE'],
            $rules,
        );

        $this->assertContains(
            ['audit_logs', 'users', 'CASCADE', 'SET NULL'],
            $rules,
        );
    }

    public function test_timestamp_defaults_match_the_database_specification(): void
    {
        $columns = collect(DB::select(
            "SELECT TABLE_NAME, COLUMN_NAME, COLUMN_DEFAULT, EXTRA
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
             AND (
                (
                    TABLE_NAME IN (
                        'users',
                        'event_organizers',
                        'events',
                        'registrations',
                        'attendances'
                    )
                    AND COLUMN_NAME IN ('created_at', 'updated_at')
                )
                OR (
                    TABLE_NAME = 'settings'
                    AND COLUMN_NAME = 'updated_at'
                )
                OR (
                    TABLE_NAME = 'registrations'
                    AND COLUMN_NAME = 'registered_at'
                )
                OR (
                    TABLE_NAME = 'audit_logs'
                    AND COLUMN_NAME = 'created_at'
                )
             )"
        ))->keyBy(
            fn ($column) => $column->TABLE_NAME.'.'.$column->COLUMN_NAME
        );

        $currentTimestampColumns = [
            'users.created_at',
            'event_organizers.created_at',
            'events.created_at',
            'registrations.registered_at',
            'attendances.created_at',
            'registrations.registered_at',
            'settings.updated_at',
            'audit_logs.created_at',
        ];

        foreach ($currentTimestampColumns as $key) {
            $column = $columns->get($key);

            $this->assertNotNull($column, "Missing timestamp column: {$key}");

            $this->assertStringContainsString(
                'CURRENT_TIMESTAMP',
                strtoupper((string) $column->COLUMN_DEFAULT),
                "Incorrect default for {$key}",
            );
        }

        $autoUpdateColumns = [
            'users.updated_at',
            'event_organizers.updated_at',
            'events.updated_at',
            'registrations.updated_at',
            'attendances.updated_at',
            'settings.updated_at',
        ];

        foreach ($autoUpdateColumns as $key) {
            $column = $columns->get($key);

            $this->assertNotNull($column, "Missing timestamp column: {$key}");

            $this->assertStringContainsString(
                'ON UPDATE CURRENT_TIMESTAMP',
                strtoupper($column->EXTRA),
                "Missing automatic update behavior for {$key}",
            );
        }
    }
}
