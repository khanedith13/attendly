<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

#[Fillable(['user_id', 'event_id'])]
class Registration extends Model
{
    use HasFactory;

    public const CREATED_AT = 'registered_at';

    protected function casts(): array
    {
        return [
            'registered_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Registration $registration): void {
            $registration->qr_token ??= (string) Str::uuid();
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function attendance(): HasOne
    {
        return $this->hasOne(Attendance::class);
    }
}