# Deploying LMS Backend to Render

This guide will help you deploy the LMS Backend to Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. MongoDB Atlas database (or any MongoDB instance)
3. GitHub repository: `https://github.com/traincapetech/LMS-Server.git`

## Step-by-Step Deployment

### 1. Push Your Code to GitHub

```bash
cd LMS-Backend
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 2. Create a New Web Service on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select the repository: `traincapetech/LMS-Server`
5. Configure the service:
   - **Name**: `lms-backend` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: Leave empty (or set to `LMS-Backend` if repo structure requires it)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Choose Free or Paid plan

### 3. Configure Environment Variables

In the Render dashboard, go to **Environment** tab and add these variables:

#### Required Variables:
- `MONGO_URI` - Your MongoDB Atlas connection string
- `JWT_SECRET` - A random secret string for JWT token signing
- `PORT` - Set to `10000` (Render automatically sets this, but you can set it explicitly)

#### Admin Configuration:
- `ADMIN_EMAIL` - Admin email address (e.g., `admin@traincapetech.com`)
- `ADMIN_PASSWORD` - Admin password

#### Email Configuration (Hostinger SMTP):
- `SMTP_HOST` - `smtp.hostinger.com`
- `SMTP_PORT` - `587`
- `EMAIL_USER` - Your email address
- `EMAIL_PASSWORD` - Your email password

#### Optional (if using Gmail OAuth):
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_ACCESS_TOKEN`

### 4. Update CORS Settings

After deployment, you'll get a Render URL like `https://lms-backend.onrender.com`. 

Update the CORS configuration in `server.js` to include your Render URL:

```javascript
origin: [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://cognify.traincapetech.in",
  "https://www.cognify.traincapetech.in",
  "https://lms-backend.onrender.com", // Add your Render URL here
],
```

Then commit and push:
```bash
git add server.js
git commit -m "Add Render URL to CORS"
git push
```

### 5. Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Run `npm install`
   - Start your server with `npm start`
3. Wait for deployment to complete (usually 2-3 minutes)

### 6. Verify Deployment

1. Check the **Logs** tab in Render dashboard
2. You should see: `🚀 Server running on port 10000`
3. Test the API endpoint: `https://your-app-name.onrender.com/api/public/health` (if you have a health check route)

## Important Notes

### Free Tier Limitations:
- Services on the free tier spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Consider upgrading to paid plan for production

### Database:
- Make sure your MongoDB Atlas allows connections from Render's IP addresses
- In MongoDB Atlas, go to Network Access and add `0.0.0.0/0` (allow from anywhere) or Render's specific IPs

### Environment Variables:
- Never commit `.env` file to git
- All sensitive data should be in Render's Environment Variables section

### Updates:
- Every push to `main` branch will trigger automatic deployment
- You can also manually deploy from the Render dashboard

## Troubleshooting

### Service won't start:
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure MongoDB connection string is correct

### CORS errors:
- Make sure your frontend URL is in the CORS origin list
- Update `server.js` and redeploy

### Database connection issues:
- Verify MongoDB Atlas network access settings
- Check MONGO_URI format: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`

## Support

For issues, check:
- Render logs: Dashboard → Your Service → Logs
- MongoDB Atlas logs: Atlas Dashboard → Monitoring
- Application logs in server.js console outputs
