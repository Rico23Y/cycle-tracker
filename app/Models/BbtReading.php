<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BbtReading extends Model
{
    /** @use HasFactory<\Database\Factories\BbtReadingFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'created_by_user_id',
        'updated_by_user_id',
        'date',
        'temperature'];

        protected $casts = [
        'temperature' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
}
}
