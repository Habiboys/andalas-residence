FROM php:8.4-fpm-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg nginx supervisor libfreetype6-dev libjpeg62-turbo-dev libpng-dev libzip-dev libonig-dev libicu-dev unzip \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" bcmath exif gd intl mbstring opcache pcntl pdo_mysql zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html

ARG APP_URL=http://localhost:8003
ENV APP_URL=${APP_URL}
COPY docker/php/app.ini /usr/local/etc/php/conf.d/andalas.ini
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-scripts --prefer-dist --optimize-autoloader

COPY package.json package-lock.json .npmrc ./
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 300000 \
    && npm ci --include=dev --include=optional --no-audit --no-fund

COPY . .
RUN mkdir -p storage/app/private storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && composer dump-autoload --no-dev --optimize \
    && npm run build \
    && rm -rf node_modules \
    && chown -R www-data:www-data storage bootstrap/cache

RUN rm -f /etc/nginx/sites-enabled/default
COPY docker/nginx/app.conf /etc/nginx/conf.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/andalas-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/andalas-entrypoint \
    && chmod +x /usr/local/bin/andalas-entrypoint \
    && nginx -t \
    && php-fpm -t \
    && sh -n /usr/local/bin/andalas-entrypoint \
    && composer check-platform-reqs --no-dev

EXPOSE 80
ENTRYPOINT ["andalas-entrypoint"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
