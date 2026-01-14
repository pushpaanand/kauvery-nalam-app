# Environment Variables Setup

## Create .env file

Create a `.env` file in the `backend` folder with the following content:

```env
# Database Configuration (Azure SQL)
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_SERVER=your_server.database.windows.net
DB_NAME=your_database_name
DB_TRUST_CERT=true

# CRM Configuration (LeadSquared)
ENABLE_CRM=true
CRM_BASE_URL=https://api-in21.leadsquared.com/v2/OpportunityManagement.svc/Capture
CRM_ACCESS_KEY=your_access_key_here
CRM_SECRET_KEY=your_secret_key_here

# Server Port
PORT=4000

# Email Configuration (for Daily Reports)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=Kauvery Nalam <your_email@gmail.com>
REPORT_EMAIL_TO=recipient1@example.com,recipient2@example.com
```

## Important Notes

1. **Use `process.env` in backend** - This is correct for Node.js backend code
2. **Use `import.meta.env` in frontend** - This is for Vite frontend code only
3. **Never commit .env file** - It contains sensitive credentials
4. **Install dotenv** - Run `npm install` in the backend folder to install the dotenv package

## Quick Setup

1. Copy this template to `backend/.env`
2. Replace all `your_*` placeholders with your actual values
3. Restart the backend server

