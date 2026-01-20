/* Daily Email Report Cron Job
 * Runs at midnight (12:00 AM) daily to send email report of users who submitted assessments
 * 
 * Required fields in email:
 * - user_id
 * - username (full_name)
 * - mobile number (phone)
 * - qr_no
 * - priority_code
 * - risk_zone
 * - mode
 * - submitted date time
 */

require('dotenv').config();
const sql = require('mssql');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

// Database connection - reuse the same config as server.js
// Use the same hardcoded values as server.js for consistency
const sqlConfig = {
  user: process.env.DB_USER || 'KauveryNalam',
  password: process.env.DB_PASSWORD || 'kauvery@123',
  server: process.env.DB_SERVER || 'kauverynalam.database.windows.net',
  database: process.env.DB_NAME || 'kauverynalamdb',
  options: {
    encrypt: true,
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let poolPromise = null;
const getPool = async () => {
  if (!poolPromise) {
    // Validate config before attempting connection
    if (!sqlConfig.server || !sqlConfig.user || !sqlConfig.password || !sqlConfig.database) {
      throw new Error('Database configuration is incomplete. Please check your .env file.');
    }
    try {
      poolPromise = sql.connect(sqlConfig);
      console.log('Database connected for daily report');
      return poolPromise;
    } catch (err) {
      console.error('Database connection failed:', err);
      throw err;
    }
  }
  return poolPromise;
};

// Email transporter configuration
// Using Gmail service (Google Workspace) - matches working configuration from other project
const createTransporter = () => {
  const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'true';
  const smtpUser = (process.env.SMTP_USER || 'productanalyst.pushpa@kauveryhospital.com').trim();
  const smtpPass = (process.env.SMTP_PASS || 'fprg nbfn ftat hngt').trim();

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials not configured');
  }

  // Debug logging (mask sensitive data but show what we're using)
  console.log('SMTP Config:', { 
    service: 'gmail',
    user: smtpUser,
    passLength: smtpPass.length,
    passHasSpaces: smtpPass.includes(' '),
    rejectUnauthorized,
    hasEnvUser: !!process.env.SMTP_USER,
    hasEnvPass: !!process.env.SMTP_PASS
  });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    tls: {
      rejectUnauthorized
    },
    debug: process.env.SMTP_DEBUG === 'true'
  });

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.error('SMTP Verification failed:', error.message);
    } else {
      console.log('SMTP Server is ready to take our messages');
    }
  });

  return transporter;
};

// Format date for SQL query (get yesterday's date)
const getYesterdayDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
};

// Format date for display
const formatDate = (date) => {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Generate HTML email report
const generateEmailHTML = (reportDate, users) => {
  const totalUsers = users.length;
  const redZone = users.filter(u => u.risk_zone === 'RED').length;
  const amberZone = users.filter(u => u.risk_zone === 'AMBER').length;
  const greenZone = users.filter(u => u.risk_zone === 'GREEN').length;

  let tableRows = '';
  users.forEach((user, index) => {
    const riskColor = user.risk_zone === 'RED' ? '#dc2626' : 
                     user.risk_zone === 'AMBER' ? '#f59e0b' : '#10b981';
    
    tableRows += `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; text-align: center;">${index + 1}</td>
        <td style="padding: 8px;">${user.user_id}</td>
        <td style="padding: 8px;">${user.full_name || 'N/A'}</td>
        <td style="padding: 8px;">${user.phone || 'N/A'}</td>
        <td style="padding: 8px;">${user.qr_no || 'N/A'}</td>
        <td style="padding: 8px; font-family: monospace;">${user.priority_code || 'N/A'}</td>
        <td style="padding: 8px;">
          <span style="background-color: ${riskColor}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
            ${user.risk_zone || 'N/A'}
          </span>
        </td>
        <td style="padding: 8px;">${user.mode || 'N/A'}</td>
        <td style="padding: 8px;">${formatDate(user.submitted_at)}</td>
      </tr>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background-color: #E6004C; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .summary { background-color: white; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
        .summary-item { display: inline-block; margin-right: 30px; }
        .summary-label { font-weight: bold; color: #6b7280; }
        .summary-value { font-size: 24px; font-weight: bold; color: #111827; }
        table { width: 100%; border-collapse: collapse; background-color: white; }
        th { background-color: #f3f4f6; padding: 12px 8px; text-align: left; font-weight: bold; border-bottom: 2px solid #e5e7eb; }
        td { padding: 8px; }
        .footer { margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 0 0 8px 8px; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Kauvery Nalam - Daily Assessment Report</h1>
          <p>Report Date: ${formatDate(reportDate)}</p>
        </div>
        <div class="content">
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Users</div>
              <div class="summary-value">${totalUsers}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label" style="color: #dc2626;">RED Zone</div>
              <div class="summary-value" style="color: #dc2626;">${redZone}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label" style="color: #f59e0b;">AMBER Zone</div>
              <div class="summary-value" style="color: #f59e0b;">${amberZone}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label" style="color: #10b981;">GREEN Zone</div>
              <div class="summary-value" style="color: #10b981;">${greenZone}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">#</th>
                <th>User ID</th>
                <th>Username</th>
                <th>Mobile Number</th>
                <th>QR No</th>
                <th>Priority Code</th>
                <th>Risk Zone</th>
                <th>Mode</th>
                <th>Submitted Date Time</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows || '<tr><td colspan="9" style="text-align: center; padding: 20px;">No users found for this date.</td></tr>'}
            </tbody>
          </table>
        </div>
        <div class="footer">
          <p>This is an automated daily report generated by Kauvery Nalam System</p>
          <p>Generated at: ${new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Fetch daily users from database
const fetchDailyUsers = async (reportDate) => {
  try {
    const pool = await getPool();
    
    // Query to get users and their assessments for the specified date
    // Using submitted_at column as per database schema
    const query = `
      SELECT 
        u.id AS user_id,
        u.full_name,
        u.phone,
        a.qr_no,
        a.priority_code,
        a.risk_zone,
        a.mode,
        a.submitted_at
      FROM assessment a
      INNER JOIN users u ON a.user_id = u.id
      WHERE CAST(a.submitted_at AS DATE) = CAST(@reportDate AS DATE)
      ORDER BY a.submitted_at DESC
    `;

    const result = await pool.request()
      .input('reportDate', sql.DateTime, reportDate)
      .query(query);

    return result.recordset;
  } catch (err) {
    console.error('Error fetching daily users:', err);
    throw err;
  }
};

// Send daily report email
const sendDailyReport = async () => {
  try {
    console.log('Starting daily report generation...');
    
    const reportDate = getYesterdayDate();
    console.log(`Fetching users for date: ${formatDate(reportDate)}`);
    
    const users = await fetchDailyUsers(reportDate);
    console.log(`Found ${users.length} users for the report date`);

    if (users.length === 0) {
      console.log('No users found for the report date. Skipping email.');
      return;
    }

    const transporter = createTransporter();
    const emailHTML = generateEmailHTML(reportDate, users);
    
    const smtpUser = (process.env.SMTP_USER || 'productanalyst.pushpa@kauveryhospital.com').trim();
    const from = process.env.SMTP_FROM || smtpUser;
    
    const mailOptions = {
      from: from,
      to: process.env.REPORT_EMAIL_TO || 'ida@kauveryhospital.com,digitaltrichy.implementation@kauveryhospital.com', // Comma-separated list of recipients
      subject: `Kauvery Nalam - Daily Assessment Report - ${formatDate(reportDate).split(',')[0]}`,
      html: emailHTML,
      // Plain text version
      text: `Kauvery Nalam Daily Report\n\nTotal Users: ${users.length}\n\nSee attached HTML for detailed report.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Daily report email sent successfully:', info.messageId);
    console.log(`Report sent to: ${process.env.REPORT_EMAIL_TO}`);
    
  } catch (err) {
    console.error('Error sending daily report:', err);
    // Don't throw - allow cron to continue
  }
};

// Schedule cron job to run daily at midnight (12:00 AM)
// Cron format: minute hour day month day-of-week
// '0 0 * * *' = Every day at 00:00 (midnight)
const scheduleDailyReport = () => {
  console.log('Scheduling daily report cron job (runs at 12:00 AM daily)...');
  
  cron.schedule('0 0 * * *', async () => {
    console.log('Cron job triggered at:', new Date().toLocaleString('en-IN'));
    await sendDailyReport();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Adjust to your timezone
  });

  console.log('Daily report cron job scheduled successfully');
};

// Run immediately if called directly (for testing)
if (require.main === module) {
  console.log('Running daily report manually (for testing)...');
  sendDailyReport()
    .then(() => {
      console.log('Manual report completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Manual report failed:', err);
      process.exit(1);
    });
}

module.exports = {
  sendDailyReport,
  scheduleDailyReport,
  fetchDailyUsers
};
