<?php

use craft\helpers\App;

$configuredOrigins = trim((string)App::env('FORMIE_ALLOWED_ORIGINS'));

if ($configuredOrigins !== '') {
    $allowedOrigins = array_values(array_filter(array_map('trim', explode(',', $configuredOrigins))));
} elseif (App::env('CRAFT_ENVIRONMENT') === 'dev') {
    $allowedOrigins = [
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3002',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
        'http://localhost:4174',
        'http://127.0.0.1:4174',
        'http://localhost:4175',
        'http://127.0.0.1:4175',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:5175',
        'http://127.0.0.1:5175',
    ];
} else {
    $allowedOrigins = [];
}

return [
    'allowedOrigins' => $allowedOrigins,
];
