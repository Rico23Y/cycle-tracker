<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Symptom extends Model
{
    /** @use HasFactory<\Database\Factories\SymptomFactory> */
    use HasFactory;

    protected $fillable = ['user_id', 'cycle_id', 'date', 'type', 'level', 'notes'];

    public function cycle()
    {
        return $this->belongsTo(Cycle::class);
    }
}
