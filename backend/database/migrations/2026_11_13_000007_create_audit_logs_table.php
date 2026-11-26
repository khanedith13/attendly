<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnUpdate()->nullOnDelete();
            $table->string('actor_name', 150);
            $table->string('actor_role', 20)->nullable();
            $table->string('action', 100);
            $table->string('target', 255)->nullable();
            $table->enum('result', ['success', 'failed'])->default('success');
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('created_at', 'idx_audit_created');
            $table->index('result', 'idx_audit_result');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};