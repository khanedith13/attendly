<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class AttendanceService
{
    public function __construct(
        private readonly SettingsService $settings,
    ) {
    }

    /**
     * Record the authenticated student's attendance-in using the event's
     * Attendance In QR token.
     */
    public function checkIn(User $user, array $data): Attendance
    {
        return DB::transaction(function () use ($user, $data): Attendance {
            // Serialize this student's attendance transitions across events.
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            $event = Event::query()
                ->where('qr_in_token', $data['qr_token'])
                ->lockForUpdate()
                ->first();

            if (! $event) {
                throw new NotFoundHttpException('Attendance-in event not found.');
            }

            $this->assertEventAvailable($event);

            $registration = Registration::query()
                ->where('user_id', $user->id)
                ->where('event_id', $event->id)
                ->where('status', 'registered')
                ->lockForUpdate()
                ->first();

            if (! $registration) {
                throw new NotFoundHttpException(
                    'No active registration was found for this event.'
                );
            }

            return $this->recordCheckIn(
                $user,
                $event,
                $registration,
                $data['selfie_in_path'] ?? null,
            );
        }, 3);
    }

        /** Record attendance-in after matching a guest's details to a registration. */
    public function checkInGuest(array $data): Attendance
    {
        return DB::transaction(function () use ($data): Attendance {
            $event = Event::query()
                ->where('qr_in_token', $data['qr_token'])
                ->first();

            if (! $event) {
                throw new NotFoundHttpException('Attendance-in event not found.');
            }

            $registration = $this->findGuestRegistration($event, $data);

            // Keep the same lock order as authenticated attendance: user, event, registration.
            $user = User::query()->whereKey($registration->user_id)->lockForUpdate()->firstOrFail();
            $event = Event::query()
                ->whereKey($event->id)
                ->where('qr_in_token', $data['qr_token'])
                ->lockForUpdate()
                ->first();

            if (! $event) {
                throw new NotFoundHttpException('Attendance-in event not found.');
            }

            $registration = Registration::query()
                ->whereKey($registration->id)
                ->where('status', 'registered')
                ->lockForUpdate()
                ->first();

            if (! $registration) {
                throw new NotFoundHttpException('No active registration was found for this event.');
            }

            $this->assertEventAvailable($event);
            $this->assertGuestIdentity($user, $data, $event);
            $this->assertAccountIsNotSuspended($user);

            return $this->recordCheckIn(
                $user,
                $event,
                $registration,
                $data['selfie_in_path'] ?? null,
            );
        }, 3);
    }

    /** Record attendance-out after matching a guest's details to a registration. */
    public function checkOutGuest(array $data): Attendance
    {
        return DB::transaction(function () use ($data): Attendance {
            $event = Event::query()
                ->where('qr_out_token', $data['qr_token'])
                ->first();

            if (! $event) {
                throw new NotFoundHttpException('Attendance-out event not found.');
            }

            $registration = $this->findGuestRegistration($event, $data);
            $user = User::query()->whereKey($registration->user_id)->lockForUpdate()->firstOrFail();
            $event = Event::query()
                ->whereKey($event->id)
                ->where('qr_out_token', $data['qr_token'])
                ->lockForUpdate()
                ->first();

            if (! $event) {
                throw new NotFoundHttpException('Attendance-out event not found.');
            }

            $registration = Registration::query()
                ->whereKey($registration->id)
                ->where('status', 'registered')
                ->lockForUpdate()
                ->first();

            if (! $registration) {
                throw new ConflictHttpException('No active registration was found for this event.');
            }

            $this->assertEventApproved($event);
            $this->assertGuestIdentity($user, $data, $event);
            $this->assertAccountIsNotSuspended($user);

            return $this->recordCheckOut(
                $registration,
                $data['selfie_out_path'] ?? null,
            );
        }, 3);
    }

    /**
     * Close the authenticated student's active attendance session using the
     * event's Attendance Out QR token.
     */
    public function checkOut(User $user, array $data): Attendance
    {
        return DB::transaction(function () use ($user, $data): Attendance {
            // Match checkIn() lock ordering to serialize this student's transitions.
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            $event = Event::query()
                ->where('qr_out_token', $data['qr_token'])
                ->lockForUpdate()
                ->first();

            if (! $event) {
                throw new NotFoundHttpException('Attendance-out event not found.');
            }

            $this->assertEventApproved($event);

            $registration = Registration::query()
                ->where('user_id', $user->id)
                ->where('event_id', $event->id)
                ->where('status', 'registered')
                ->lockForUpdate()
                ->first();

            if (! $registration) {
                throw new ConflictHttpException(
                    'No active registration was found for this event.'
                );
            }

            return $this->recordCheckOut(
                $registration,
                $data['selfie_out_path'] ?? null,
            );
        }, 3);
    }

    private function recordCheckIn(
        User $user,
        Event $event,
        Registration $registration,
        ?string $selfiePath,
    ): Attendance {
        $activeSession = Attendance::query()
            ->whereNotNull('time_in')
            ->whereNull('time_out')
            ->whereHas('registration', fn ($query) => $query
                ->where('user_id', $user->id)
                ->where('status', 'registered'))
            ->lockForUpdate()
            ->first();

        if ($activeSession) {
            throw new ConflictHttpException(
                'You already have an active attendance session. Check out first.'
            );
        }

        $attendance = $registration->attendance()->lockForUpdate()->first();

        if ($attendance?->time_in !== null) {
            throw new ConflictHttpException(
                'Attendance in has already been recorded for this registration.'
            );
        }

        $now = now();
        $graceMinutes = $this->settings->int('late_grace_minutes', 15);
        $lateAfter = $event->starts_at->copy()->addMinutes($graceMinutes);

        if (! $attendance) {
            $attendance = new Attendance(['registration_id' => $registration->id]);
        }

        $attendance->forceFill([
            'time_in' => $now,
            'time_out' => null,
            'attendance_status' => $now->gt($lateAfter) ? 'late' : 'present',
            'selfie_in_path' => $selfiePath,
        ])->save();

        return $attendance->fresh(['registration.event', 'registration.user']);
    }

    private function recordCheckOut(
        Registration $registration,
        ?string $selfiePath,
    ): Attendance {
        $attendance = $registration->attendance()->lockForUpdate()->first();

        if (! $attendance || $attendance->time_in === null || $attendance->time_out !== null) {
            throw new ConflictHttpException(
                'There is no active attendance session for this event.'
            );
        }

        $attendance->forceFill([
            'time_out' => now(),
            'selfie_out_path' => $selfiePath,
        ])->save();

        return $attendance->fresh(['registration.event', 'registration.user']);
    }

    private function findGuestRegistration(Event $event, array $data): Registration
    {
        $name = Str::lower(trim($data['name']));
        $email = Str::lower(trim($data['email']));
        $course = Str::lower(trim($data['course']));
        $yearLevel = Str::lower(trim($data['year_level']));

        $registration = Registration::query()
            ->with('user')
            ->where('event_id', $event->id)
            ->where('status', 'registered')
            ->whereHas('user', function ($query) use ($data, $name, $email, $course, $yearLevel): void {
                $query
                    ->where('student_id', trim($data['student_id']))
                    ->whereRaw('LOWER(TRIM(name)) = ?', [$name])
                    ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
                    ->whereRaw('LOWER(TRIM(course)) = ?', [$course])
                    ->whereRaw('LOWER(TRIM(year_level)) = ?', [$yearLevel]);
            })
            ->first();

        if (! $registration) {
            throw new UnprocessableEntityHttpException(
                'The student details do not match an active registration for this event.'
            );
        }

        return $registration;
    }

    private function assertGuestIdentity(User $user, array $data, Event $event): void
    {
        $matches = [
            hash_equals(trim((string) $user->student_id), trim($data['student_id'])),
            hash_equals(Str::lower(trim($user->name)), Str::lower(trim($data['name']))),
            hash_equals(Str::lower(trim($user->email)), Str::lower(trim($data['email']))),
            hash_equals(Str::lower(trim((string) $user->course)), Str::lower(trim($data['course']))),
            hash_equals(Str::lower(trim((string) $user->year_level)), Str::lower(trim($data['year_level']))),
        ];

        if (in_array(false, $matches, true)) {
            throw new UnprocessableEntityHttpException(
                'The student details do not match the registered student profile.'
            );
        }

        $this->assertSchoolEmail($user->email, $event);
    }

    /**
     * Guests carry no login token, so the account status check that the
     * `active` middleware applies to logged-in students is repeated here.
     */
    private function assertAccountIsNotSuspended(User $user): void
    {
        if ($user->status === 'suspended') {
            throw new AccessDeniedHttpException(
                'This account has been suspended. Contact an administrator.'
            );
        }
    }

    private function assertEventApproved(Event $event): void
    {
        if ($event->status !== 'published' || $event->review_status !== 'approved') {
            throw new NotFoundHttpException('Attendance event not found.');
        }
    }

    private function assertEventAvailable(Event $event): void
    {
        $this->assertEventApproved($event);

        $now = now();

        if ($now->lt($event->starts_at) || $now->gt($event->ends_at)) {
            throw new ConflictHttpException(
                'Attendance is available only during the event schedule.'
            );
        }
    }


    /**
     * Return the authenticated student's current active attendance session.
     */
    public function activeFor(User $user): ?Attendance
    {
        return Attendance::query()
            ->with('registration.event')
            ->whereNotNull('time_in')
            ->whereNull('time_out')
            ->whereHas('registration', fn ($query) => $query
                ->where('user_id', $user->id)
                ->where('status', 'registered'))
            ->orderByDesc('time_in')
            ->first();
    }

    private function assertSchoolEmail(string $email, Event $event): void
    {
        if (
            $event->require_school_gmail
            || $this->settings->bool('require_school_gmail')
        ) {
            $schoolDomain = Str::lower(ltrim(trim(
                $this->settings->string('school_domain')
            ), '@'));

            if (
                blank($schoolDomain)
                || ! str_ends_with(Str::lower(trim($email)), '@'.$schoolDomain)
            ) {
                throw new UnprocessableEntityHttpException(
                    'Use the school email address registered to your account.'
                );
            }
        }
    }
}