<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class CheckOutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'qr_token' => ['nullable', 'uuid'],
            'event_id' => ['nullable', 'integer', 'min:1'],
            'email' => ['nullable', 'email', 'max:150'],
        ];
        'selfie' => [
            'required',
            'image',
            'mimes:jpeg,jpg,png,webp',
            'max:5120',
        ],
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            $hasQrToken = filled($this->input('qr_token'));
            $hasEmail = filled($this->input('email'));

            if (! $hasQrToken && ! $hasEmail) {
                $validator->errors()->add(
                    'email',
                    'Your registered school email is required for manual attendance out.'
                );
            }

            if ($hasQrToken && filled($this->input('event_id'))) {
                $validator->errors()->add(
                    'event_id',
                    'Provide either an attendance-out QR token or a manual event ID, not both.'
                );
            }
        }];
    }
}