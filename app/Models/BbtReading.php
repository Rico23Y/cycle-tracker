<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BbtReading extends Model
{
    /** @use HasFactory<\Database\Factories\BbtReadingFactory> */
    use HasFactory;

    protected $fillable = ['user_id', 'cycle_id', 'date', 'temperature', 'unit'];

    public function cycle()
    {
        return $this->belongsTo(Cycle::class);
    }
}
