<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('residence_applications', function (Blueprint $table): void {
            $table->string('institution')->nullable()->change();
            $table->string('letter_path')->nullable()->change();
        });
        Schema::table('residence_registrations', function (Blueprint $table): void {
            $table->string('checkin_classification')->nullable();
        });
        Schema::table('penempatan_kamar', fn (Blueprint $table) => $table->timestamp('relocated_at')->nullable());
        Schema::create('residence_amendments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('kind');
            $table->uuid('subject_id')->index();
            $table->json('before');
            $table->json('after');
            $table->text('reason');
            $table->foreignUuid('officer_id')->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('residence_amendments');
        Schema::table('penempatan_kamar', fn (Blueprint $table) => $table->dropColumn('relocated_at'));
        Schema::table('residence_registrations', fn (Blueprint $table) => $table->dropColumn('checkin_classification'));
    }
};
