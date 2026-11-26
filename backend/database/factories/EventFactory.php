<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\EventOrganizer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    protected $model = Event::class;

    public function definition(): array
    {
        return [
            'organizer_id' => EventOrganizer::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->paragraph(),
            'category' => fake()->randomElement(['Technology', 'Leadership', 'Career', 'Community']),
            'venue' => fake()->streetAddress(),
            'event_date' => now()->addDays(fake()->numberBetween(1, 30))->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'capacity' => 100,
            'status' => 'published',
        ];
    }
}