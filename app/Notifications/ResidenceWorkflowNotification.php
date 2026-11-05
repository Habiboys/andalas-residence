<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResidenceWorkflowNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public string $subject, public string $message, public ?string $registrationId = null)
    {
        $this->afterCommit();
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        $email = $notifiable instanceof User ? $notifiable->email : null;
        $mail = $email && ! str_ends_with($email, '@guest.invalid');

        return $notifiable instanceof User ? ($mail ? ['database', 'mail'] : ['database']) : ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)->subject($this->subject)->line($this->message)->action('Lihat pendaftaran', route('residence.workflow'));
    }

    /** @return array<string, string|null> */
    public function toArray(object $notifiable): array
    {
        return ['subject' => $this->subject, 'message' => $this->message, 'registration_id' => $this->registrationId];
    }
}
