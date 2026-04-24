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
        Schema::create('symptoms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); 
            $table->foreignId('cycle_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->string('type'); // e.g., 'Cramps', 'Headache'
            $table->integer('level')->default(1); // 1-5 scale, defaults to 1
            $table->text('notes')->nullable(); // Good for extra details
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('symptoms');
    }
};
