<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'platform_name' => 'Attendly',
            'school_domain' => config('attendly.school_domain'),
            'require_school_gmail' => 'true',
            'require_event_approval' => 'false',
            'allow_organizer_signup' => 'true',
            'late_grace_minutes' => '15',
            'auto_mark_absent' => 'true',
            'session_timeout_minutes' => '60',
            'two_factor_admins' => 'false',
            'email_new_organizer' => 'true',
            'email_flagged_event' => 'true',
        ];

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}