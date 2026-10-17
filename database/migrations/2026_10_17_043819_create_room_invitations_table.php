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
        Schema::create('room_invitations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('residence_registration_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('invitee_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('kamar_id')->constrained('kamar')->cascadeOnDelete();
            $table->foreignUuid('accepted_registration_id')->nullable()->constrained('residence_registrations')->nullOnDelete();
            $table->string('status', 20)->default('pending');
            $table->timestamp('expires_at');
            $table->timestamp('responded_at')->nullable();
            $table->unique(['residence_registration_id', 'invitee_id'], 'room_invitation_recipient_unique');
            $table->index(['invitee_id', 'status']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('room_invitations');
    }
};
