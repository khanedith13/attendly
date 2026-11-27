<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Password;
use RuntimeException;
use Tests\TestCase;

class PasswordResetEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_reset_email_is_sent_to_the_account_and_its_link_resets_the_password(): void
    {
        User::factory()->create([
            'email' => 'maria.cruz@usjr.edu.ph',
            'password' => 'OldPassword123',
            'role' => 'student',
            'status' => 'active',
        ]);

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'Maria.Cruz@usjr.edu.ph',
        ])->assertStatus(202);

        $messages = $this->sentMessages();

        $this->assertCount(1, $messages);

        $email = $messages->first()->getOriginalMessage();

        $this->assertSame('maria.cruz@usjr.edu.ph', $email->getTo()[0]->getAddress());
        $this->assertSame('Reset your Attendly password', $email->getSubject());

        $link = rtrim(config('app.frontend_url'), '/').'/reset-password?token=';

        $this->assertStringContainsString($link, $email->getTextBody());

        preg_match('/reset-password\?token=([^&\s]+)&email=/', $email->getTextBody(), $match);

        $this->assertNotEmpty($match[1] ?? null);

        $this->postJson('/api/auth/reset-password', [
            'token' => urldecode($match[1]),
            'email' => 'maria.cruz@usjr.edu.ph',
            'password' => 'NewPassword456',
            'password_confirmation' => 'NewPassword456',
        ])->assertOk();

        $this->postJson('/api/auth/login', [
            'email' => 'maria.cruz@usjr.edu.ph',
            'password' => 'NewPassword456',
        ])->assertOk();

        $this->postJson('/api/auth/login', [
            'email' => 'maria.cruz@usjr.edu.ph',
            'password' => 'OldPassword123',
        ])->assertUnprocessable();
    }

    public function test_an_unknown_email_gets_the_same_answer_and_no_email(): void
    {
        $this->postJson('/api/auth/forgot-password', [
            'email' => 'nobody@usjr.edu.ph',
        ])->assertStatus(202);

        $this->assertCount(0, $this->sentMessages());
    }

    public function test_a_mail_failure_is_reported_but_the_answer_stays_the_same(): void
    {
        Exceptions::fake();

        Password::shouldReceive('sendResetLink')
            ->once()
            ->andThrow(new RuntimeException('SMTP server is down.'));

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'maria.cruz@usjr.edu.ph',
        ])->assertStatus(202);

        Exceptions::assertReported(RuntimeException::class);
    }

    private function sentMessages()
    {
        return app('mailer')->getSymfonyTransport()->messages();
    }
}