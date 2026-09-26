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
        Schema::table('periode', function (Blueprint $table): void {
            if (! Schema::hasColumn('periode', 'angkatan_maba')) {
                $table->unsignedSmallInteger('angkatan_maba')->nullable();
            }
            if (! Schema::hasColumn('periode', 'reservation_hours')) {
                $table->unsignedSmallInteger('reservation_hours')->default(24);
            }
        });
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'inactive_reason')) {
                $table->string('inactive_reason')->nullable();
            }
        });
        Schema::table('gedung', function (Blueprint $table): void {
            if (! Schema::hasColumn('gedung', 'allowed_categories')) {
                $table->json('allowed_categories')->nullable();
            }
        });

        if (Schema::hasTable('legacy_residence_rates')) {
            $legacyRateIndexes = collect(Schema::getIndexes('legacy_residence_rates'));
            Schema::table('legacy_residence_rates', function (Blueprint $table) use ($legacyRateIndexes): void {
                if ($legacyRateIndexes->contains(fn (array $index): bool => $index['name'] === 'legacy_residence_rates_angkatan_unique')) {
                    $table->dropUnique(['angkatan']);
                }
                if (! Schema::hasColumn('legacy_residence_rates', 'gedung_id')) {
                    $table->foreignUuid('gedung_id')->nullable()->constrained('gedung')->restrictOnDelete();
                }
                if (! $legacyRateIndexes->contains(fn (array $index): bool => $index['name'] === 'legacy_residence_rates_angkatan_gedung_id_unique')) {
                    $table->unique(['angkatan', 'gedung_id']);
                }
            });
        }
        if (! Schema::hasTable('legacy_residents')) {
            Schema::create('legacy_residents', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('nim', 50)->unique();
                $table->string('nama');
                $table->unsignedSmallInteger('angkatan');
                $table->foreignUuid('gedung_id')->constrained('gedung')->restrictOnDelete();
                $table->date('checked_out_at')->nullable();
                $table->text('notes')->nullable();
                $table->foreignUuid('recorded_by')->constrained('users')->restrictOnDelete();
                $table->timestamps();
            });
        }
        if (! Schema::hasTable('kipk_recipients')) {
            Schema::create('kipk_recipients', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('nim', 50);
                $table->unsignedSmallInteger('angkatan');
                $table->string('nama');
                $table->timestamps();
                $table->unique(['nim', 'angkatan']);
            });
        }
        if (! Schema::hasTable('residence_rates')) {
            Schema::create('residence_rates', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('gedung_id')->constrained('gedung')->restrictOnDelete();
                $table->string('tipe_kamar', 30);
                $table->string('unit', 20);
                $table->decimal('amount', 15, 2);
                $table->timestamps();
                $table->unique(['gedung_id', 'tipe_kamar', 'unit']);
            });
        }

        if (Schema::hasTable('residence_registrations')) {
            // MySQL menautkan foreign key student_profile_id ke index gabungan
            // (student_profile_id, periode_id); lepaskan FK sebelum menghapus unique.
            $registrationIndexes = collect(Schema::getIndexes('residence_registrations'));
            $hadStudentForeignKey = collect(Schema::getForeignKeys('residence_registrations'))
                ->contains(fn (array $foreignKey): bool => $foreignKey['columns'] === ['student_profile_id'] && ($foreignKey['name'] ?? null) !== null);
            Schema::table('residence_registrations', function (Blueprint $table) use ($hadStudentForeignKey, $registrationIndexes): void {
                if ($hadStudentForeignKey && $registrationIndexes->contains(fn (array $index): bool => $index['name'] === 'residence_registrations_student_profile_id_periode_id_unique')) {
                    $table->dropForeign('residence_registrations_student_profile_id_foreign');
                }
                if ($registrationIndexes->contains(fn (array $index): bool => $index['name'] === 'residence_registrations_student_profile_id_periode_id_unique')) {
                    $table->dropUnique(['student_profile_id', 'periode_id']);
                }
                if (! Schema::hasColumn('residence_registrations', 'reserved_room_id')) {
                    $table->foreignUuid('reserved_room_id')->nullable()->constrained('kamar')->restrictOnDelete();
                }
                if (! Schema::hasColumn('residence_registrations', 'reservation_expires_at')) {
                    $table->timestamp('reservation_expires_at')->nullable()->index();
                }
                if (! Schema::hasColumn('residence_registrations', 'starts_at')) {
                    $table->date('starts_at')->nullable();
                }
                if (! Schema::hasColumn('residence_registrations', 'ends_at')) {
                    $table->date('ends_at')->nullable();
                }
                if (! Schema::hasColumn('residence_registrations', 'rate_unit')) {
                    $table->string('rate_unit', 20)->default('period');
                }
                if (! Schema::hasColumn('residence_registrations', 'funding')) {
                    $table->string('funding', 20)->default('personal');
                }
                if (! Schema::hasColumn('residence_registrations', 'sponsor_name')) {
                    $table->string('sponsor_name')->nullable();
                }
                if (! Schema::hasColumn('residence_registrations', 'sponsor_approved_at')) {
                    $table->timestamp('sponsor_approved_at')->nullable();
                }
            });
            $restoredForeignKey = collect(Schema::getForeignKeys('residence_registrations'))
                ->contains(fn (array $foreignKey): bool => $foreignKey['columns'] === ['student_profile_id']);
            if (! $restoredForeignKey) {
                Schema::table('residence_registrations', function (Blueprint $table): void {
                    $table->foreign('student_profile_id')->references('id')->on('mahasiswa_profil')->cascadeOnDelete();
                });
            }
        }

        Schema::table('tagihan', function (Blueprint $table): void {
            if (! Schema::hasColumn('tagihan', 'sponsor_total')) {
                $table->decimal('sponsor_total', 15, 2)->default(0);
            }
            if (! Schema::hasColumn('tagihan', 'sponsor_paid')) {
                $table->decimal('sponsor_paid', 15, 2)->default(0);
            }
            if (! Schema::hasColumn('tagihan', 'sponsor_name')) {
                $table->string('sponsor_name')->nullable();
            }
            if (! Schema::hasColumn('tagihan', 'amount_due_now')) {
                $table->decimal('amount_due_now', 15, 2)->nullable();
            }
            if (! Schema::hasColumn('tagihan', 'residence_snapshot')) {
                $table->json('residence_snapshot')->nullable();
            }
        });
        Schema::table('pengajuan_bebas_asrama', function (Blueprint $table): void {
            if (! Schema::hasColumn('pengajuan_bebas_asrama', 'document_kind')) {
                $table->string('document_kind', 30)->nullable();
            }
            if (! Schema::hasColumn('pengajuan_bebas_asrama', 'stay_key')) {
                $table->string('stay_key', 100)->nullable();
            }
            if (! Schema::hasColumn('pengajuan_bebas_asrama', 'document_snapshot')) {
                $table->json('document_snapshot')->nullable();
            }
            if (! Schema::hasColumn('pengajuan_bebas_asrama', 'legacy_resident_id')) {
                $table->foreignUuid('legacy_resident_id')->nullable()->constrained('legacy_residents')->restrictOnDelete();
            }
        });
        if (! Schema::hasTable('invoice_groups')) {
            Schema::create('invoice_groups', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('nomor', 100)->unique();
                $table->string('payer_type', 20);
                $table->json('invoice_ids');
                $table->json('snapshot');
                $table->string('path')->nullable();
                $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
                $table->timestamps();
            });
        }
        if (! Schema::hasTable('sponsor_payments')) {
            Schema::create('sponsor_payments', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('reference', 100)->unique();
                $table->foreignUuid('invoice_group_id')->constrained('invoice_groups')->restrictOnDelete();
                $table->json('allocations');
                $table->string('payer_type', 20);
                $table->foreignUuid('recorded_by')->constrained('users')->restrictOnDelete();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException('Migrasi menyimpan riwayat hunian dan pembayaran; gunakan migrasi koreksi atau pulihkan cadangan.');
    }
};
