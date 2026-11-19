
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const TIMESTAMP_TABLES = [
        'users',
        'event_organizers',
        'events',
        'attendances',
    ];

    public function up(): void
    {
        foreach (self::TIMESTAMP_TABLES as $table) {
            DB::statement(sprintf(
                'ALTER TABLE `%s`
                    MODIFY `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                    MODIFY `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP',
                $table,
            ));
        }

        DB::statement(
            'ALTER TABLE `registrations`
                MODIFY `registered_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                MODIFY `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP'
        );

        DB::statement(
            'ALTER TABLE `settings`
                MODIFY `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP'
        );
    }

    public function down(): void
    {
        foreach (self::TIMESTAMP_TABLES as $table) {
            DB::statement(sprintf(
                'ALTER TABLE `%s`
                    MODIFY `created_at` TIMESTAMP NULL DEFAULT NULL,
                    MODIFY `updated_at` TIMESTAMP NULL DEFAULT NULL',
                $table,
            ));
        }

        DB::statement(
            'ALTER TABLE `registrations`
                MODIFY `registered_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                MODIFY `updated_at` TIMESTAMP NULL DEFAULT NULL'
        );

        DB::statement(
            'ALTER TABLE `settings`
                MODIFY `updated_at` TIMESTAMP NULL DEFAULT NULL'
        );
    }
};
