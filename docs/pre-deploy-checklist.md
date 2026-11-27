# Attendly pre-deployment checklist

Tick every item before the first real event.

## 1. Automated checks
- [ ] `php artisan test` passes (in `backend`)
- [ ] `npm run lint` shows no output (in `frontend`)
- [ ] `npm run build` finishes without errors, with `VITE_API_BASE_URL` set
- [ ] `php artisan migrate:fresh` works on an empty scratch MySQL database (never on real data)

## 2. Configuration and security
- [ ] `APP_ENV=production` and `APP_DEBUG=false`
- [ ] A new `APP_KEY` generated on the server
- [ ] `SCHOOL_DOMAIN=usjr.edu.ph` is set before seeding, so only `@usjr.edu.ph` emails can create accounts
- [ ] `APP_NAME=Attendly` and a real `MAIL_*` setup (SMTP host, username, password, a verified `MAIL_FROM_ADDRESS`)
- [ ] A new database password (the old one is in git history)
- [ ] Only `SettingsSeeder` is run; the full seeder creates a demo admin with a known password
- [ ] The real admin is created with `php artisan attendly:create-admin`
- [ ] `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` are the exact frontend address, without a trailing slash
- [ ] The API and the frontend are both served over HTTPS (phone cameras need it)
- [ ] `.env` is not tracked by git (`git ls-files | findstr .env` shows only `.env.example`)
- [ ] Upload limits allow a 5 MB selfie (nginx `client_max_body_size`, PHP `upload_max_filesize` and `post_max_size`)

## 3. Manual test on a real phone
- [ ] Create an account with a real `@usjr.edu.ph` address, and confirm a Gmail address is refused
- [ ] Use "Forgot password", receive the email (check spam), open the link, set a new password and log in
- [ ] Guest: check in, check out, then try a wrong detail, a wrong QR and a duplicate check-in
- [ ] Student: register for an event, scan check-in, see the receipt with the selfie, check out
- [ ] Organizer: sign up, get approved, create and publish an event, download both QR codes, see the roster and selfies
- [ ] Admin: approve the organizer, flag an event, confirm students can no longer check in to it
- [ ] Open a QR link directly in a fresh tab; it must not show a 404

## 4. Event-day rehearsal
- [ ] Create an event for right now on the live server and check in, to prove the server clock and timezone
- [ ] About 20 people check in within a minute from one Wi-Fi network without being blocked
- [ ] A 3 to 4 MB selfie uploads successfully

## 5. Privacy and data
- [ ] Students are told their selfie is stored and who can see it
- [ ] A retention rule exists for selfies, and someone can delete them
- [ ] Database and selfie backups run nightly and one restore has been tested

## 6. Known gaps to accept knowingly
- [ ] Account creation does not verify that the person owns the school mailbox; anyone can sign up with an unused `@usjr.edu.ph` address
- [ ] Admin settings marked "Backend later" (auto-mark absent, session timeout, two-factor for admins, the two email alerts) are saved but do not change behavior yet