<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEventReviewRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('note'))) {
            $this->merge(['note' => trim($this->input('note'))]);
        }
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(['approved', 'flagged'])],
            'note' => [
                Rule::requiredIf($this->input('status') === 'flagged'),
                'nullable',
                'string',
                'min:10',
                'max:200',
            ],
        ];
    }
}