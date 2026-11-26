<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('registration_id')->constrained()->cascadeOnUpdate()->cascadeOnDelete();
            $table->dateTime('time_in')->nullable();
            $table->dateTime('time_out')->nullable();
            $table->enum('attendance_status', ['present', 'absent', 'late'])->default('present');
            $table->timestamps();

            $table->unique('registration_id', 'unique_registration_attendance');
        });

        DB::statement(
            'ALTER TABLE attendances ADD CONSTRAINT chk_attendance_times '
            .'CHECK (time_out IS NULL OR (time_in IS NOT NULL AND time_out >= time_in))'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};