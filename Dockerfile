FROM serversideup/php:8.4-fpm-nginx

WORKDIR /var/www/html

USER root

RUN install-php-extensions intl pdo_pgsql pdo_mysql zip bcmath

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN composer dump-autoload --optimize

RUN php artisan config:clear \
    && php artisan route:clear \
    && php artisan view:clear

RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x render-start.sh

USER www-data

EXPOSE 8080

CMD ["./render-start.sh"]