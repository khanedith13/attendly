<?php

namespace App\Http\Requests;

use App\Models\Event;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category' => [
                'required',
                Rule::in(['Technology', 'Leadership', 'Career', 'Community']),
            ],
            'venue' => ['required', 'string', 'max:200'],
            'capacity' => ['required', 'integer', 'between:1,100000'],
            'date' => ['required', 'date_format:Y-m-d'],
            'startTime' => ['required', 'date_format:H:i'],
            'endTime' => [
                'required',
                'date_format:H:i',
                'after:startTime',
            ],
            'requireSchoolGmail' => ['sometimes', 'boolean'],
            'sendConfirmation' => ['sometimes', 'boolean'],
            'qrIn' => ['nullable', 'uuid'],
            'qrOut' => ['nullable', 'uuid'],
            'publish' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'endTime.after' => 'End time must be after the start time.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $eventId = $this->route('event');

                $event = $eventId
                    ? Event::find($eventId)
                    : null;

                $isPublishing = $this->boolean('publish')
                    || ($event && $event->status === 'published');

                if (
                    $isPublishing
                    && $this->filled('date')
                    && $this->input('date') < now()->toDateString()
                ) {
                    $validator->errors()->add(
                        'date',
                        'The date cannot be in the past.'
                    );
                }

                if ($event && $this->filled('capacity')) {
                    $registered = $event->registrations()
                        ->where('status', 'registered')
                        ->count();

                    if ((int) $this->input('capacity') < $registered) {
                        $validator->errors()->add(
                            'capacity',
                            "Capacity cannot be lower than current registrations ({$registered})."
                        );
                    }
                }

                foreach (['qrIn' => 'qr_in_token', 'qrOut' => 'qr_out_token'] as $input => $column) {
                    $token = $this->input($input);

                    if (! $token) {
                        continue;
                    }

                    $query = Event::where($column, $token);

                    if ($event) {
                        $query->where('id', '!=', $event->id);
                    }

                    if ($query->exists()) {
                        $validator->errors()->add(
                            $input,
                            'This code is already in use.'
                        );
                    }
                }
            },
        ];
    }
}