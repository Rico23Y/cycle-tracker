<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Partner extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'status',
        'can_view_cycles',
        'can_view_bbt',
        'can_view_symptoms',
        'can_view_predictions',
        'can_view_insights',
    ];

    protected $casts = [
        'can_view_cycles' => 'boolean',
        'can_view_bbt' => 'boolean',
        'can_view_symptoms' => 'boolean',
        'can_view_predictions' => 'boolean',
        'can_view_insights' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}