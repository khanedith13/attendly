<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GuestCheckInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'qr_token' => ['required', 'uuid'],
            'student_id' => ['required', 'regex:/^[0-9]{4}-[0-9]{5}$/'],
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150'],
            'course' => ['required', 'string', 'max:100'],
            'year_level' => ['required', 'string', 'max:30'],
            'selfie' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ];
    }
}