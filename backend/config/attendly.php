<?php

return [

    /*
    |--------------------------------------------------------------------------
    | School email domain
    |--------------------------------------------------------------------------
    |
    | The email domain students and organizers must use to create an account.
    | It is the starting value of the "Allowed school domain" admin setting,
    | which an admin can still change later from the settings page.
    |
    */

    'school_domain' => env('SCHOOL_DOMAIN', 'school.edu.ph'),

];