<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organizer_id')
                ->constrained('event_organizers')
                ->cascadeOnUpdate()
                ->restrictOnDelete();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->string('category', 50);
            $table->string('venue', 200);
            $table->date('event_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedInteger('capacity');
            $table->enum('status', ['draft', 'published', 'ongoing', 'completed', 'cancelled'])
                ->default('draft');
            $table->enum('review_status', ['approved', 'pending', 'flagged'])
                ->default('approved');
            $table->string('review_note', 200)->nullable();
            $table->boolean('require_school_gmail')->default(true);
            $table->boolean('send_confirmation_email')->default(true);
            $table->char('qr_in_token', 36)->unique();
            $table->char('qr_out_token', 36)->unique();
            $table->timestamps();

            $table->index('event_date', 'idx_events_date');
            $table->index(['status', 'review_status'], 'idx_events_visibility');
            $table->index('category', 'idx_events_category');
        });

        // The MySQL schema enforces these checks. SQLite's test schema is
        // validated by request rules because this constraint is added later.
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE events ADD CONSTRAINT chk_events_times CHECK (end_time > start_time)');
            DB::statement('ALTER TABLE events ADD CONSTRAINT chk_events_capacity CHECK (capacity >= 1)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
