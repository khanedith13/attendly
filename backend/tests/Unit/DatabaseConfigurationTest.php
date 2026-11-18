<?php

namespace Tests\Unit;

use Tests\TestCase;

class DatabaseConfigurationTest extends TestCase
{
    public function test_mysql_is_the_only_configured_database_connection(): void
    {
        $this->assertSame('mysql', config('database.default'));
        $this->assertSame(['mysql'], array_keys(config('database.connections')));
    }

    public function test_queue_metadata_uses_mysql(): void
    {
        $this->assertSame('mysql', config('queue.batching.database'));
        $this->assertSame('mysql', config('queue.failed.database'));
    }
}