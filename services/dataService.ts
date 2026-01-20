import { AssessmentData, AssessmentResult, UserInfo } from "../types";

/**
 * SOLUTION FOR STORING DATA AS A TABLE:
 * 
 * To store this valuable data as a table without a heavy backend, 
 * the best lightweight solution is a Google Apps Script Web App.
 * 
 * 1. Create a Google Sheet.
 * 2. Extensions > Apps Script.
 * 3. Write a `doPost(e)` function to append rows.
 * 4. Deploy as Web App > Access: Anyone.
 * 5. Paste the URL below as API_ENDPOINT.
 * 
 * This creates a perfect, exportable, real-time table of all patient leads.
 */

// Mock Endpoint - Replace with your Google Script URL or Backend API
const API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx_YOUR_SCRIPT_ID_HERE/exec'; 

export const generatePriorityCode = (zone: string): string => {
  // Format: KN-{ZONE}-{DDMMYY}-{RAND}
  // Example: KN-RED-061225-440
  
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const yy = String(now.getFullYear()).slice(-2);
  
  const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 digit number 100-999
  
  return `KN-${zone}-${dd}${mm}${yy}-${randomSuffix}`;
};

// Create user when form is submitted
export const createUser = async (userInfo: UserInfo): Promise<string | null> => {
  const apiBase = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE) ? (import.meta as any).env.VITE_API_BASE : '';
  const apiUrl = `${apiBase}/api/users`;
  
  console.log('[createUser] Calling API:', apiUrl);
  console.log('[createUser] Payload:', userInfo);

  const payload = {
    name: userInfo.name,
    dob: userInfo.dob,
    age: userInfo.age,
    phone: userInfo.phone || '',
    email: userInfo.email || '',
    location: userInfo.location
  };

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('[createUser] Response status:', resp.status);

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[createUser] API failed', resp.status, text);
      return null;
    }
    const data = await resp.json();
    console.log('[createUser] Success, userId:', data.user_id);
    return data.user_id || null;
  } catch (error) {
    console.error("[createUser] Network/parse error", error);
    return null;
  }
};

export const submitAssessment = async (
  answers: AssessmentData,
  result: AssessmentResult,
  unit: string,
  language: string,
  mode: string,
  userInfo: UserInfo | null,
  userId: string | null,
  qrNo?: string | null
): Promise<boolean> => {
  const apiBase = (typeof import.meta !== 'undefined' && process.env.VITE_API_BASE) ? process.env.VITE_API_BASE : 'https://kauverynalam-ccechsb6dwdhc5eg.southindia-01.azurewebsites.net';
  const apiUrl = `${apiBase}/api/assessment`;

  if (!userId) {
    console.error('[submitAssessment] Cannot submit assessment without user_id');
    return false;
  }

  if (!qrNo) {
    console.error('[submitAssessment] Cannot submit assessment without qr_no');
    return false;
  }

  const payload = {
    qr_no: qrNo,
    user_id: userId,
    user: {
      name: userInfo?.name || '',
      dob: userInfo?.dob || '',
      age: userInfo?.age || 0,
      phone: userInfo?.phone || '',
      email: userInfo?.email || '',
      location: userInfo?.location || ''
    },
    answers,
    risk_zone: result.zone,
    priority_code: result.code || 'N/A',
    language,
    mode
  };

  console.log('[submitAssessment] Calling API:', apiUrl);
  console.log('[submitAssessment] Payload:', { 
    qr_no: payload.qr_no, 
    user_id: payload.user_id, 
    risk_zone: payload.risk_zone,
    priority_code: payload.priority_code,
    answers_count: Object.keys(payload.answers).length
  });

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('[submitAssessment] Response status:', resp.status);

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[submitAssessment] API failed', resp.status, text);
      return false;
    }
    
    const data = await resp.json();
    console.log('[submitAssessment] Success:', data);
    return true;
  } catch (error) {
    console.error("[submitAssessment] Network/parse error", error);
    return false;
  }
};

// Trigger daily report email
export const triggerDailyReport = async (): Promise<{ success: boolean; message: string }> => {
  const apiBase = (typeof import.meta !== 'undefined' && process.env.VITE_API_BASE) ? process.env.VITE_API_BASE : 'https://kauverynalam-ccechsb6dwdhc5eg.southindia-01.azurewebsites.net';
  const apiUrl = `${apiBase}/api/trigger-daily-report`;

  console.log('[triggerDailyReport] Calling API:', apiUrl);

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('[triggerDailyReport] Response status:', resp.status);

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[triggerDailyReport] API failed', resp.status, text);
      return { success: false, message: 'Failed to send report' };
    }
    
    const data = await resp.json();
    console.log('[triggerDailyReport] Success:', data);
    return { success: true, message: data.message || 'Report sent successfully' };
  } catch (error) {
    console.error("[triggerDailyReport] Network/parse error", error);
    return { success: false, message: 'Network error occurred' };
  }
};