<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordResetNotification extends Notification
{
    public function __construct(
        private readonly string $token
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontendUrl = rtrim(
            config('app.frontend_url'),
            '/'
        );

        $resetUrl = $frontendUrl.'/reset-password?'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);

        return (new MailMessage)
            ->subject('Reset your Attendly password')
            ->greeting('Hello!')
            ->line('We received a request to reset your Attendly account password.')
            ->action('Reset Password', $resetUrl)
            ->line(
                'This link expires in '
                .config('auth.passwords.users.expire')
                .' minutes.'
            )
            ->line('If you did not request this change, you can ignore this email.');
    }
}