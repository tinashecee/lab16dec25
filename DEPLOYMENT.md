# Deployment Guide

## ✅ Production Build Complete

Your production build is ready in the `dist/` folder.

## Next Steps

### 1. Test Production Build Locally

```bash
# Preview the production build
npm run preview

# Or test with your Express server
NODE_ENV=production node server/index.js
```

### 2. Environment Variables

Make sure you have these environment variables set in production:

```bash
NODE_ENV=production
PORT=3001  # or your preferred port
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your/service-account-key.json
```

### 3. Deploy Options

#### Option A: Deploy with Express Server (Recommended)

Your Express server is now configured to serve the static files:

1. **Upload your files to your server:**
   - Upload the entire project folder
   - Or upload `dist/` folder and `server/` folder separately

2. **On your server, install dependencies:**
   ```bash
   npm install --production
   ```

3. **Set environment variables:**
   ```bash
   export NODE_ENV=production
   export PORT=3001
   ```

4. **Start the server:**
   ```bash
   node server/index.js
   ```

5. **Use PM2 for process management (recommended):**
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name labpartners-app
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start
   ```

#### Option B: Deploy Static Files Only

If you want to use a different static hosting service (like Nginx, Apache, or cloud services):

1. **Upload only the `dist/` folder** to your hosting service
2. Configure your web server to:
   - Serve files from the `dist/` directory
   - Handle client-side routing (all routes should serve `index.html`)
   - Set proper CORS headers if needed

**Nginx Configuration Example:**
```nginx
server {
    listen 80;
    server_name app.labpartners.co.zw;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Option C: Cloud Hosting Services

- **Vercel**: Connect your Git repo, it will auto-detect Vite
- **Netlify**: Drag and drop the `dist` folder or connect Git
- **Firebase Hosting**: `firebase deploy --only hosting`
- **AWS S3 + CloudFront**: Upload `dist` to S3 bucket

### 4. SSL/HTTPS Setup

Since your domain is `app.labpartners.co.zw`, ensure SSL is configured:

```bash
# Using Let's Encrypt (Certbot)
sudo certbot --nginx -d app.labpartners.co.zw
```

### 5. Firewall Configuration

Make sure your server allows:
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 3001 (if Express server is separate)

### 6. Post-Deployment Checklist

- [ ] Test all routes work correctly
- [ ] Verify API endpoints are accessible
- [ ] Check Firebase connection
- [ ] Test authentication flow
- [ ] Verify environment variables are set
- [ ] Check server logs for errors
- [ ] Test on mobile devices
- [ ] Verify CORS is working correctly

### 7. Monitoring

Set up monitoring for:
- Server uptime (PM2, systemd, or cloud monitoring)
- Error logging (consider Sentry or similar)
- Performance monitoring

## Troubleshooting

### Build files not loading?
- Check that `dist/` folder is in the correct location
- Verify file permissions: `chmod -R 755 dist/`

### API routes not working?
- Ensure Express server is running
- Check CORS configuration
- Verify API routes are before the catch-all route

### Client-side routing not working?
- Ensure all routes serve `index.html` (catch-all route)
- Check web server configuration

## Quick Start Commands

```bash
# Build for production
npm run build

# Test production build locally
npm run preview

# Start production server
NODE_ENV=production node server/index.js

# Start with PM2
NODE_ENV=production pm2 start server/index.js --name labpartners-app
```

