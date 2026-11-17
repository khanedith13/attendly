<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventOrganizer;
use App\Models\Registration;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\SettingsSeeder::class);
    }

    private function organizer(string $status = 'active'): User
    {
        $user = User::factory()->organizer()->create([
            'status' => $status,
        ]);

        EventOrganizer::create([
            'user_id' => $user->id,
            'organization_name' => 'Test Organization',
        ]);

        return $user;
    }

    private function eventPayload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Test Technology Event',
            'description' => 'A test event description.',
            'category' => 'Technology',
            'venue' => 'Innovation Hall, Main Campus',
            'capacity' => 100,
            'date' => now()->addDays(5)->toDateString(),
            'startTime' => '09:00',
            'endTime' => '12:00',
            'requireSchoolGmail' => true,
            'sendConfirmation' => true,
            'qrIn' => (string) Str::uuid(),
            'qrOut' => (string) Str::uuid(),
        ], $overrides);
    }

    public function test_organizer_can_save_a_draft_and_publish_it(): void
    {
        $organizer = $this->organizer();

        Sanctum::actingAs($organizer);

        $this->postJson('/api/organizer/events', $this->eventPayload())
            ->assertCreated()
            ->assertJsonPath('status', 'draft');

        $event = Event::firstOrFail();

        $this->postJson("/api/organizer/events/{$event->id}/publish")
            ->assertOk()
            ->assertJsonPath('status', 'published');
    }

    public function test_pending_organizer_can_save_draft_but_cannot_publish(): void
    {
        $organizer = $this->organizer('pending');

        Sanctum::actingAs($organizer);

        $this->postJson('/api/organizer/events', $this->eventPayload())
            ->assertCreated()
            ->assertJsonPath('status', 'draft');

        $event = Event::firstOrFail();

        $this->postJson("/api/organizer/events/{$event->id}/publish")
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'Your organizer account is awaiting approval. You can save drafts, but you cannot publish yet.'
            );
    }

    public function test_published_event_waits_for_review_when_approval_is_required(): void
    {
        Setting::updateOrCreate(
            ['key' => 'require_event_approval'],
            ['value' => 'true']
        );

        $organizer = $this->organizer();

        Sanctum::actingAs($organizer);

        $this->postJson('/api/organizer/events', $this->eventPayload([
            'publish' => true,
        ]))
            ->assertCreated()
            ->assertJsonPath('status', 'published')
            ->assertJsonPath('review', 'pending');
    }

    public function test_student_list_excludes_unavailable_events_and_hides_qr_tokens(): void
    {
        $organizer = $this->organizer();

        $published = Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'event_date' => now()->addDays(2)->toDateString(),
            'start_time' => '09:00',
            'end_time' => '12:00',
            'status' => 'published',
            'review_status' => 'approved',
        ]);

        Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'status' => 'draft',
        ]);

        Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'status' => 'published',
            'review_status' => 'pending',
        ]);

        Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'status' => 'published',
            'review_status' => 'flagged',
        ]);

        Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'status' => 'cancelled',
        ]);

        Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'event_date' => now()->subDays(2)->toDateString(),
            'status' => 'published',
            'review_status' => 'approved',
        ]);

        $student = User::factory()->create();

        Sanctum::actingAs($student);

        $response = $this->getJson('/api/events')
            ->assertOk()
            ->assertJsonCount(1);

        $response->assertJsonPath('0.id', $published->id);
        $response->assertJsonMissingPath('0.qrIn');
        $response->assertJsonMissingPath('0.qrOut');
    }

    public function test_another_organizer_cannot_edit_an_event(): void
    {
        $owner = $this->organizer();
        $other = $this->organizer();

        $event = Event::factory()->create([
            'organizer_id' => $owner->organizer->id,
        ]);

        Sanctum::actingAs($other);

        $this->getJson("/api/organizer/events/{$event->id}")
            ->assertNotFound();
    }

    public function test_capacity_cannot_be_lower_than_registered_count(): void
    {
        $organizer = $this->organizer();
    
        $event = Event::factory()->create([
            'organizer_id' => $organizer->organizer->id,
            'capacity' => 10,
        ]);
    
        foreach (range(1, 2) as $number) {
            $student = User::factory()->create();
    
            Registration::create([
                'user_id' => $student->id,
                'event_id' => $event->id,
            ]);
        }
    
        Sanctum::actingAs($organizer);
    
        $this->putJson(
            "/api/organizer/events/{$event->id}",
            $this->eventPayload(['capacity' => 1])
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('capacity');
    }

    public function test_end_time_must_be_after_start_time(): void
    {
        $organizer = $this->organizer();

        Sanctum::actingAs($organizer);

        $this->postJson(
            '/api/organizer/events',
            $this->eventPayload([
                'startTime' => '15:00',
                'endTime' => '09:00',
            ])
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('endTime');
    }

    public function test_student_cannot_access_organizer_events(): void
    {
        $student = User::factory()->create();

        Sanctum::actingAs($student);

        $this->getJson('/api/organizer/events')
            ->assertForbidden();
    }
}