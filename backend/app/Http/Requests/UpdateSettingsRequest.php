<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSettingsRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'platformName' => is_string($this->input('platformName'))
                ? trim($this->input('platformName'))
                : $this->input('platformName'),
            'schoolDomain' => is_string($this->input('schoolDomain'))
                ? strtolower(trim($this->input('schoolDomain')))
                : $this->input('schoolDomain'),
        ]);
    }

    public function rules(): array
    {
        return [
            'platformName' => ['required', 'string', 'max:50'],
            'schoolDomain' => [
                'required',
                'string',
                'max:253',
                'regex:/^[a-z0-9-]+(\.[a-z0-9-]+)+$/',
            ],
            'requireSchoolGmail' => ['required', 'boolean'],
            'allowOrganizerSignup' => ['required', 'boolean'],
            'requireEventApproval' => ['required', 'boolean'],
            'lateGraceMinutes' => ['required', 'integer', 'between:0,120'],
            'autoMarkAbsent' => ['required', 'boolean'],
            'sessionTimeoutMinutes' => ['required', 'integer', 'between:5,480'],
            'twoFactorAdmins' => ['required', 'boolean'],
            'emailNewOrganizer' => ['required', 'boolean'],
            'emailFlaggedEvent' => ['required', 'boolean'],
        ];
    }
}