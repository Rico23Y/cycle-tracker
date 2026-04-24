<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cycle extends Model
{
    /** @use HasFactory<\Database\Factories\CycleFactory> */
    use HasFactory;

    protected $fillable = ['user_id', 'start_date', 'end_date', 'length'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function bbtReadings()
    {
        return $this->hasMany(BbtReading::class);
    }

    public function symptoms()
    {
        return $this->hasMany(Symptom::class);
    }
}
