<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class TemporaryStayEnded extends Notification
{
    public function __construct(public string $registrationId, public string $name, public string $room, public string $endsAt) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, string> */
    public function toArray(object $notifiable): array
    {
        return ['registration_id' => $this->registrationId, 'message' => "Masa hunian {$this->name} di kamar {$this->room} berakhir pada {$this->endsAt}."];
    }
}
