<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Partner extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_user_id',
        'partner_user_id',
        'name',
        'email',
        'status',

        'can_view_cycles',
        'can_edit_cycles',

        'can_view_bbt',
        'can_edit_bbt',

        'can_view_symptoms',
        'can_edit_symptoms',

        'can_view_predictions',
        'can_view_insights',

        'requested_by_user_id',
    ];

    protected $casts = [
        'can_view_cycles' => 'boolean',
        'can_edit_cycles' => 'boolean',

        'can_view_bbt' => 'boolean',
        'can_edit_bbt' => 'boolean',

        'can_view_symptoms' => 'boolean',
        'can_edit_symptoms' => 'boolean',

        'can_view_predictions' => 'boolean',
        'can_view_insights' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function partnerUser()
    {
        return $this->belongsTo(User::class, 'partner_user_id');
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }
}