<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Storage;

class DocumentReadyNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $documentType,
        public readonly string $documentNumber,
        public readonly string $path,
    ) {
        $this->afterCommit();
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Dokumen '.$this->documentType.' siap')
            ->line('Dokumen '.$this->documentType.' dengan nomor '.$this->documentNumber.' telah siap.')
            ->line('Dokumen terlampir dan juga dapat diunduh melalui akun Anda.')
            ->attach(Storage::disk('local')->path($this->path), ['as' => $this->documentNumber.'.pdf', 'mime' => 'application/pdf']);
    }

    /** @return array{document_type: string, document_number: string, path: string} */
    public function toArray(object $notifiable): array
    {
        return [
            'document_type' => $this->documentType,
            'document_number' => $this->documentNumber,
            'path' => $this->path,
        ];
    }
}
