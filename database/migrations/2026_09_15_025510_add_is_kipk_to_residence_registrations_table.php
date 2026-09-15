<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('residence_registrations', function (Blueprint $table) {
            $table->boolean('is_kipk')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('residence_registrations', function (Blueprint $table) {
            $table->dropColumn('is_kipk');
        });
    }
};
