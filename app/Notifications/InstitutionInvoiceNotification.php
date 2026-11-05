<?php

namespace App\Notifications;

use App\Models\InvoiceGroup;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Storage;

class InstitutionInvoiceNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public InvoiceGroup $invoice)
    {
        $this->afterCommit();
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)->subject('Invoice Andalas Residence '.$this->invoice->nomor)
            ->line('Terlampir invoice beserta daftar peserta dan rincian kewajiban pembayaran.')
            ->attachData(Storage::disk('local')->get($this->invoice->path), 'invoice-'.$this->invoice->id.'.pdf', ['mime' => 'application/pdf']);
    }
}
