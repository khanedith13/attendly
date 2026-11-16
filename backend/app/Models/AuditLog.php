<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'user_id',
    'actor_name',
    'actor_role',
    'action',
    'target',
    'result',
    'ip_address',
])]
class AuditLog extends Model
{
    public const UPDATED_AT = null;
}