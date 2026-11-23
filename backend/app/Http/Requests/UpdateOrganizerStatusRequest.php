<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOrganizerStatusRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'action' => ['required', Rule::in(['approve', 'reject', 'suspend', 'reactivate'])],
        ];
    }
}