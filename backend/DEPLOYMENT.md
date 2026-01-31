# PharmaFlow Pro - Backend Deployment Guide

## Separate Backend Deployment on Render

The backend is now configured for **standalone deployment** on Render.

### Option 1: Deploy from Backend Directory (Recommended)

1. **Create a new Web Service on Render:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"

2. **Connect Repository:**
   - Select your GitHub repository
   - **Root Directory**: `backend`
   - **Branch**: `master` (or `main`)

3. **Configure Build Settings:**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Environment**: `Node`

4. **Add Environment Variables:**
   ```
   DATABASE_URL=<your-neon-database-url>
   DIRECT_URL=<your-neon-direct-url>
   JWT_SECRET=<your-secret-key>
   NODE_ENV=production
   PORT=10000
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically build and deploy

### Option 2: Deploy from Separate Backend Repository

If you prefer a completely separate repository:

1. **Create new repository** (e.g., `pharmaflow-backend`)

2. **Copy backend files:**
   ```bash
   # From medical software directory
   cd backend
   git init
   git add .
   git commit -m "Initial backend setup"
   git remote add origin https://github.com/yourusername/pharmaflow-backend.git
   git push -u origin master
   ```

3. **Deploy on Render:**
   - Connect the new repository
   - No need to specify root directory
   - Use the same build/start commands and environment variables

### Option 3: Use render.yaml (Blueprint)

The `backend/render.yaml` file is configured for standalone deployment:

1. **Push to GitHub:**
   ```bash
   cd backend
   git add render.yaml
   git commit -m "Add Render blueprint"
   git push
   ```

2. **Deploy via Blueprint:**
   - Go to Render Dashboard
   - Click "New +" → "Blueprint"
   - Select your repository
   - Choose `backend/render.yaml`
   - Configure environment variables
   - Deploy

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `DIRECT_URL` | Neon direct connection (for migrations) | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-super-secret-key-here` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `10000` |

## Post-Deployment

1. **Run Migrations:**
   - Render will run migrations automatically if configured
   - Or manually via Render Shell: `npx prisma migrate deploy`

2. **Seed Database (Optional):**
   ```bash
   npm run seed
   ```

3. **Test API:**
   ```bash
   curl https://your-backend-url.onrender.com/
   ```

## Troubleshooting

### Build Fails
- Check that all dependencies are in `dependencies` (not `devDependencies`)
- Verify `DATABASE_URL` is set correctly
- Check build logs for specific errors

### App Crashes on Start
- Verify `NODE_ENV=production` is set
- Check that `PORT` is set to `10000`
- Review startup logs for errors

### Database Connection Issues
- Ensure `DATABASE_URL` includes `?sslmode=require`
- Verify Neon database is accessible
- Check that migrations have run successfully

## Current Configuration

**Backend Location**: `c:\Users\LENOVO\Desktop\medical software\backend`

**Deployment File**: `backend/render.yaml`

**Build Command**: `npm install && npm run build`

**Start Command**: `npm run start:prod`

**Port**: `10000`
