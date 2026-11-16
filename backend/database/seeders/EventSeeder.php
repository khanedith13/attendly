<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\EventOrganizer;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Seeder;

class EventSeeder extends Seeder
{
    public function run(): void
    {
        $events = [
            ['owner' => 'Events Team', 'title' => 'AI & Future Skills Summit', 'venue' => 'Innovation Hall, Main Campus', 'category' => 'Technology', 'day' => 0, 'start' => '16:30', 'end' => '19:30', 'capacity' => 300],
            ['owner' => 'Events Team', 'title' => 'Toastmasters Leadership Lab', 'venue' => 'Room 204, Business Building', 'category' => 'Leadership', 'day' => 3, 'start' => '09:00', 'end' => '12:00', 'capacity' => 120],
            ['owner' => 'Events Team', 'title' => 'Talent Acquisition 101', 'venue' => 'Career Center, Main Campus', 'category' => 'Career', 'day' => 5, 'start' => '13:00', 'end' => '16:00', 'capacity' => 200],
            ['owner' => 'Events Team', 'title' => 'Student Innovation Expo', 'venue' => 'Grand Atrium, Main Campus', 'category' => 'Technology', 'day' => 8, 'start' => '10:30', 'end' => '15:00', 'capacity' => 500],
            ['owner' => 'Events Team', 'title' => 'Campus Volunteer Day', 'venue' => 'Community Hall, South Campus', 'category' => 'Community', 'day' => 11, 'start' => '14:00', 'end' => '17:00', 'capacity' => 160],
            ['owner' => 'Events Team', 'title' => 'Digital Skills Bootcamp', 'venue' => 'Computer Lab 3, Tech Building', 'category' => 'Technology', 'day' => 14, 'start' => '08:30', 'end' => '12:30', 'capacity' => 80],
            ['owner' => 'Events Team', 'title' => 'Career Kickoff', 'venue' => 'Main Hall, Main Campus', 'category' => 'Career', 'day' => -6, 'start' => '09:00', 'end' => '12:00', 'capacity' => 200],
            ['owner' => 'Events Team', 'title' => 'Student Leaders Forum', 'venue' => 'Room 101, Business Building', 'category' => 'Leadership', 'day' => -9, 'start' => '13:00', 'end' => '16:00', 'capacity' => 250],
            ['owner' => 'Events Team', 'title' => 'Night Run Fundraiser', 'venue' => 'University Oval, Main Campus', 'category' => 'Community', 'day' => 20, 'start' => '17:00', 'end' => '20:00', 'capacity' => 250, 'status' => 'draft'],
            ['owner' => 'Computer Science Society', 'title' => 'Hackathon 2026', 'venue' => 'Computer Lab 3, Tech Building', 'category' => 'Technology', 'day' => 9, 'start' => '09:00', 'end' => '21:00', 'capacity' => 150, 'review_status' => 'pending'],
            ['owner' => 'Toastmasters Club', 'title' => 'Public Speaking Workshop', 'venue' => 'Room 204, Business Building', 'category' => 'Leadership', 'day' => 6, 'start' => '14:00', 'end' => '17:00', 'capacity' => 80, 'review_status' => 'pending'],
            ['owner' => 'Student Council', 'title' => 'Charity Bake Sale', 'venue' => 'Community Hall, South Campus', 'category' => 'Community', 'day' => 4, 'start' => '10:00', 'end' => '15:00', 'capacity' => 200, 'review_status' => 'pending'],
            ['owner' => 'Student Council', 'title' => 'Alumni Networking Night', 'venue' => 'Grand Atrium, Main Campus', 'category' => 'Career', 'day' => 12, 'start' => '18:00', 'end' => '21:00', 'capacity' => 120, 'review_status' => 'flagged', 'review_note' => 'Reported: venue details are unclear.'],
            ['owner' => 'Computer Science Society', 'title' => 'Mid-semester Mixer', 'venue' => 'University Oval, Main Campus', 'category' => 'Community', 'day' => 7, 'start' => '17:00', 'end' => '20:00', 'capacity' => 300, 'review_status' => 'flagged', 'review_note' => 'Reported: alcohol mentioned in the description.'],
        ];

        foreach ($events as $event) {
            $owner = EventOrganizer::where('organization_name', $event['owner'])->first();

            if (! $owner) {
                throw new ModelNotFoundException("Organizer profile not found: {$event['owner']}");
            }

            $this->make($owner, $event);
        }
    }

    private function make(EventOrganizer $organizer, array $data): Event
    {
        $event = new Event([
            'organizer_id' => $organizer->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'venue' => $data['venue'],
            'event_date' => now()->addDays($data['day'])->toDateString(),
            'start_time' => $data['start'].':00',
            'end_time' => $data['end'].':00',
            'capacity' => $data['capacity'],
            'require_school_gmail' => true,
            'send_confirmation_email' => true,
        ]);

        $event->status = $data['status'] ?? 'published';
        $event->review_status = $data['review_status'] ?? 'approved';
        $event->review_note = $data['review_note'] ?? null;
        $event->save();

        return $event;
    }
}