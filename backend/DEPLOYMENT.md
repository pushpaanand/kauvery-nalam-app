# Azure App Service Deployment Guide

## Prerequisites

1. Azure App Service instance (Node.js runtime)
2. Azure SQL Database configured
3. Environment variables set in Azure App Service Configuration

## Deployment Steps

### Option 1: Deploy via Azure CLI

```bash
# Login to Azure
az login

# Create a resource group (if not exists)
az group create --name kauvery-nalam-rg --location eastus

# Create App Service plan (if not exists)
az appservice plan create --name kauvery-nalam-plan --resource-group kauvery-nalam-rg --sku B1 --is-linux

# Create Web App
az webapp create --resource-group kauvery-nalam-rg --plan kauvery-nalam-plan --name kauvery-nalam-backend --runtime "NODE:18-lts"

# Set environment variables
az webapp config appsettings set --resource-group kauvery-nalam-rg --name kauvery-nalam-backend --settings \
  DB_USER="your_db_user" \
  DB_PASSWORD="your_db_password" \
  DB_SERVER="your_server.database.windows.net" \
  DB_NAME="your_database" \
  DB_TRUST_CERT="true" \
  ENABLE_CRM="true" \
  CRM_BASE_URL="https://api-in21.leadsquared.com/v2/OpportunityManagement.svc/Capture" \
  CRM_ACCESS_KEY="your_access_key" \
  CRM_SECRET_KEY="your_secret_key" \
  NODE_ENV="production"

# Deploy from local directory
cd backend
az webapp up --resource-group kauvery-nalam-rg --name kauvery-nalam-backend --runtime "NODE:18-lts"
```

### Option 2: Deploy via GitHub Actions / Azure DevOps

1. Push code to your repository
2. Configure CI/CD pipeline to:
   - Install dependencies: `npm install --production`
   - Deploy to Azure App Service

### Option 3: Deploy via VS Code Azure Extension

1. Install "Azure App Service" extension in VS Code
2. Right-click on `backend` folder
3. Select "Deploy to Web App"
4. Follow the prompts

## Configuration

### Environment Variables in Azure Portal

1. Go to Azure Portal → Your App Service → Configuration → Application Settings
2. Add all required environment variables:
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_SERVER`
   - `DB_NAME`
   - `DB_TRUST_CERT` (set to "true")
   - `ENABLE_CRM` (set to "true")
   - `CRM_BASE_URL`
   - `CRM_ACCESS_KEY`
   - `CRM_SECRET_KEY`
   - `NODE_ENV` (set to "production")
   - `PORT` (Azure sets this automatically, but you can override)

### Startup Command

For Linux App Service, set in Configuration → General Settings:
```
node server.js
```

For Windows App Service, the `web.config` file handles this automatically.

## Build Configuration

- **Build Command**: `npm install --production` (runs automatically)
- **Startup Command**: `node server.js`
- **Node Version**: 18.x LTS (set in App Service Configuration)

## Important Notes

1. **Port**: Azure App Service sets `PORT` environment variable automatically. The server.js already reads from `process.env.PORT`.

2. **Database**: Ensure Azure SQL Database firewall allows connections from Azure App Service IPs.

3. **CORS**: The backend already has CORS enabled. Update allowed origins if needed for production frontend URL.

4. **Logs**: Check Application Insights or Log Stream in Azure Portal for debugging.

5. **SSL**: Azure App Service provides HTTPS automatically. No additional SSL configuration needed.

## Testing Deployment

After deployment, test the endpoints:

```bash
# Health check
curl https://your-app-name.azurewebsites.net/health

# QR config
curl https://your-app-name.azurewebsites.net/api/qr-config?qr=KH01
```

## Troubleshooting

- **App won't start**: Check Log Stream in Azure Portal
- **Database connection fails**: Verify firewall rules and connection string
- **Environment variables not loading**: Ensure they're set in App Service Configuration, not just .env file
- **Port errors**: Azure sets PORT automatically, don't hardcode it

