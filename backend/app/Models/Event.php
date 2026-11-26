<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Str;

#[Fillable([
    'organizer_id',
    'title',
    'description',
    'category',
    'venue',
    'event_date',
    'start_time',
    'end_time',
    'capacity',
    'require_school_gmail',
    'send_confirmation_email',
])]
class Event extends Model
{
    use HasFactory;

    public function scopeWithCounts(Builder $query): Builder
    {
        return $query
            ->with('organizer')
            ->withCount([
                'registrations as registered_count' => fn ($query) => $query
                    ->where('status', 'registered'),

                'attendances as checked_in_count' => fn ($query) => $query
                    ->where('registrations.status', 'registered')
                    ->whereNotNull('attendances.time_in'),
            ]);
    }

    protected function casts(): array
    {
        return [
            'event_date' => 'date',
            'capacity' => 'integer',
            'require_school_gmail' => 'boolean',
            'send_confirmation_email' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Event $event): void {
            $event->qr_in_token ??= (string) Str::uuid();
            $event->qr_out_token ??= (string) Str::uuid();
        });
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(EventOrganizer::class, 'organizer_id');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class);
    }

    public function attendances(): HasManyThrough
    {
        return $this->hasManyThrough(Attendance::class, Registration::class);
    }

    public function scopeOpenToStudents(Builder $query): Builder
    {
        return $query->where('status', 'published')->where('review_status', 'approved');
    }

    public function getStartsAtAttribute(): Carbon
    {
        return Carbon::parse($this->event_date->toDateString().' '.$this->start_time);
    }

    public function getEndsAtAttribute(): Carbon
    {
        return Carbon::parse($this->event_date->toDateString().' '.$this->end_time);
    }
}