# PharmaFlow Pro - Setup & Enhancement Guide

## 🚀 Quick Start

### Running the Application

**Backend:**
```bash
cd backend
npm install
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📊 Demo Data Seeding

To populate the database with 5 months of realistic demo data:

### Step 1: Navigate to Backend
```bash
cd backend
```

### Step 2: Run Seed Script
```bash
npm run seed
```

### What Gets Created:

- **50 Products** - Realistic pharmaceutical products (Paracetamol, Amoxicillin, etc.)
- **20 Customers** - B2B pharmacy customers with GSTIN
- **10 Suppliers** - Pharmaceutical distributors
- **120 Purchases** - 5 months of purchase history with batches
- **350 Sales** - 5 months of sales transactions
- **5 Returns** - Sample return transactions
- **5 Users** - One for each role

### Default User Accounts:

| Username | Password | Role |
|----------|----------|------|
| admin | Admin@123 | Admin |
| billing1 | Admin@123 | Billing Operator |
| warehouse1 | Admin@123 | Warehouse Manager |
| accountant1 | Admin@123 | Accountant |
| sales1 | Admin@123 | Sales Representative |

---

## ⌨️ Keyboard Shortcuts

PharmaFlow Pro is now fully keyboard-optimized for faster operations!

### Global Navigation (Alt + Key)

- **Alt + D** - Dashboard
- **Alt + B** - Billing
- **Alt + P** - Purchases
- **Alt + S** - Stock
- **Alt + C** - Parties (Customers)
- **Alt + R** - Returns
- **Alt + I** - Inventory
- **Alt + U** - Users
- **Alt + E** - Reports

### Quick Actions

- **F2** - Add Item (in Billing/Purchases)
- **F9** - Save Current Form
- **F12** - Print Invoice (in Billing)
- **/** - Focus Search
- **Esc** - Close Dialog/Cancel
- **Ctrl + /** - Show Keyboard Shortcuts Help

### Tips:
- Press **Ctrl + /** anywhere to see the full shortcuts dialog
- Look for the floating "Keyboard Shortcuts" button in the bottom-right corner
- All forms support **Tab** navigation and **Enter** to submit

---

## 📱 PWA (Progressive Web App) Installation

PharmaFlow Pro can be installed as a native app on mobile and desktop!

### Desktop Installation (Chrome/Edge)

1. Visit the app URL
2. Look for the install icon (⊕) in the address bar
3. Click "Install" or wait for the install prompt
4. App will be added to your applications

### Mobile Installation (Android/iOS)

**Android (Chrome):**
1. Open the app in Chrome
2. Tap the menu (⋮)
3. Select "Install app" or "Add to Home Screen"
4. App icon will appear on your home screen

**iOS (Safari):**
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"

### PWA Features:

- ✅ **Offline Support** - Basic functionality works offline
- ✅ **Fast Loading** - Cached resources load instantly
- ✅ **Native Feel** - Runs like a native app
- ✅ **Home Screen Icon** - Quick access from device
- ✅ **Full Screen** - No browser UI
- ✅ **App Shortcuts** - Quick access to Billing, Purchases, Stock

---

## 🎯 Feature Highlights

### 1. Demo Data Benefits

- **Realistic Testing** - Test all features with real-looking data
- **Client Demos** - Show 5 months of operational history
- **Training** - Practice with realistic scenarios
- **Performance Testing** - See how system handles actual data volume

### 2. Keyboard Navigation Benefits

- **80% Faster** - Navigate without touching mouse
- **Power User Mode** - Experts can fly through tasks
- **Accessibility** - Better for keyboard-only users
- **Efficiency** - Reduce repetitive mouse movements

### 3. PWA Installation Benefits

- **Faster Access** - Launch like a native app
- **Offline Capability** - Basic features work without internet
- **Mobile Friendly** - Install on phones/tablets
- **Desktop App** - No browser clutter
- **Auto Updates** - Always latest version

---

## 🔧 Technical Details

### Seed Script Location:
```
backend/prisma/seed.ts
```

### Keyboard Shortcuts Component:
```
frontend/src/components/keyboard-shortcuts.tsx
```

### PWA Files:
```
frontend/public/manifest.json
frontend/public/sw.js
frontend/src/components/pwa-install-prompt.tsx
```

---

## 📝 Notes

### Seed Script:
- ⚠️ **Clears existing data** - Comment out delete statements if you want to keep current data
- ✅ **Idempotent** - Can be run multiple times
- ✅ **Realistic** - Uses actual pharmaceutical product names
- ✅ **Balanced** - Proper mix of cash/credit sales
- ✅ **Time-distributed** - Data spread across 5 months

### Keyboard Shortcuts:
- Works globally across all pages
- Context-aware (F2 only works in Billing/Purchases)
- Non-intrusive (doesn't interfere with form inputs)
- Discoverable (floating hint button + help dialog)

### PWA:
- Requires HTTPS in production (works on localhost for development)
- Install prompt shows automatically (can be dismissed for 7 days)
- Service worker caches key routes for offline access
- Manifest includes app shortcuts for quick actions

---

## 🚀 Deployment Checklist

Before deploying to production:

1. ✅ Run seed script on staging database
2. ✅ Test keyboard shortcuts on all pages
3. ✅ Verify PWA installation on mobile and desktop
4. ✅ Ensure HTTPS is enabled (required for PWA)
5. ✅ Test offline functionality
6. ✅ Update manifest icons with your branding
7. ✅ Test install prompt on different browsers

---

## 🎓 Training Your Team

### For Keyboard Power Users:
1. Show them **Ctrl + /** to open shortcuts help
2. Practice **Alt + Letter** navigation
3. Demonstrate **F2** for adding items in billing
4. Teach **/** for quick search access

### For Mobile Users:
1. Guide through PWA installation
2. Show home screen icon
3. Demonstrate offline capabilities
4. Explain auto-update feature

---

## 📞 Support

For issues or questions:
- Check the User Manual (PharmaFlow_Pro_User_Manual.md)
- Review Quick Reference Guide (Quick_Reference_Guide.md)
- Contact system administrator

---

**Version:** 1.0 with Enhancements  
**Last Updated:** January 30, 2026
