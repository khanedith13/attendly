<?php

namespace App\Http\Requests;

use App\Services\SettingsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Validator;

class RegisterRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => Str::lower(trim((string) $this->input('email'))),
        ]);
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'firstName' => ['required', 'string', 'max:50'],
            'lastName' => ['required', 'string', 'max:50'],
            'email' => [
                'required',
                'email',
                'max:150',
                'unique:users,email',
            ],
            'password' => ['required', 'string', 'min:8'],
            'confirmPassword' => ['required', 'same:password'],
            'role' => ['required', 'in:student,organizer,admin'],
            'agree' => ['accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'An account with this email already exists.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $settings = app(SettingsService::class);
                $domain = $settings->string('school_domain');

                if ($this->input('role') === 'admin') {
                    $validator->errors()->add(
                        'role',
                        'Admin accounts are created by the system administrator.'
                    );
                }

                if (
                    $this->input('role') === 'organizer'
                    && ! $settings->bool('allow_organizer_signup')
                ) {
                    $validator->errors()->add(
                        'role',
                        'Organizer sign-ups are currently closed.'
                    );
                }

                if (
                    $settings->bool('require_school_gmail')
                    && ! str_ends_with(
                        $this->input('email', ''),
                        '@'.$domain
                    )
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