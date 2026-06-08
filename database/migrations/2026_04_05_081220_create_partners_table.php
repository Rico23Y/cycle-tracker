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

            /*
            |--------------------------------------------------------------------------
            | Owner and Partner
            |--------------------------------------------------------------------------
            | owner_user_id = owner of the cycle data
            | partner_user_id = existing user allowed to view/edit
            |--------------------------------------------------------------------------
            */
            $table->foreignId('owner_user_id')
                ->constrained('users')
                ->onDelete('cascade');

            $table->foreignId('partner_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('name');
            $table->string('email')->nullable();

            /*
            |--------------------------------------------------------------------------
            | Status
            |--------------------------------------------------------------------------
            | pending = request sent but not accepted
            | active = partner access enabled
            | paused = temporarily disabled
            | declined = request declined
            |--------------------------------------------------------------------------
            */
            $table->string('status')->default('active');

            /*
            |--------------------------------------------------------------------------
            | Permissions
            |--------------------------------------------------------------------------
            */

            $table->boolean('can_view_cycles')->default(true);
            $table->boolean('can_edit_cycles')->default(false);

            $table->boolean('can_view_bbt')->default(false);
            $table->boolean('can_edit_bbt')->default(false);

            $table->boolean('can_view_symptoms')->default(false);
            $table->boolean('can_edit_symptoms')->default(false);

            $table->boolean('can_view_predictions')->default(true);

            $table->boolean('can_view_insights')->default(false);

            $table->timestamps();

            $table->unique(['owner_user_id', 'email']);
            $table->unique(['owner_user_id', 'partner_user_id']);
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