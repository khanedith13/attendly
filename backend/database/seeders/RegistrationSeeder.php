<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Registration;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class RegistrationSeeder extends Seeder
{
    public function run(): void
    {
        $demoStudent = User::findOrFail(2);
        $events = Event::where('status', 'published')
            ->where('review_status', 'approved')
            ->orderBy('id')
            ->get();

        foreach ($events as $index => $event) {
            if ($index < 4) {
                $students = collect([$demoStudent]);
            } else {
                $students = User::where('role', 'student')
                    ->where('status', 'active')
                    ->whereKeyNot($demoStudent->id)
                    ->inRandomOrder()
                    ->take(fake()->numberBetween(15, 40))
                    ->get();
            }

            foreach ($students as $student) {
                $registration = Registration::create([
                    'user_id' => $student->id,
                    'event_id' => $event->id,
                ]);

                if ($event->event_date->isBefore(today())) {
                    $this->createPastAttendance($registration, $event);
                }
            }
        }
    }

    private function createPastAttendance(Registration $registration, Event $event): void
    {
        $arrival = Carbon::parse($event->event_date->toDateString().' '.$event->start_time)
            ->addMinutes(fake()->numberBetween(0, 25));
        $departure = Carbon::parse($event->event_date->toDateString().' '.$event->end_time)
            ->subMinutes(fake()->numberBetween(0, 10));

        $attendance = new Attendance([
            'registration_id' => $registration->id,
            'time_in' => $arrival,
            'time_out' => $departure,
        ]);
        $attendance->attendance_status = $arrival->gt(
            Carbon::parse($event->event_date->toDateString().' '.$event->start_time)->addMinutes(15)
        ) ? 'late' : 'present';
        $attendance->save();
    }
}