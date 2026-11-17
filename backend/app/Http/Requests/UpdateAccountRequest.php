<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],

            'studentId' => [
                'required',
                'regex:/^[0-9]{4}-[0-9]{5}$/',
                Rule::unique('users', 'student_id')->ignore(
                    $this->user()->id
                ),
            ],

            'course' => ['nullable', 'string', 'max:100'],
            'yearLevel' => ['nullable', 'string', 'max:30'],

            'notifications' => ['required', 'array'],
            'notifications.reminders' => ['required', 'boolean'],
            'notifications.confirmations' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'studentId.unique' => 'This student ID is already in use.',
        ];
    }
}