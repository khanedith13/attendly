<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CreateAdmin extends Command
{
    protected $signature = 'attendly:create-admin
        {email : Email address of the admin}
        {name : Full name of the admin}';

    protected $description = 'Create an active admin account with a password typed at the prompt';

    public function handle(): int
    {
        $email = Str::lower(trim($this->argument('email')));

        if (User::query()->where('email', $email)->exists()) {
            $this->components->error('A user with this email already exists.');

            return self::FAILURE;
        }

        $password = (string) $this->secret('Password (at least 12 characters)');

        $validator = Validator::make(
            ['email' => $email, 'password' => $password],
            ['email' => ['required', 'email'], 'password' => ['required', 'min:12']],
        );

        if ($validator->fails()) {
            $this->components->error($validator->errors()->first());

            return self::FAILURE;
        }

        $admin = new User();
        $admin->forceFill([
            'name' => trim($this->argument('name')),
            'email' => $email,
            'password' => $password,
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ])->save();

        $this->components->info("Admin {$email} created.");

        return self::SUCCESS;
    }
}