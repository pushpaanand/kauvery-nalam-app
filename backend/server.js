/* Simple Express backend for QR-driven assessments.
 * - GET /api/qr-config?qr=KH01 returns location/unit metadata for the QR.
 * - POST /api/assessment accepts user + answers, resolves QR location, and (optionally) forwards to CRM.
 * Replace the in-memory qrConfigs array with a DB lookup when wiring to Azure SQL.
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const https = require('https');
const path = require('path');

// Create an HTTPS agent that handles SSL certificates
// For production, you should use proper certificates, but for now we'll allow self-signed
const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false
});

// Custom fetch function that handles SSL certificates properly
const fetchFn = async (url, options = {}) => {
  // Always use node-fetch for better SSL control
  try {
    const { default: fetch } = await import('node-fetch');
    if (url.startsWith('https://')) {
      return fetch(url, {
        ...options,
        agent: httpsAgent
      });
    }
    return fetch(url, options);
  } catch (err) {
    console.error('Failed to load node-fetch:', err);
    // Fallback to built-in fetch if available (Node 18+)
    if (typeof fetch !== 'undefined') {
      return fetch(url, options);
    }
    throw new Error('No fetch implementation available');
  }
};

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const log = (...args) => {
  if (LOG_LEVEL !== 'silent') console.log('[qr-backend]', ...args);
};

const app = express();
app.use(cors());
app.use(express.json());

// CRM config — keep secrets out of code; set via env vars.
const CRM_BASE_URL = process.env.CRM_BASE_URL || 'https://api-in21.leadsquared.com/v2/OpportunityManagement.svc/Capture';
const CRM_ACCESS_KEY = process.env.CRM_ACCESS_KEY || 'u$r2b2685aad83c93ae18c6775987c2d01a';
const CRM_SECRET_KEY = process.env.CRM_SECRET_KEY || '133b398d3129a2bc1b6975a244c03966bf974972';
const ENABLE_CRM = process.env.ENABLE_CRM === 'true';

// SQL config (ENV driven)
const sqlConfig = {
  user: process.env.DB_USER || 'KauveryNalam',
  password: process.env.DB_PASSWORD || 'kauvery@123',
  server: process.env.DB_SERVER || 'kauverynalam.database.windows.net', // e.g., "myserver.database.windows.net"
  database: process.env.DB_NAME || 'kauverynalamdb',
  options: {
    encrypt: true,
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Validate database configuration
if (!sqlConfig.server || !sqlConfig.user || !sqlConfig.password || !sqlConfig.database) {
  console.error('❌ Database configuration missing!');
  console.error('Required environment variables:');
  console.error('  - DB_SERVER (e.g., myserver.database.windows.net)');
  console.error('  - DB_USER');
  console.error('  - DB_PASSWORD');
  console.error('  - DB_NAME');
  console.error('\nPlease create a .env file in the backend folder with these variables.');
  console.error('See .env.example for a template.\n');
}

let poolPromise;
const getPool = async () => {
  if (!poolPromise) {
    // Validate config before attempting connection
    if (!sqlConfig.server || !sqlConfig.user || !sqlConfig.password || !sqlConfig.database) {
      throw new Error('Database configuration is incomplete. Please check your .env file.');
    }
    poolPromise = sql.connect(sqlConfig);
  }
  return poolPromise;
};

const getQrConfig = async (qrNo) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('qr_no', sql.VarChar(10), qrNo)
      .query(`
        SELECT TOP 1 qr_no, name, region, unit_code, location
        FROM qr_config
        WHERE qr_no = @qr_no AND is_active = 1
      `);
    return result.recordset[0];
  } catch (err) {
    console.error('Database connection error:', err.message);
    if (err.message.includes('configuration')) {
      throw new Error('Database not configured. Please set DB_SERVER, DB_USER, DB_PASSWORD, and DB_NAME in .env file.');
    }
    throw err;
  }
};

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'qr-backend' });
});

// Fetch QR metadata for the frontend; used to set location/unit in sessionStorage.
app.get('/api/qr-config', async (req, res) => {
  const { qr } = req.query;
  if (!qr) {
    return res.status(400).json({ error: 'qr is required' });
  }

  try {
    const cfg = await getQrConfig(qr);
    if (!cfg) {
      return res.status(404).json({ error: 'QR not found or inactive' });
    }
    const { qr_no, name, region, unit_code, location } = cfg;
    return res.json({ qr_no, name, region, unit_code, location });
  } catch (err) {
    console.error('qr-config lookup failed', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

const formatError = (err) => ({
  message: err?.message,
  code: err?.code,
  number: err?.number,
  state: err?.state,
  lineNumber: err?.lineNumber,
  precedingErrors: err?.precedingErrors?.map(e => e.message)
});

// Create user when form is submitted
app.post('/api/users', async (req, res) => {
  const { name, dob, age, phone, email, location } = req.body || {};

  if (!name || !dob || age == null || !location) {
    return res.status(400).json({ error: 'Missing required fields (name, dob, age, location)' });
  }

  log('User creation received', { name, age, location });

  try {
    const pool = await getPool();
    const userResult = await pool.request()
      .input('full_name', sql.NVarChar(200), name)
      .input('dob', sql.Date, dob)
      .input('age', sql.Int, age)
      .input('phone', sql.VarChar(20), phone || null)
      .input('email', sql.NVarChar(254), email || null)
      .input('location', sql.NVarChar(200), location)
      .query(`
        INSERT INTO users (full_name, dob, age, phone, email, location)
        OUTPUT inserted.id
        VALUES (@full_name, @dob, @age, @phone, @email, @location);
      `);
    const userId = userResult.recordset[0].id;
    log('User created', { userId, name });
    return res.json({ ok: true, user_id: userId });
  } catch (err) {
    console.error('User creation failed', err);
    return res.status(500).json({ error: 'Database error', details: formatError(err) });
  }
});

// Receive assessment submission, persist, then push to CRM (optional).
app.post('/api/assessment', async (req, res) => {
  const { qr_no, user_id, user, answers, risk_zone, priority_code, language, mode } = req.body || {};

  if (!qr_no || !user_id || !answers || !risk_zone || !priority_code) {
    return res.status(400).json({ error: 'Missing required fields (qr_no, user_id, answers, risk_zone, priority_code)' });
  }

  log('Assessment received', { qr_no, user_id, risk_zone, priority_code, language, mode });

  let cfg;
  try {
    cfg = await getQrConfig(qr_no);
  } catch (err) {
    console.error('qr-config lookup failed', err);
    return res.status(500).json({ error: 'Internal error', details: formatError(err) });
  }

  if (!cfg) {
    return res.status(404).json({ error: 'QR not found or inactive' });
  }

  const buildCrmPayload = () => {
    const fullName = (user?.name || '').trim();
    const firstName = fullName; // Treat full name as first name; no last name field collected.
    const val = (key) => (answers && answers[key]) ? String(answers[key]) : '';

    // Build LeadDetails array - only include fields with values
    const leadDetails = [
      { Attribute: 'Source', Value: 'Survey - Landing Page' },
      { Attribute: 'mx_Website_Form_Name', Value: 'K Nalam - Kidney' },
      { Attribute: 'FirstName', Value: firstName }
    ];

    // Only add fields that have values
    if (user?.phone) {
      leadDetails.push({ Attribute: 'Phone', Value: user.phone });
    }
    if (user?.dob) {
      leadDetails.push({ Attribute: 'mx_Date_of_Birth', Value: user.dob });
    }
    if (user?.location) {
      leadDetails.push({ Attribute: 'mx_Street1', Value: user.location });
    }
    if (user?.age != null) {
      leadDetails.push({ Attribute: 'mx_Age', Value: String(user.age) });
    }
    if (val('q2')) {
      leadDetails.push({ Attribute: 'mx_Gender', Value: val('q2') });
    }
    // Add SearchBy field for LeadSquared to search by phone
    if (user?.phone) {
      leadDetails.push({ Attribute: 'SearchBy', Value: 'Phone' });
    }
    if (cfg.location) {
      leadDetails.push({ Attribute: 'mx_Latest_Hospital_Location', Value: cfg.location });
    }
    leadDetails.push({ Attribute: 'mx_Latest_Department_Visited', Value: 'Nephrology' });

    return {
      LeadDetails: leadDetails,
      Opportunity: {
        OpportunityEventCode: 12000,
        OpportunityNote: 'Opportunity from kauvery nalam',
        Fields: [
          { SchemaName: 'mx_Custom_1', Value: `${firstName || fullName} - K Nalam Opportunity` },
          { SchemaName: 'mx_Custom_26', Value: 'Campaign' },
          { SchemaName: 'mx_Custom_52', Value: 'Survey - Landing Page' },
          { SchemaName: 'Owner', Value: 'helpdesk@kauveryhospital.com' },
          { SchemaName: 'mx_Custom_12', Value: cfg.location || '' },
          { SchemaName: 'mx_Custom_13', Value: 'Nephrology' },
          { SchemaName: 'Status', Value: 'Open' },
          { SchemaName: 'mx_Custom_2', Value: 'Support' },
          {
            SchemaName: 'mx_Custom_86',
            Value: '',
            Fields: [
              { SchemaName: 'mx_CustomObject_1', Value: val('q1') || 'Not provided' },  // Age Group
              { SchemaName: 'mx_CustomObject_2', Value: val('q2') || 'Not provided' },  // Gender
              { SchemaName: 'mx_CustomObject_3', Value: val('q3') || 'Not provided' },  // Diabetes / High BP
              { SchemaName: 'mx_CustomObject_4', Value: val('q4') || 'Not provided' },  // Family History: Kidney Disease
              { SchemaName: 'mx_CustomObject_5', Value: val('q5') || 'Not provided' },  // Painkillers / Native Med
              { SchemaName: 'mx_CustomObject_6', Value: val('q6') || 'Not provided' },  // Swelling
              { SchemaName: 'mx_CustomObject_7', Value: val('q7') || 'Not provided' },  // Foamy / colored urine
              { SchemaName: 'mx_CustomObject_8', Value: val('q8') || 'Not provided' },  // Breathlessness
              { SchemaName: 'mx_CustomObject_9', Value: val('q9') || 'Not provided' },  // Kidney stone
              { SchemaName: 'mx_CustomObject_10', Value: val('q10') || 'Not provided' }, // Kidney problem / high creatinine
              { SchemaName: 'mx_CustomObject_11', Value: val('q11') || 'Not provided' }, // Difficulty passing urine
              { SchemaName: 'mx_CustomObject_12', Value: val('q12') || 'Not provided' }, // Recent blood / urine test
              { SchemaName: 'mx_CustomObject_13', Value: val('q13') || 'Not provided' }, // HbA1c
              { SchemaName: 'mx_CustomObject_14', Value: val('q14') || 'Not provided' }, // Serum Creatinine
              { SchemaName: 'mx_CustomObject_15', Value: val('q15') || 'Not provided' }, // Urine Protein
              { SchemaName: 'mx_CustomObject_16', Value: risk_zone || 'Not provided' } // Final Status
            ]
          }
        ]
      }
    };
  };

  try {
    const pool = await getPool();
    // Insert assessment linked to user_id
    const assessResult = await pool.request()
      .input('user_id', sql.UniqueIdentifier, user_id)
      .input('qr_no', sql.VarChar(10), cfg.qr_no)
      .input('location', sql.NVarChar(200), cfg.location)
      .input('risk_zone', sql.VarChar(10), risk_zone)
      .input('priority_code', sql.VarChar(50), priority_code)
      .input('language', sql.VarChar(5), language || 'en')
      .input('mode', sql.VarChar(10), mode || 'self')
      .input('raw_answers_json', sql.NVarChar(sql.MAX), JSON.stringify(answers))
      .query(`
        INSERT INTO assessment (
          user_id, qr_no, location, risk_zone, priority_code, language, mode, raw_answers_json
        )
        VALUES (
          @user_id, @qr_no, @location, @risk_zone, @priority_code, @language, @mode, @raw_answers_json
        );
      `);
    log('SQL insert ok', { user_id, qr_no: cfg.qr_no, location: cfg.location, risk_zone, priority_code });
  } catch (err) {
    console.error('SQL insert failed', err);
    return res.status(500).json({ error: 'Database error', details: formatError(err) });
  }

  let crmStatus = 'skipped';
  let crmResponseCode = null;
  let crmResponseBody = null;

  if (ENABLE_CRM) {
    try {
      const crmPayload = buildCrmPayload();
      const url = `${CRM_BASE_URL}?accessKey=${encodeURIComponent(CRM_ACCESS_KEY)}&secretKey=${encodeURIComponent(CRM_SECRET_KEY)}`;
      
      log('Sending to CRM...', { 
        url: CRM_BASE_URL, 
        location: cfg.location,
        qr_no: cfg.qr_no,
        risk_zone,
        hasAccessKey: !!CRM_ACCESS_KEY && CRM_ACCESS_KEY !== 'SET_ME',
        hasSecretKey: !!CRM_SECRET_KEY && CRM_SECRET_KEY !== 'SET_ME'
      });
      
      console.log('CRM Payload:', JSON.stringify(crmPayload, null, 2));
      
      const resp = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crmPayload)
      });
      
      crmResponseCode = resp.status;
      crmResponseBody = await resp.text();
      
      if (!resp.ok) {
        console.error('CRM push failed', { 
          status: resp.status, 
          body: crmResponseBody.substring(0, 500) // Limit log size
        });
        // Don't fail the request if CRM fails, just log it
        crmStatus = 'failed';
      } else {
        crmStatus = 'success';
        log('CRM push successful', { 
          status: resp.status,
          response: crmResponseBody.substring(0, 200) // Log first 200 chars
        });
      }
    } catch (err) {
      console.error('CRM push error', err);
      crmStatus = 'failed';
      crmResponseBody = err.message;
      // Don't fail the request if CRM fails
    }
  } else {
    log('CRM disabled (ENABLE_CRM=false or not set)');
  }

  return res.json({
    ok: true,
    qr_no: cfg.qr_no,
    location: cfg.location,
    unit_code: cfg.unit_code,
    crmStatus,
    crmResponseCode,
    crmEnabled: ENABLE_CRM,
    crmResponseBody: crmResponseBody ? crmResponseBody.substring(0, 200) : null
  });
});

app.use(express.static(path.join(__dirname, "..", "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
});

// Azure App Service sets PORT automatically, use it or default to 4000 for local dev
const PORT = process.env.PORT || 4000;
const HOST = process.env.WEBSITE_HOSTNAME ? '0.0.0.0' : 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`QR backend listening on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.WEBSITE_SITE_NAME) {
    console.log(`Azure App Service: ${process.env.WEBSITE_SITE_NAME}`);
  }
});

