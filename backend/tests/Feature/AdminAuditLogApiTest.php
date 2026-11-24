<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAuditLogApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_read_audit_logs_in_newest_first_order(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $older = $this->makeAuditLog(['created_at' => now()->subMinute()]);
        $newer = $this->makeAuditLog(['created_at' => now()]);

        $this->getJson('/api/admin/audit-logs')
            ->assertOk()
            ->assertJsonPath('data.0.id', $newer->id)
            ->assertJsonPath('data.1.id', $older->id)
            ->assertJsonPath('data.0.actor', 'Test Actor')
            ->assertJsonPath('data.0.ip', '127.0.0.1');
    }

    public function test_audit_log_can_be_filtered_by_category_result_and_search(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $login = $this->makeAuditLog([
            'actor_name' => 'Jane Student',
            'action' => 'Logged in',
            'target' => 'jane@example.edu',
        ]);
        $this->makeAuditLog([
            'actor_name' => 'Admin User',
            'action' => 'Changed setting',
            'target' => 'school_domain',
        ]);
        $failed = $this->makeAuditLog([
            'actor_name' => 'Unknown User',
            'action' => 'Login attempt',
            'result' => 'failed',
        ]);

        $this->getJson('/api/admin/audit-logs?category=logins')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => $login->id]);

        $this->getJson('/api/admin/audit-logs?category=settings')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.target', 'school_domain');

        $this->getJson('/api/admin/audit-logs?category=failed')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $failed->id);

        $this->getJson('/api/admin/audit-logs?search=jane@example.edu')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $login->id);
    }

    public function test_non_admin_cannot_read_audit_logs(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/admin/audit-logs')->assertForbidden();
    }

    private function makeAuditLog(array $overrides = []): AuditLog
    {
        $createdAt = $overrides['created_at'] ?? null;
        unset($overrides['created_at']);

        $entry = AuditLog::create(array_merge([
            'actor_name' => 'Test Actor',
            'actor_role' => 'student',
            'action' => 'Registered account',
            'target' => 'student@example.edu',
            'result' => 'success',
            'ip_address' => '127.0.0.1',
        ], $overrides));

        if ($createdAt !== null) {
            $entry->forceFill(['created_at' => $createdAt])->save();
        }

        return $entry;
    }
}