<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Services\SettingsService;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreAdminUserRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('name'))) {
            $this->merge(['name' => trim($this->input('name'))]);
        }

        if (is_string($this->input('email'))) {
            $this->merge(['email' => strtolower(trim($this->input('email')))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'role' => ['required', Rule::in(['student', 'organizer', 'admin'])],
            'status' => ['sometimes', Rule::in(['active', 'pending', 'suspended'])],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $settings = app(SettingsService::class);
                $domain = $settings->string('school_domain');
                $email = (string) $this->input('email');

                if (
                    $settings->bool('require_school_gmail')
                    && $domain !== ''
                    && ! str_ends_with($email, '@'.$domain)
                ) {
                    $validator->errors()->add(
                        'email',
                        'Use your @'.$domain.' email.'
                    );
                }
            },
        ];
    }
}