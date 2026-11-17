<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
    public function all(): array
    {
        return Cache::rememberForever('settings', fn () =>
            Setting::pluck('value', 'key')->all()
        );
    }

    public function bool(string $key): bool
    {
        return ($this->all()[$key] ?? 'false') === 'true';
    }

    public function int(string $key, int $default = 0): int
    {
        return (int) ($this->all()[$key] ?? $default);
    }

    public function string(string $key, string $default = ''): string
    {
        return $this->all()[$key] ?? $default;
    }

    public function flush(): void
    {
        Cache::forget('settings');
    }
}