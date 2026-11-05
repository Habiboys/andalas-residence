<?php

namespace App\Jobs;

use App\Models\InvoiceGroup;
use App\Models\ResidenceApplication;
use App\Notifications\InstitutionInvoiceNotification;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Notification;
use Throwable;

class SendInstitutionInvoice implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [30, 120];

    public function __construct(public string $invoiceId)
    {
        $this->afterCommit();
    }

    public function uniqueId(): string
    {
        return $this->invoiceId;
    }

    public function handle(): void
    {
        $group = InvoiceGroup::whereKey($this->invoiceId)->firstOrFail();
        if ($group->delivery_status === 'sent') {
            return;
        }
        $application = ResidenceApplication::whereKey($group->residence_application_id)->firstOrFail();
        Notification::route('mail', $application->recipient_email)->notifyNow(new InstitutionInvoiceNotification($group));
        $group->update(['delivery_status' => 'sent', 'delivered_at' => now(), 'delivery_failed_at' => null]);
    }

    public function failed(?Throwable $exception): void
    {
        InvoiceGroup::whereKey($this->invoiceId)->where('delivery_status', '!=', 'sent')->update(['delivery_status' => 'failed', 'delivery_failed_at' => now()]);
    }
}
