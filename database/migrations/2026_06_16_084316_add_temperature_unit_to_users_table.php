<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'temperature_unit')) {
                $table
                    ->string('temperature_unit', 20)
                    ->default('celsius')
                    ->after('email');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'temperature_unit')) {
                $table->dropColumn('temperature_unit');
            }
        });
    }
};