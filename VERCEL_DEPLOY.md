# Vercel Deployment Configuration

## Project Settings (During Import):

### General
- **Framework Preset**: Other
- **Root Directory**: `backend`

### Build & Development Settings
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Development Command**: `npm run start:dev`

---

## Environment Variables (Add in Vercel Dashboard):

Click "Environment Variables" tab and add these:

### 1. DATABASE_URL
```
postgresql://neondb_owner:npg_myF6AEqLWR7a@ep-royal-brook-ahno23py-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 2. DIRECT_URL
```
postgresql://neondb_owner:npg_myF6AEqLWR7a@ep-royal-brook-ahno23py.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 3. JWT_SECRET
```
fixed-secret-key
```

### 4. NODE_ENV
```
production
```

---

## Important: Vercel Serverless Configuration

Vercel uses serverless functions by default. For NestJS, you need to create a `vercel.json` file.

I'll create this for you now...
