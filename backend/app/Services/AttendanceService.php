<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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
     * Record the authenticated student's attendance-in using an event QR token,
     * a registration ticket token, or the approved manual event/email fallback.
     */
    public function checkIn(User $user, array $data): Attendance
    {
        return DB::transaction(function () use ($user, $data): Attendance {
            // Serialize this student's attendance transitions across events.
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            if (filled($data['qr_token'] ?? null)) {
                $event = Event::query()
                    ->where('qr_in_token', $data['qr_token'])
                    ->lockForUpdate()
                    ->first();

                if (! $event) {
                    $ticket = Registration::query()
                        ->where('qr_token', $data['qr_token'])
                        ->where('user_id', $user->id)
                        ->where('status', 'registered')
                        ->first();

                    $event = $ticket
                        ? Event::query()->whereKey($ticket->event_id)->lockForUpdate()->first()
                        : null;
                }
            } else {
                $event = Event::query()
                    ->whereKey($data['event_id'])
                    ->lockForUpdate()
                    ->first();
            }

            if (! $event) {
                throw new NotFoundHttpException('Attendance event not found.');
            }

            if (! filled($data['qr_token'] ?? null)) {
                $this->assertManualIdentity($user, $data['email'] ?? null, $event);
            }

            if ($event->status !== 'published' || $event->review_status !== 'approved') {
                throw new NotFoundHttpException('Attendance event not found.');
            }

            $now = now();

            if ($now->lt($event->starts_at) || $now->gt($event->ends_at)) {
                throw new ConflictHttpException(
                    'Attendance is available only during the event schedule.'
                );
            }

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

            $attendance = $registration->attendance()
                ->lockForUpdate()
                ->first();

            if ($attendance?->time_in !== null) {
                throw new ConflictHttpException(
                    'Attendance in has already been recorded for this registration.'
                );
            }

            $graceMinutes = $this->settings->int('late_grace_minutes', 15);
            $lateAfter = $event->starts_at->copy()->addMinutes($graceMinutes);

            if (! $attendance) {
                $attendance = new Attendance([
                    'registration_id' => $registration->id,
                ]);
            }

            $attendance->forceFill([
                'time_in' => $now,
                'time_out' => null,
                'attendance_status' => $now->gt($lateAfter) ? 'late' : 'present',
            ])->save();

            return $attendance->fresh(['registration.event']);
        }, 3);
    }

    /**
     * Close the authenticated student's active attendance session using an
     * event QR token or the approved manual school-email fallback.
     */
    public function checkOut(User $user, array $data): Attendance
    {
        return DB::transaction(function () use ($user, $data): Attendance {
            // Match checkIn() lock ordering to serialize this student's transitions.
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            if (filled($data['qr_token'] ?? null)) {
                $event = Event::query()
                    ->where('qr_out_token', $data['qr_token'])
                    ->lockForUpdate()
                    ->first();

                if (! $event) {
                    throw new NotFoundHttpException('Attendance-out event not found.');
                }
            } else {
                $activeSession = Attendance::query()
                    ->with('registration')
                    ->whereNotNull('time_in')
                    ->whereNull('time_out')
                    ->whereHas('registration', fn ($query) => $query
                        ->where('user_id', $user->id))
                    ->first();

                $eventId = $data['event_id'] ?? $activeSession?->registration?->event_id;

                if (! $eventId) {
                    throw new ConflictHttpException(
                        'You do not have an active attendance session.'
                    );
                }

                $event = Event::query()->whereKey($eventId)->lockForUpdate()->first();

                if (! $event) {
                    throw new NotFoundHttpException('Attendance event not found.');
                }

                $this->assertManualIdentity($user, $data['email'] ?? null, $event);
            }

            $registration = Registration::query()
                ->where('user_id', $user->id)
                ->where('event_id', $event->id)
                ->lockForUpdate()
                ->first();

            if (! $registration) {
                throw new ConflictHttpException(
                    'The active attendance session does not belong to your account.'
                );
            }

            $attendance = $registration->attendance()
                ->lockForUpdate()
                ->first();

            if (! $attendance || $attendance->time_in === null || $attendance->time_out !== null) {
                throw new ConflictHttpException(
                    'There is no active attendance session for this event.'
                );
            }

            $attendance->forceFill([
                'time_out' => now(),
            ])->save();

            return $attendance->fresh(['registration.event']);
        }, 3);
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

    /**
     * Ensure manual attendance is tied to the authenticated account profile.
     */
    private function assertManualIdentity(User $user, ?string $email, Event $event): void
    {
        $registeredEmail = Str::lower(trim($user->email));
        $submittedEmail = Str::lower(trim((string) $email));

        if (blank($submittedEmail) || ! hash_equals($registeredEmail, $submittedEmail)) {
            throw new UnprocessableEntityHttpException(
                'The email address must match your registered account profile.'
            );
        }

        if (
            $event->require_school_gmail
            || $this->settings->bool('require_school_gmail')
        ) {
            $schoolDomain = Str::lower(ltrim(trim(
                $this->settings->string('school_domain')
            ), '@'));

            if (
                blank($schoolDomain)
                || ! str_ends_with($registeredEmail, '@'.$schoolDomain)
            ) {
                throw new UnprocessableEntityHttpException(
                    'Use the school email address registered to your account.'
                );
            }
        }
    }
}