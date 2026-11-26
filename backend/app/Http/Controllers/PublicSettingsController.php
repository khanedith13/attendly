<?php

namespace App\Http\Controllers;

use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;

class PublicSettingsController extends Controller
{
    public function show(SettingsService $settings): JsonResponse
    {
        return response()->json([
            'schoolDomain' => $settings->string('school_domain'),
            'requireSchoolGmail' => $settings->bool('require_school_gmail'),
            'allowOrganizerSignup' => $settings->bool('allow_organizer_signup'),
            'platformName' => $settings->string('platform_name', 'Attendly'),
        ]);
    }
}