<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSettingsRequest;
use App\Models\Setting;
use App\Services\AuditLogger;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminSettingsController extends Controller
{
    private const SETTING_KEYS = [
        'platformName' => 'platform_name',
        'schoolDomain' => 'school_domain',
        'requireSchoolGmail' => 'require_school_gmail',
        'allowOrganizerSignup' => 'allow_organizer_signup',
        'requireEventApproval' => 'require_event_approval',
        'lateGraceMinutes' => 'late_grace_minutes',
        'autoMarkAbsent' => 'auto_mark_absent',
        'sessionTimeoutMinutes' => 'session_timeout_minutes',
        'twoFactorAdmins' => 'two_factor_admins',
        'emailNewOrganizer' => 'email_new_organizer',
        'emailFlaggedEvent' => 'email_flagged_event',
    ];

    public function show(SettingsService $settings): JsonResponse
    {
        $values = $settings->all();
        $response = [];

        foreach (self::SETTING_KEYS as $apiKey => $databaseKey) {
            $value = $values[$databaseKey] ?? null;

            $response[$apiKey] = match ($apiKey) {
                'requireSchoolGmail',
                'allowOrganizerSignup',
                'requireEventApproval',
                'autoMarkAbsent',
                'twoFactorAdmins',
                'emailNewOrganizer',
                'emailFlaggedEvent' => $value === 'true',
                'lateGraceMinutes' => (int) ($value ?? 15),
                'sessionTimeoutMinutes' => (int) ($value ?? 60),
                'platformName' => $value ?? 'Attendly',
                'schoolDomain' => $value ?? '',
                default => $value,
            };
        }

        return response()->json(['settings' => $response]);
    }

    public function update(
        UpdateSettingsRequest $request,
        SettingsService $settings,
        AuditLogger $audit
    ): JsonResponse {
        $validated = $request->validated();
        $changed = [];

        DB::transaction(function () use ($validated, $audit, $request, &$changed): void {
            foreach (self::SETTING_KEYS as $apiKey => $databaseKey) {
                $nextValue = is_bool($validated[$apiKey])
                    ? ($validated[$apiKey] ? 'true' : 'false')
                    : (string) $validated[$apiKey];

                $currentValue = Setting::query()
                    ->whereKey($databaseKey)
                    ->value('value');

                if ($currentValue === $nextValue) {
                    continue;
                }

                Setting::updateOrCreate(
                    ['key' => $databaseKey],
                    ['value' => $nextValue]
                );

                $changed[] = $apiKey;
                $audit->record(
                    $request->user(),
                    'Changed setting',
                    $databaseKey
                );
            }
        });

        if ($changed !== []) {
            $settings->flush();
        }

        return response()->json([
            'message' => 'Settings saved successfully.',
            'changed' => count($changed),
        ]);
    }
}