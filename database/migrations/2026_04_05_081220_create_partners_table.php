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
        Schema::create('partners', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained()
                ->onDelete('cascade');

            $table->string('name');
            $table->string('email')->nullable();

            $table->string('status')->default('active');

            $table->boolean('can_view_cycles')->default(true);
            $table->boolean('can_view_bbt')->default(false);
            $table->boolean('can_view_symptoms')->default(false);
            $table->boolean('can_view_predictions')->default(true);
            $table->boolean('can_view_insights')->default(false);

            $table->timestamps();

            $table->unique(['user_id', 'email']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('partners');
    }
};