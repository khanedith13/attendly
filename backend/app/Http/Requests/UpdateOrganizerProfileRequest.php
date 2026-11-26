<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrganizerProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'organizationName' => ['required', 'string', 'max:150'],
            'contactNumber' => ['nullable', 'string', 'max:30', 'regex:/^\+?[\d\s\-()]{7,30}$/'],
            'notifications' => ['required', 'array'],
            'notifications.registrations' => ['required', 'boolean'],
            'notifications.capacity' => ['required', 'boolean'],
            'notifications.daily' => ['required', 'boolean'],
        ];
    }
}