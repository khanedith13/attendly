# Attendly --- Event Registration and Attendance System

Attendly is a web-based campus event platform for managing event
discovery, registration, QR-assisted attendance, and event
administration. It provides separate workspaces for **Students**,
**Organizers**, and **Admins**.

> **Project status:** Requirements and architecture baseline. This
> README is based on the supplied Attendly UI/requirements PDF, SRS
> v1.0, ERD, and web architecture diagram. Update the setup instructions
> and repository structure to match the actual implementation as
> development progresses.

## Table of Contents

-   [Overview](#overview)
-   [User Roles](#user-roles)
-   [Core Features](#core-features)
-   [Technology Stack](#technology-stack)
-   [System Architecture](#system-architecture)
-   [Database Design](#database-design)
-   [Prerequisites](#prerequisites)
-   [Local Development Setup](#local-development-setup)
-   [Environment Configuration](#environment-configuration)
-   [Running the Application](#running-the-application)
-   [Production Deployment Overview](#production-deployment-overview)
-   [Security Notes](#security-notes)
-   [Known Decisions and Items to
    Confirm](#known-decisions-and-items-to-confirm)
-   [Project Documentation](#project-documentation)

## Overview

Attendly centralizes the event lifecycle for a campus:

1.  Students create accounts using an approved school email domain.
2.  Students browse available campus events and register.
3.  Organizers create and manage events, monitor registrations, and
    generate separate QR codes for attendance in and attendance out.
4.  Students record arrival and departure by scanning the relevant QR
    code. A manual attendance option is available when scanning is
    unavailable.
5.  Organizers review attendee and attendance records and export
    attendee information.
6.  Admins manage platform users, organizers, events, attendance,
    settings, reports, and audit activity.

The system uses role-based access so each account is presented with the
functions appropriate to its role.

## User Roles

  -----------------------------------------------------------------------
  Role                                Responsibilities
  ----------------------------------- -----------------------------------
  **Student**                         Create an account, browse and
                                      register for events, view
                                      registrations and QR tickets,
                                      record attendance in/out, view
                                      attendance history, and manage
                                      profile settings.

  **Organizer**                       Manage an organization profile,
                                      create/save/publish events,
                                      configure capacity and registration
                                      settings, generate
                                      arrival/departure QR codes, review
                                      attendees and registrations, send
                                      reminders, and export CSV data.

  **Admin**                           Manage users and roles, review
                                      organizer applications, moderate
                                      event submissions, inspect flagged
                                      items, manage platform settings,
                                      review attendance and reports, and
                                      inspect audit activity.
  -----------------------------------------------------------------------

## Core Features

### Authentication and accounts

-   Login with role selection for Student, Organizer, or Admin.
-   Account creation using an official school Gmail address / approved
    school domain.
-   Registration form validation and password confirmation.
-   Role-aware access to application features.
-   Logout and profile/security management.

### Student features

-   Dashboard with attendance summaries and upcoming registered events.
-   Browse, search, filter, and sort campus events.
-   View event details such as schedule, venue, and capacity.
-   Register for events and view registration status.
-   View registration tickets / QR information.
-   Attendance In and Attendance Out using QR scanning.
-   Manual attendance fallback when the scanner is unavailable.
-   Profile, profile-picture, notification-preference, and password
    management.

### Organizer features

-   Dashboard with event, registration, and attendance summaries.
-   Create events with title, category, description, venue, date,
    start/end time, and capacity.
-   Save event drafts and publish events.
-   Configure school-email registration and confirmation settings.
-   Generate, refresh, and download separate Attendance In and
    Attendance Out QR codes.
-   View and search attendee details and attendance states.
-   Review upcoming registrations and waiting-list information.
-   Export attendee/registration information to CSV.
-   Manage organization contact details and notification preferences.

### Admin features

-   Platform dashboard and review queue.
-   User and role management.
-   Organizer application review and organization management.
-   Event approval, moderation, and flagged-event review.
-   Platform settings for registration, attendance, security, and
    notifications.
-   Platform-wide attendance records and reports.
-   Audit-log interface.

## Technology Stack

The following stack is identified in the supplied web architecture and
SRS.

  -----------------------------------------------------------------------
  Layer                   Technology              Purpose
  ----------------------- ----------------------- -----------------------
  Frontend                HTML, CSS, JavaScript   Page structure,
                                                  styling, and browser
                                                  interactions

  Frontend framework      React                   Component-based user
                                                  interface

  Frontend build tool     Vite                    Frontend development
                                                  server and build
                                                  process

  Backend                 PHP                     Server-side runtime

  Application framework   Laravel 13              Routing, controllers,
                                                  validation,
                                                  authorization, models,
                                                  and application logic

  View/template layer     Blade                   Laravel templating /
                                                  server-rendered views
                                                  where used

  Database                MySQL 8.4 LTS           Persistent relational
                                                  data

  Web server              Nginx                   HTTP server / reverse
                                                  proxy

  PHP process manager     PHP-FPM                 Executes PHP requests
                                                  in production

  Cache and queue         Redis                   Cache and queue support
                                                  in the production
                                                  architecture

  Background processing   Laravel queue worker    Processes queued jobs

  Scheduled processing    Laravel scheduler       Runs scheduled tasks

  Transport security      HTTPS / Let's Encrypt   TLS certificates for
                                                  production
  -----------------------------------------------------------------------

The architecture shows the frontend communicating with the backend
through HTTP/API requests using JSON. The final endpoint list,
authentication mechanism, and API contract are implementation decisions
to be documented in the codebase.

## System Architecture

The high-level request flow is:

``` text
Student / Organizer / Admin
            |
       HTTPS / Browser
            |
            v
  React + HTML + CSS + JavaScript
       (Vite frontend)
            |
       HTTP / JSON API
            |
            v
 Laravel 13 + PHP + Blade
  - Routes and Middleware
  - Controllers
  - Form Requests / Validation
  - Policies / Authorization
  - Models and Services
  - Notifications and Jobs
            |
            v
        MySQL 8.4
            |
            v
 Production environment:
 Nginx + PHP-FPM + Redis
 Queue Worker + Scheduler
 HTTPS / Let's Encrypt
```

### Main backend responsibilities

-   **Routes and middleware:** Map incoming requests and apply
    request/session controls.
-   **Controllers:** Coordinate application requests and responses.
-   **Form Requests:** Validate incoming data.
-   **Policies / authorization:** Enforce role and resource permissions
    on the server.
-   **Models and services:** Represent database entities and implement
    application/data logic.
-   **Notifications and jobs:** Support asynchronous notifications and
    background work.
-   **Queue worker and scheduler:** Process queued and scheduled tasks
    in production.

## Database Design

The supplied ERD identifies five core relational tables.

  -----------------------------------------------------------------------
  Table                   Purpose                 Important fields shown
                                                  in the ERD
  ----------------------- ----------------------- -----------------------
  `users`                 Account identity and    `id`, `name`, `email`,
                          role                    `password`, `role`,
                                                  `created_at`,
                                                  `updated_at`

  `event_organizers`      Organization profile    `id`, `user_id`,
                          linked to a user        `organization_name`,
                                                  `contact_number`,
                                                  timestamps

  `events`                Event details, creator, `id`, `title`,
                          and organizer           `description`, `venue`,
                                                  `event_date`,
                                                  `start_time`,
                                                  `end_time`, `capacity`,
                                                  `status`, `created_by`,
                                                  `organizer_id`,
                                                  timestamps

  `registrations`         Links a user to an      `id`, `user_id`,
                          event                   `event_id`, `qr_token`,
                                                  `status`,
                                                  `registered_at`

  `attendances`           Attendance session for  `id`,
                          a registration          `registration_id`,
                                                  `time_in`, `time_out`,
                                                  `attendance_status`,
                                                  timestamps
  -----------------------------------------------------------------------

### Entity relationships

-   A user can have an organizer profile through
    `event_organizers.user_id`.
-   An organizer profile is associated with events through
    `events.organizer_id`.
-   An event records its creator through `events.created_by`, which
    references a user.
-   A registration connects a user and an event through
    `registrations.user_id` and `registrations.event_id`.
-   An attendance record belongs to a registration through
    `attendances.registration_id`.

``` text
users
  | \
  |  \---- event_organizers
  |                 |
  |                 v
  |               events
  |                 |
  v                 v
registrations <-----+
  |
  v
attendances
```

The ERD is the core data model, not necessarily the complete final
schema. For example, student ID/course fields shown in the UI and the
Admin audit log are not represented as dedicated fields/tables in the
supplied ERD. Confirm their implementation before relying on them.

## Prerequisites

Install the tools and services appropriate to the repository and target
environment:

-   PHP version compatible with the Laravel 13 project and all required
    PHP extensions.
-   Composer.
-   Node.js and npm.
-   MySQL 8.4 LTS (or the version approved for the project).
-   Git.
-   A browser for local testing.

For production, the supplied architecture additionally identifies Linux,
Nginx, PHP-FPM, Redis, a Laravel queue worker, the Laravel scheduler,
and HTTPS using Let's Encrypt.

> Exact PHP/Node versions, PHP extensions, Redis version, and server
> sizing are not specified in the supplied artifacts. Check the actual
> dependency files (`composer.json`, `package.json`, and lockfiles)
> before installing versions.

## Local Development Setup

The following is a conventional Laravel-based starting workflow. It
assumes the repository contains a Laravel application with Composer and
npm manifests. Adjust commands if the actual repository structure
differs.

### 1. Clone the repository

``` bash
git clone https://github.com/khanedith13/attendly.git
cd <repository-folder>
```

### 2. Install backend dependencies

``` bash
composer install
```

### 3. Configure the environment

``` bash
cp .env.example .env
php artisan key:generate
```

On Windows Command Prompt, use:

``` bat
copy .env.example .env
```

Edit `.env` and configure the local database and other services. See
[Environment Configuration](#environment-configuration).

### 4. Create the database

Create a MySQL database for the local project, for example:

``` sql
CREATE DATABASE attendly;
```

Set the matching database name, username, and password in `.env`.

### 5. Run database migrations

``` bash
php artisan migrate
```

If the repository includes seeders and you intend to load development
sample data:

``` bash
php artisan db:seed
```

Only run seeders that are present in the repository and intended for
your environment. The supplied documents do not define production seed
data or default account credentials.

### 6. Install frontend dependencies

``` bash
npm install
```

### 7. Start the development processes

In separate terminal windows, run the Laravel development server and
Vite:

``` bash
php artisan serve
```

``` bash
npm run dev
```

Open the local URL printed by `php artisan serve` in your browser. The
exact frontend/backend development arrangement depends on how React,
Vite, and Blade are integrated in the repository.

### 8. Build frontend assets

For a production frontend build:

``` bash
npm run build
```

## Environment Configuration

A typical Laravel `.env` file requires application and database settings
similar to the following. Use the actual `.env.example` supplied in the
repository as the source of truth.

``` dotenv
APP_NAME=Attendly
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=attendly
DB_USERNAME=root
DB_PASSWORD=
```

Do not commit `.env`, credentials, API keys, mail passwords, or
production secrets to Git. Keep `APP_DEBUG=false` in production.

The SRS also identifies settings and integrations that must be
configured during implementation, including the allowed school email
domain, email/notification provider, QR-code expiration behavior, and
queue/cache configuration. Their exact environment variable names depend
on the implementation.

## Running the Application

Typical local development processes:

  -----------------------------------------------------------------------
  Process                 Command                 Purpose
  ----------------------- ----------------------- -----------------------
  Laravel                 `php artisan serve`     Runs the local Laravel
                                                  application

  Vite                    `npm run dev`           Serves frontend assets
                                                  during development

  Database migrations     `php artisan migrate`   Creates/updates
                                                  database tables

  Frontend build          `npm run build`         Compiles production
                                                  frontend assets
  -----------------------------------------------------------------------

If queued jobs are implemented locally, start a worker in another
terminal:

``` bash
php artisan queue:work
```

If scheduled tasks are implemented, run Laravel's scheduler using the
method appropriate for your local operating system. In production,
configure the server scheduler/cron to invoke Laravel's scheduler
regularly.

## Production Deployment Overview

The supplied architecture describes a Linux VPS/server deployment:

1.  Configure the Linux server and install the required PHP
    runtime/extensions, Composer, Node.js build tooling, MySQL, Redis,
    Nginx, and PHP-FPM.
2.  Deploy the application code and install production dependencies.
3.  Configure production environment variables and secrets.
4.  Build frontend assets.
5.  Configure MySQL and apply reviewed migrations.
6.  Configure Nginx to serve the Laravel application's `public`
    directory and pass PHP requests to PHP-FPM.
7.  Configure Redis where used for cache and queues.
8.  Run the Laravel queue worker under a process manager.
9.  Configure the Laravel scheduler.
10. Configure HTTPS using Let's Encrypt.
11. Apply Laravel production settings, including disabled debug output,
    correct file permissions, and protected environment files.
12. Establish backups, monitoring, and a tested recovery procedure.

Production server sizing, Linux distribution/version, network topology,
backup schedule, recovery objectives, and scaling strategy are not
specified in the supplied architecture and must be decided during
deployment planning.

## Security Notes

-   Enforce authorization on the backend; hiding frontend links is not
    sufficient.
-   Validate input on both the client and server, especially for
    persisted data and privileged actions.
-   Store passwords using secure password hashing. Never store plaintext
    passwords.
-   Restrict account creation to configured/verified school email
    domains.
-   Require manual attendance identity details to match the registered
    profile as specified in the requirements.
-   Protect QR attendance flows. The UI baseline calls for separate
    In/Out codes, refresh/expiry, and scanner protection; token design,
    expiry rules, and replay prevention need technical approval.
-   Protect personal information such as names, school email addresses,
    student identifiers, registrations, and attendance timestamps.
-   Do not expose credentials or internal error details in user-facing
    messages.
-   Use HTTPS in production and keep secrets outside source control.
-   Limit attendee personal-data visibility to authorized organizers.

## Known Decisions and Items to Confirm

The SRS marks several details as **TBD / To Confirm** because they are
not fully defined in the supplied artifacts. Resolve these before
treating the implementation as complete:

-   Exact allowed values for role, event, registration, and attendance
    status enums.
-   Final database constraints, including unique email/QR token rules,
    nullability, indexes, and foreign-key behavior.
-   Student profile fields such as student ID and course/program, which
    appear in the UI but are not shown in the supplied ERD.
-   Persistence model and retention policy for the Admin audit log,
    which is not shown as a table in the ERD.
-   Password-reset workflow and notification mechanism.
-   Exact API endpoints, HTTP methods, request/response schemas,
    authentication mechanism, pagination, and API versioning.
-   QR token generation, cryptographic design, expiration, refresh, and
    duplicate/replay-scan handling.
-   Notification providers, channels, templates, retry behavior, and
    delivery expectations.
-   Exact organizer reminder-message channel/provider.
-   Admin permission granularity and audit-log immutability/retention.
-   Quantitative performance, availability, accessibility, backup, and
    recovery targets.
-   Production server sizing and infrastructure details.

Do not treat sample names, event records, dashboard numbers, or dates
displayed in the UI mockup as production data.

## Project Documentation

The supplied project artifacts are the baseline references for design
and development:

  -----------------------------------------------------------------------
  Document                            Description
  ----------------------------------- -----------------------------------
  `attendly.pdf`                      UI and screen-level requirements
                                      for student, organizer, and admin
                                      workflows

  `attendly_SRS.docx`                 Software Requirements
                                      Specification, version 1.0

  `ERD MODEL_SPEC3(1).png`            Core relational database model

  `Web Architecture(1).png`           Frontend, backend, database, and
                                      production architecture
  -----------------------------------------------------------------------

Keep these documents in the project documentation folder if they are
intended to be versioned with the repository. Do not commit confidential
or personal information unless authorized.

------------------------------------------------------------------------

## License

No license was specified in the supplied project documents. Add a
`LICENSE` file and identify the project's license before distributing or
reusing the code.

## Contributors

Add the project team members and their roles here.
