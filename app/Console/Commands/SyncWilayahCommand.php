<?php

namespace App\Console\Commands;

use App\Services\WilayahSyncService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Validation\ValidationException;

#[Signature('wilayah:sync')]
#[Description('Sinkronkan master provinsi dan kota/kabupaten dari wilayah.id')]
class SyncWilayahCommand extends Command
{
    public function handle(WilayahSyncService $service): int
    {
        try {
            $result = $service->sync();
        } catch (ConnectionException|RequestException|ValidationException $exception) {
            $this->error('Sinkronisasi gagal; data lama tetap dipertahankan. '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Sinkronisasi selesai: {$result['provinces']} provinsi dan {$result['cities']} kota/kabupaten.");

        return self::SUCCESS;
    }
}
