# Design Document – UX & Simplicity Focused

## Product
B2B Pharma Distribution & Billing System

## Document Purpose
This design document defines **UI/UX principles, layouts, interaction patterns, and usability decisions** for the pharma distributor application. The primary objective is **ease of use, speed, and error reduction**, especially for billing staff and sales teams with varying technical skills.

This document complements the PRD and focuses on **how the product should feel and behave**, not just what it does.

---

## 1. Design Philosophy

### Core Principles
1. **Speed First** – Billing and order entry must be as fast or faster than the existing desktop system
2. **Familiar, Not Fancy** – Modern UI without overwhelming users
3. **Minimum Thinking** – Reduce cognitive load using defaults, automation, and smart suggestions
4. **Keyboard + Mouse Friendly** – Power users should work without touching the mouse
5. **Error Prevention > Error Correction** – Prevent mistakes before they happen

> *Good design for this app is invisible.*

---

## 2. Target User Skill Levels

| User Type | Tech Comfort | Design Approach |
|---------|-------------|----------------|
| Billing Operator | Low–Medium | Large inputs, keyboard shortcuts, clear totals |
| Warehouse Staff | Low | Step-based workflows, confirmations |
| Salesman (Mobile) | Medium | Minimal screens, big buttons |
| Accountant | Medium–High | Data dense but structured views |
| Owner | Medium | Visual dashboards, summaries |

---

## 3. Information Architecture (Simple & Flat)

### Primary Navigation (Max 6 Items)
- Dashboard
- Billing
- Purchases
- Stock
- Parties (Customers & Suppliers)
- Reports

> Avoid deep menus. Most tasks should be reachable in **2 clicks or less**.

---

## 4. Desktop/Web App UI Design

### 4.1 Billing Screen (Most Critical Screen)

#### Design Goals
- One-screen billing
- Zero modal popups during entry
- Always-visible totals

#### Layout Structure
- **Top Bar**: Customer, Invoice Type, Date
- **Center Grid**: Items table (like Excel)
- **Right Panel**: Live bill summary
- **Bottom Bar**: Actions & shortcuts

#### Key Usability Features
- Product search with fuzzy match
- Auto batch & expiry selection (FEFO)
- Inline editable cells (no dialogs)
- Color indicators for near-expiry items
- Enter-to-save workflow

---

### 4.2 Keyboard-First Design

| Action | Shortcut |
|------|----------|
| New invoice | F1 |
| Search product | F2 |
| Save bill | Ctrl + S |
| Cancel | Esc |
| Print | Ctrl + P |

Shortcuts must be **visible as hints**, not hidden knowledge.

---

### 4.3 Visual Design Rules

- Neutral background (light grey / off-white)
- High contrast text
- Numbers aligned right
- Important values highlighted (Net Amount)
- Consistent spacing and alignment

> Avoid gradients, shadows, and animations in core screens.

---

## 5. Mobile App Design (Sales-Focused)

### Design Philosophy for Mobile
- One task per screen
- Thumb-friendly controls
- Offline-first mindset

### Key Screens
1. Login
2. Customer List
3. Create Order
4. Order Summary
5. Outstanding & Ledger

### Mobile UX Rules
- No tables wider than screen
- Use cards instead of grids
- Step-based order creation
- Clear sync status indicators

---

## 6. Forms & Data Entry Guidelines

- Mandatory fields marked clearly
- Default values wherever possible
- Auto-calculation (never manual)
- Inline validation (no popups)
- Clear error messages in simple language

❌ Bad: "Invalid Input"

✅ Good: "Quantity cannot exceed available stock"

---

## 7. Reducing User Errors (Critical)

- Disable invalid actions instead of warning later
- Confirm destructive actions (delete, cancel)
- Soft warnings for risky actions (low stock, near expiry)
- Read-only views for finalized invoices

---

## 8. Accessibility & Readability

- Minimum font size: 14px
- Scalable UI for large screens
- Colorblind-safe color usage
- Icons always paired with text

---

## 9. Performance UX

- Loading time < 1 sec for common actions
- Skeleton loaders instead of spinners
- Optimistic UI updates for billing

---

## 10. Consistency Rules

- Same layout patterns across modules
- Same shortcut keys everywhere
- Same terminology across screens

Example:
- Use "Customer" everywhere (not Party / Client mixed)

---

## 11. Onboarding & Training Design

- Inline tooltips for first-time users
- Printable shortcut cheat-sheet
- Demo data mode for training

---

## 12. Design Anti-Patterns to Avoid

- Too many popups
- Overuse of colors
- Fancy animations
- Deep nested menus
- Mobile-style UI on desktop

---

## 13. Design Success Metrics

- New user billing time ≤ 30 minutes training
- Invoice entry time equal or faster than old system
- Reduction in billing errors
- Positive staff feedback within first week

---

## 14. Future UX Enhancements (Optional)

- Voice-assisted search
- AI-based reorder suggestions
- Personalized dashboards

---

*End of Design Document*

