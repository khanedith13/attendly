<?php

namespace Database\Factories;

use App\Models\EventOrganizer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EventOrganizer>
 */
class EventOrganizerFactory extends Factory
{
    protected $model = EventOrganizer::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->organizer(),
            'organization_name' => fake()->company(),
            'contact_number' => fake()->phoneNumber(),
        ];
    }
}