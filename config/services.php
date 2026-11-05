<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'unand_sso' => [
        'base_url' => env('UNAND_BASE_URL', 'https://sso.unand.ac.id/auth'),
        'realm' => env('UNAND_REALM', 'unand'),
        'client_id' => env('UNAND_CLIENT_ID', 'andalasresidence-unand'),
        'client_secret' => env('UNAND_CLIENT_SECRET'),
        'redirect' => env('UNAND_REDIRECT_URI'),
        'post_logout_redirect_uri' => env('UNAND_POST_LOGOUT_REDIRECT_URI'),
    ],

];
