#!/bin/sh
set -eu

cd /var/www/html

if [ "$#" -gt 0 ] && [ "$1" != "/usr/bin/supervisord" ]; then
    exec "$@"
fi

mkdir -p storage/app/private storage/app/public storage/framework/cache/data \
    storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

php artisan config:clear --no-interaction
if [ ! -L public/storage ]; then
    php artisan storage:link --no-interaction
fi
php artisan config:cache --no-interaction
php artisan view:cache --no-interaction
chown -R www-data:www-data storage bootstrap/cache

# Migration dan seed dijalankan secara eksplisit, bukan setiap container restart.
exec "$@"
