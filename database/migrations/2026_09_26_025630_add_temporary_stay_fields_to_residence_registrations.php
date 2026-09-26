<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('residence_registrations', function (Blueprint $table) {
            $table->string('stay_kind', 30)->default('regular')->index();
            $table->timestamp('ended_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('residence_registrations', function (Blueprint $table) {
            $table->dropColumn(['stay_kind', 'ended_at']);
        });
    }
};
