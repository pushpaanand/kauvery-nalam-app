# Backend Setup Instructions

## Quick Start

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set environment variables:**
   Create a `.env` file in the `backend` folder with:
   ```
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_SERVER=your_server.database.windows.net
   DB_NAME=your_database
   DB_TRUST_CERT=true
   
   ENABLE_CRM=true
   CRM_BASE_URL=https://api-in21.leadsquared.com/v2/OpportunityManagement.svc/Capture
   CRM_ACCESS_KEY=your_access_key
   CRM_SECRET_KEY=your_secret_key
   
   PORT=4000
   ```

3. **Start the backend:**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Verify it's running:**
   Open http://localhost:4000/health in your browser. You should see:
   ```json
   {"ok": true, "service": "qr-backend"}
   ```

## API Endpoints

- `GET /health` - Health check
- `GET /api/qr-config?qr=KH05` - Get QR configuration
- `POST /api/users` - Create user
- `POST /api/assessment` - Submit assessment

## Troubleshooting

**Error: "Backend server not responding"**
- Make sure the backend is running on port 4000
- Check that all environment variables are set correctly
- Verify database connection is working

**Error: "Cannot connect to backend server"**
- Check if port 4000 is already in use
- Verify the backend started successfully (check console logs)
- Make sure firewall isn't blocking the port

