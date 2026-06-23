#!/usr/bin/env bash

php artisan migrate --force

php artisan config:cache
php artisan route:cache
php artisan view:cache

exec /init