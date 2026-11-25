
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table): void {
            $table->string('selfie_in_path')->nullable()->after('attendance_status');
            $table->string('selfie_out_path')->nullable()->after('selfie_in_path');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table): void {
            $table->dropColumn(['selfie_in_path', 'selfie_out_path']);
        });
    }
};
