<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Match the lengths in the current spec 4 SQL without editing the
            // already-applied Laravel users migration.
            $table->string('name', 100)->change();
            $table->string('email', 150)->change();

            $table->enum('role', ['student', 'organizer', 'admin'])
                ->default('student')
                ->after('password');
            $table->enum('status', ['active', 'pending', 'suspended'])
                ->default('active')
                ->after('role');
            $table->string('student_id', 20)->nullable()->unique()->after('status');
            $table->string('course', 100)->nullable()->after('student_id');
            $table->json('notification_preferences')->nullable();
            $table->timestamp('password_changed_at')->nullable();
            $table->index(['role', 'status'], 'idx_users_role_status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_role_status');
            $table->dropUnique(['student_id']);
            $table->dropColumn([
                'role',
                'status',
                'student_id',
                'course',
                'notification_preferences',
                'password_changed_at',
            ]);

            $table->string('name', 255)->change();
            $table->string('email', 255)->change();
        });
    }
};