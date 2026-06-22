# CycleWise

CycleWise is a full-stack cycle tracking web application built with Laravel, Inertia.js, React, TypeScript, and Tailwind CSS.

It helps users track menstrual cycles, Day One records, basal body temperature, symptoms, fertile windows, ovulation estimates, partner sharing, and cycle insights in one private dashboard.

## Features

* Cycle and period tracking
* Calendar visualization for period days, fertile windows, ovulation, safe days, and pregnancy test estimates
* Basal body temperature logging
* BBT trend charts
* Multiple symptoms per day with severity levels and notes
* Cycle prediction based on previous cycle lengths
* Dashboard summary for current cycle status
* Insights page for cycle regularity, BBT summaries, symptom patterns, and ovulation correlation
* Partner access system with permission-based data sharing
* Profile settings with avatar upload
* Temperature unit preference for Celsius or Fahrenheit
* Authentication and account settings

## Tech Stack

* Laravel 12
* PHP 8.4
* Inertia.js
* React
* TypeScript
* Tailwind CSS
* Recharts
* React DayPicker
* MySQL or SQLite
* Laravel Fortify
* Vite

## Screenshots

Screenshots will be added soon.

Recommended screenshots:

* Dashboard
* Calendar
* BBT page
* Insights page
* Partners page
* Profile settings

## Demo Accounts

After running the database seeders, you can use the following demo accounts:

```text
test@example.com
password
```

```text
test2@example.com
password
```

```text
test3@example.com
password
```

The first two accounts contain sample cycle data. The third account is mostly empty and can be used to test the first-time user experience.

## Local Setup

Clone the repository:

```bash
git clone https://github.com/Rico23Y/cycle-tracker.git
cd cycle-tracker
```

Install PHP dependencies:

```bash
composer install
```

Install JavaScript dependencies:

```bash
npm install
```

Copy the environment file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Generate the application key:

```bash
php artisan key:generate
```

Configure your database in `.env`.

For SQLite, create the database file:

```bash
New-Item database/database.sqlite
```

Then set this in `.env`:

```env
DB_CONNECTION=sqlite
```

Run migrations and seeders:

```bash
php artisan migrate:fresh --seed
```

Start the frontend dev server:

```bash
npm run dev
```

Start the Laravel server if you are not using Laravel Herd:

```bash
php artisan serve
```

## Useful Commands

Run migrations:

```bash
php artisan migrate
```

Reset and reseed the database:

```bash
php artisan migrate:fresh --seed
```

Run tests:

```bash
php artisan test
```

Run frontend build:

```bash
npm run build
```

Clear cached Laravel files:

```bash
php artisan optimize:clear
```

## Project Structure

Important files and folders:

```text
app/Http/Controllers
app/Models
app/Services
database/migrations
database/seeders
resources/js/pages
resources/js/components
resources/js/layouts
routes/web.php
```

Main pages:

```text
resources/js/pages/dashboard/index.tsx
resources/js/pages/calendar/index.tsx
resources/js/pages/cycles
resources/js/pages/bbt
resources/js/pages/insights
resources/js/pages/partners
resources/js/pages/settings
```

Important services:

```text
app/Services/CyclePredictionService.php
app/Services/DataAccessContextService.php
```

## Core Domain Concepts

### Day One

Day One is the first day of a menstrual period. CycleWise uses Day One records to calculate cycle length, estimate the next period, and build calendar predictions.

### BBT

BBT means basal body temperature. CycleWise stores BBT internally in Celsius and displays it according to the user's preferred temperature unit.

### Symptoms

Users can log multiple symptoms on the same day. Each symptom can include a type, severity level, and optional notes.

### Partner Access

Users can share selected tracking data with a partner. Access is controlled by permissions, so the owner can decide what data is visible or editable.

## Portfolio Notes

CycleWise was built as a portfolio project to demonstrate practical full-stack development skills, including:

* Laravel backend development
* React and TypeScript frontend development
* Inertia.js full-stack routing
* Database design and Eloquent relationships
* Authentication and user settings
* Data visualization
* Permission-based data access
* Form validation and CRUD workflows
* Responsive UI design
* Real-world domain modeling

## Disclaimer

CycleWise is a personal tracking and portfolio application. It is not a medical device and should not be used as a substitute for professional medical advice, diagnosis, contraception, or fertility treatment.
