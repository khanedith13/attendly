-- =====================================================================
-- Attendly | Database spec 4 (MySQL 8.0.16 or newer)
-- Replaces ERD_SQL_SCRIPT_SPEC3.sql. This file is the REFERENCE design.
-- In the Laravel project the same tables are created by migrations.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS attendly
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE attendly;


-- =========================================
-- 1. USERS
-- =========================================
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'organizer', 'admin') NOT NULL DEFAULT 'student',

    -- pending = organizer waiting for approval, suspended = cannot log in
    status ENUM('active', 'pending', 'suspended') NOT NULL DEFAULT 'active',

    student_id VARCHAR(20) NULL UNIQUE,            -- format 2026-10452
    course VARCHAR(100) NULL,
    year_level VARCHAR(30) NULL,
    notification_preferences JSON NULL,            -- switches on My Account / Organizer Profile
    password_changed_at TIMESTAMP NULL,            -- "Last updated 32 days ago"
    remember_token VARCHAR(100) NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_role_status (role, status)
);


-- =========================================
-- 2. EVENT ORGANIZERS (organization profile of an organizer user)
-- =========================================
CREATE TABLE event_organizers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,       -- one profile per user
    organization_name VARCHAR(150) NOT NULL,
    contact_number VARCHAR(30) NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_organizer_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


-- =========================================
-- 3. EVENTS
-- =========================================
CREATE TABLE events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organizer_id BIGINT UNSIGNED NOT NULL,

    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    category VARCHAR(50) NOT NULL,                 -- Technology, Leadership, Career, Community
    venue VARCHAR(200) NOT NULL,                   -- e.g. "Innovation Hall, Main Campus"
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT UNSIGNED NOT NULL,

    -- What the organizer chose. "Live" and "Closed" are worked out from the date and time.
    status ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled')
        NOT NULL DEFAULT 'draft',

    -- Admin moderation. Students only see published + approved events.
    review_status ENUM('approved', 'pending', 'flagged') NOT NULL DEFAULT 'approved',
    review_note VARCHAR(200) NULL,

    -- Registration settings on the Create Event form
    require_school_gmail TINYINT(1) NOT NULL DEFAULT 1,
    send_confirmation_email TINYINT(1) NOT NULL DEFAULT 1,

    -- Event QR codes (students scan these to check in and out)
    qr_in_token CHAR(36) NOT NULL UNIQUE,
    qr_out_token CHAR(36) NOT NULL UNIQUE,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_events_times CHECK (end_time > start_time),
    CONSTRAINT chk_events_capacity CHECK (capacity >= 1),

    CONSTRAINT fk_event_organizer
        FOREIGN KEY (organizer_id)
        REFERENCES event_organizers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_events_date (event_date),
    INDEX idx_events_visibility (status, review_status),
    INDEX idx_events_category (category)
);


-- =========================================
-- 4. REGISTRATIONS (one per student and event)
-- =========================================
CREATE TABLE registrations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    event_id BIGINT UNSIGNED NOT NULL,

    qr_token CHAR(36) NOT NULL UNIQUE,             -- the student's ticket
    status ENUM('registered', 'cancelled') NOT NULL DEFAULT 'registered',

    registered_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_registration_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_registration_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    -- A student can register for an event only once
    -- (cancelling and registering again reuses the same row).
    CONSTRAINT unique_user_event UNIQUE (user_id, event_id),

    INDEX idx_registrations_event_status (event_id, status)
);


-- =========================================
-- 5. ATTENDANCES (one per registration, created at check-in)
-- =========================================
CREATE TABLE attendances (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    registration_id BIGINT UNSIGNED NOT NULL,

    time_in DATETIME NULL,
    time_out DATETIME NULL,

    -- present / late are set at check-in using the "late grace period" setting.
    -- A registered student with no attendance row after the event is absent.
    attendance_status ENUM('present', 'absent', 'late') NOT NULL DEFAULT 'present',

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_attendance_times
        CHECK (time_out IS NULL OR (time_in IS NOT NULL AND time_out >= time_in)),

    CONSTRAINT fk_attendance_registration
        FOREIGN KEY (registration_id)
        REFERENCES registrations(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT unique_registration_attendance UNIQUE (registration_id)
);


-- =========================================
-- 6. SETTINGS (key / value, edited on the Admin Settings screen)
-- =========================================
CREATE TABLE settings (
    `key` VARCHAR(100) NOT NULL PRIMARY KEY,
    `value` TEXT NOT NULL,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO settings (`key`, `value`) VALUES
    ('platform_name', 'Attendly'),
    ('school_domain', 'school.edu.ph'),
    ('require_school_gmail', 'true'),
    ('require_event_approval', 'false'),
    ('allow_organizer_signup', 'true'),
    ('late_grace_minutes', '15'),
    ('auto_mark_absent', 'true'),
    ('session_timeout_minutes', '60'),
    ('two_factor_admins', 'false'),
    ('email_new_organizer', 'true'),
    ('email_flagged_event', 'true');


-- =========================================
-- 7. AUDIT LOGS (append-only: rows are never edited or deleted by the app)
-- =========================================
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,                  -- NULL for failed logins by unknown people
    actor_name VARCHAR(150) NOT NULL,              -- copied, so the log survives user deletion
    actor_role VARCHAR(20) NULL,
    action VARCHAR(100) NOT NULL,
    target VARCHAR(255) NULL,
    result ENUM('success', 'failed') NOT NULL DEFAULT 'success',
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_audit_created (created_at),
    INDEX idx_audit_result (result)
);
