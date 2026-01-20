# Daily Email Report Setup

## Overview
This cron job sends a daily email report at midnight (12:00 AM) with all users who submitted assessments on the previous day.

## Installation

1. Install required packages:
```bash
cd backend
npm install nodemailer node-cron
```

## Environment Variables

Add these to your `backend/.env` file:

```env
# Email Configuration (for Daily Reports)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=Kauvery Nalam <your_email@gmail.com>
REPORT_EMAIL_TO=recipient1@example.com,recipient2@example.com
```

### Office 365 / Microsoft 365 Setup (for @kauveryhospital.com)

For custom domain emails like `@kauveryhospital.com`, use Office 365 settings:

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=productanalyst.pushpa@kauveryhospital.com
SMTP_PASS=your_app_password_or_regular_password
```

**Important Notes:**
1. If using regular password: Make sure the account allows "Less secure app access" or use App Password
2. If 2FA is enabled: Generate an App Password from Microsoft Account Security settings
3. The password should be the actual password or app password (not the Gmail app password format)

### Gmail Setup (if using Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Create an app password for "Mail"
   - Use this password in `SMTP_PASS`
3. Use `smtp.gmail.com` as SMTP_HOST

### Other Email Providers

For other providers (SendGrid, etc.), adjust:
- `SMTP_HOST`: Your SMTP server
- `SMTP_PORT`: Usually 587 (TLS) or 465 (SSL)
- `SMTP_SECURE`: true for port 465, false for port 587

## Email Report Contents

The daily email includes:
- **User ID**: Database user ID
- **Username**: Full name from users table
- **Mobile Number**: Phone number
- **QR No**: QR code number
- **Priority Code**: Assessment priority code
- **Risk Zone**: RED, AMBER, or GREEN
- **Mode**: self or parent
- **Submitted Date Time**: When the assessment was submitted

## Database Schema Requirements

The script assumes the `assessment` table has a `created_at` timestamp field. If your table uses a different column name (e.g., `submitted_at`, `timestamp`), update the query in `dailyReport.js`:

```javascript
// In fetchDailyUsers function, change:
a.created_at AS submitted_at
// To your actual column name
```

## Testing

Run the report manually to test:

```bash
cd backend
node dailyReport.js
```

This will:
1. Fetch users from yesterday
2. Generate the email
3. Send it to the configured recipients

## Cron Schedule

The cron job runs daily at **12:00 AM (midnight)** in Asia/Kolkata timezone.

To change the schedule, edit `dailyReport.js`:
```javascript
// Current: '0 0 * * *' = Every day at 00:00
// Example: '0 2 * * *' = Every day at 02:00 AM
cron.schedule('0 0 * * *', async () => {
  // ...
}, {
  timezone: "Asia/Kolkata" // Change timezone if needed
});
```

## Troubleshooting

1. **No emails received**: Check SMTP credentials and firewall
2. **Database errors**: Verify database connection and table schema
3. **Cron not running**: Ensure the server is running 24/7 or use a process manager like PM2
4. **Timezone issues**: Adjust timezone in cron schedule

## Production Deployment

For production, use a process manager to ensure the cron job runs:

```bash
# Install PM2
npm install -g pm2

# Start server with PM2
pm2 start server.js --name kauvery-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

This ensures the cron job continues running even after server restarts.
