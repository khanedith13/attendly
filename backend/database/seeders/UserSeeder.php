<?php

namespace Database\Seeders;

use App\Models\EventOrganizer;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Keep these first three IDs aligned with the frontend demo accounts.
        User::factory()->admin()->create([
            'name' => 'Admin',
            'email' => 'admin@school.edu.ph',
            'password' => 'password123',
        ]);

        User::factory()->create([
            'name' => 'Delfin Octobre',
            'email' => 'student@school.edu.ph',
            'password' => 'password123',
            'student_id' => '2026-10452',
            'course' => 'BS Information Technology',
        ]);

        $eventsTeam = User::factory()->organizer()->create([
            'name' => 'Events Team',
            'email' => 'organizer@school.edu.ph',
            'password' => 'password123',
        ]);

        EventOrganizer::create([
            'user_id' => $eventsTeam->id,
            'organization_name' => 'Events Team',
            'contact_number' => '+63 917 123 4567',
        ]);

        User::factory()->admin()->create([
            'name' => 'Paolo Reyes',
            'email' => 'paolo.reyes@school.edu.ph',
            'password' => Str::random(40),
        ]);

        User::factory()->admin()->create([
            'name' => 'Mika Dizon',
            'email' => 'mika.dizon@school.edu.ph',
            'password' => Str::random(40),
        ]);

        for ($index = 0; $index < 40; $index++) {
        $factory = User::factory();

        if ($index % 9 === 4) {
            $factory = $factory->pending();
        } elseif ($index % 17 === 8) {
            $factory = $factory->suspended();
        }

        $factory->create([
            'email' => 'student'.($index + 1).'@school.edu.ph',
            'password' => Str::random(40),
        ]);
    }

        $organizations = [
            ['name' => 'Computer Science Society', 'phone' => '+63 918 555 0142', 'status' => 'active'],
            ['name' => 'Business Student Council', 'phone' => '+63 919 777 0231', 'status' => 'pending'],
            ['name' => 'Photography Club', 'phone' => '+63 915 222 0178', 'status' => 'pending'],
            ['name' => 'Open Mic Collective', 'phone' => '+63 917 303 0099', 'status' => 'suspended'],
            ['name' => 'Toastmasters Club', 'phone' => '+63 916 410 7788', 'status' => 'active'],
            ['name' => 'Student Council', 'phone' => '+63 917 220 4410', 'status' => 'active'],
            ['name' => 'Career Services', 'phone' => '+63 918 600 1200', 'status' => 'pending'],
        ];

        foreach ($organizations as $organization) {
            $user = User::factory()->organizer()->state([
                'status' => $organization['status'],
            ])->create([
                'name' => fake()->name(),
                'email' => Str::slug($organization['name'], '').'@school.edu.ph',
                'password' => Str::random(40),
            ]);

            EventOrganizer::create([
                'user_id' => $user->id,
                'organization_name' => $organization['name'],
                'contact_number' => $organization['phone'],
            ]);
        }
    }
}