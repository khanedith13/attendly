<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class RegistrationService
{
    /**
     * Register a student for an event.
     *
     * The event row is locked during the transaction so simultaneous
     * registrations cannot exceed the event capacity.
     */
    public function register(User $user, int $eventId): Registration
    {
        return DB::transaction(function () use ($user, $eventId) {
            $event = Event::query()
                ->whereKey($eventId)
                ->lockForUpdate()
                ->first();

            if (! $event) {
                throw new NotFoundHttpException('Event not found.');
            }

            if (
                $event->status !== 'published'
                || $event->review_status !== 'approved'
            ) {
                throw new NotFoundHttpException('Event not found.');
            }

            $eventStartsAt = $this->eventStartsAt($event);

            if ($eventStartsAt->isPast()) {
                throw new ConflictHttpException(
                    'Registration is closed for this event.'
                );
            }

            $existing = Registration::query()
                ->where('user_id', $user->id)
                ->where('event_id', $event->id)
                ->lockForUpdate()
                ->first();

            if ($existing && $existing->status === 'registered') {
                throw new ConflictHttpException(
                    'You are already registered for this event.'
                );
            }

            $registeredCount = Registration::query()
                ->where('event_id', $event->id)
                ->where('status', 'registered')
                ->count();

            if ($registeredCount >= (int) $event->capacity) {
                throw new ConflictHttpException(
                    'This event is full.'
                );
            }

            if ($existing) {
                $existing->forceFill([
                    'status' => 'registered',
                    'qr_token' => (string) Str::uuid(),
                    'registered_at' => now(),
                ])->save();

                return $existing->fresh(['event']);
            }

            $registration = Registration::create([
                'user_id' => $user->id,
                'event_id' => $event->id,
                'qr_token' => (string) Str::uuid(),
                'status' => 'registered',
                'registered_at' => now(),
            ]);

            return $registration->load('event');
        }, 3);
    }

    /**
     * Cancel a student's registration.
     */
    public function cancel(User $user, int $registrationId): Registration
    {
        return DB::transaction(function () use ($user, $registrationId) {
            $registration = Registration::query()
                ->whereKey($registrationId)
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (! $registration) {
                throw new NotFoundHttpException(
                    'Registration not found.'
                );
            }

            if ($registration->status !== 'registered') {
                throw new ConflictHttpException(
                    'This registration is already cancelled.'
                );
            }

            $event = Event::query()
                ->whereKey($registration->event_id)
                ->lockForUpdate()
                ->first();

            if (! $event) {
                throw new NotFoundHttpException('Event not found.');
            }

            if ($this->eventStartsAt($event)->isPast()) {
                throw new ConflictHttpException(
                    'This event has already started and can no longer be cancelled.'
                );
            }

            $hasCheckedIn = $registration->attendance()
                ->whereNotNull('time_in')
                ->exists();

            if ($hasCheckedIn) {
                throw new ConflictHttpException(
                    'You are checked in to this event. Check out first.'
                );
            }

            $registration->update([
                'status' => 'cancelled',
            ]);

            return $registration->fresh(['event']);
        }, 3);
    }

    /**
     * Build the event start timestamp from the SQL schema's
     * event_date and start_time columns.
     */
    private function eventStartsAt(Event $event): \Illuminate\Support\Carbon
    {
        return \Illuminate\Support\Carbon::parse(
            $event->event_date . ' ' . $event->start_time
        );
    }
}