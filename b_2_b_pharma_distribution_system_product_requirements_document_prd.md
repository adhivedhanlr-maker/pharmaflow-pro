# Product Requirements Document (PRD)

## Product Name
**PharmaFlow Pro** (working name – can be changed)

## Version
PRD v1.0

## Prepared For
B2B Medical Store / Pharmaceutical Distributor

## Prepared By
Product & Engineering Team

---

## 1. Background & Context
The client is a B2B pharmaceutical distributor currently using a legacy desktop-based billing and inventory application. While functionally stable, the existing system suffers from outdated UI, lack of mobility, limited reporting, poor scalability, and integration constraints.

The client requires a **major functional and experiential upgrade** without disrupting existing billing workflows, staff productivity, or compliance requirements (GST, batch tracking, expiry management).

This PRD defines the requirements for a **modern, scalable, cloud-first distribution management system** with optional desktop capabilities and a mobile application for sales operations.

---

## 2. Problem Statement

### Current Challenges
- Outdated, cluttered desktop UI
- No mobile access for sales representatives
- No real-time stock visibility across users
- Limited reporting and analytics
- Difficult integrations (GST, accounting, BI)
- High dependency on trained staff
- Manual backups and higher data loss risk

### Business Impact
- Slower onboarding of new staff
- Missed sales opportunities
- Poor visibility into fast/slow-moving items
- Expiry-related losses
- Competitive disadvantage against tech-enabled distributors

---

## 3. Product Goals & Objectives

### Primary Goals
1. Modernize the system UI and UX while preserving billing speed
2. Enable real-time stock, order, and ledger visibility
3. Introduce mobile-based sales ordering
4. Improve reporting, analytics, and decision-making
5. Ensure regulatory compliance (GST, pharma batch rules)
6. Provide a scalable, future-proof architecture

### Success Metrics (KPIs)
- Billing time per invoice ≤ current system
- 100% stock accuracy across users
- ≥30% reduction in expiry losses
- ≥25% increase in sales order efficiency
- Zero data loss incidents

---

## 4. User Personas

### 1. Billing Operator
- Fast invoice generation
- Keyboard-driven workflow
- Printer and scanner compatibility

### 2. Warehouse Manager
- Batch-wise stock visibility
- Expiry alerts
- GRN and stock adjustment management

### 3. Sales Representative
- Mobile order booking
- Live stock availability
- Outstanding balance visibility

### 4. Accountant
- GST-compliant invoices
- Ledger and tax reports
- Accounting software integration

### 5. Admin / Owner
- Business dashboards
- Profitability reports
- User and permission control

---

## 5. In-Scope Features

### 5.1 Product & Inventory Management
- Product master (HSN, GST %, MRP, company)
- Batch & expiry tracking (mandatory)
- Stock movement ledger (purchase, sale, return, adjustment)
- Multi-warehouse support (optional)
- Reorder level alerts

### 5.2 Purchase Management
- Supplier master
- Purchase invoices (GRN)
- Purchase returns
- Supplier ledger

### 5.3 Sales & Billing
- Credit and cash invoices
- Batch auto-selection (FIFO / FEFO)
- Discounts (item-level & bill-level)
- GST calculation (CGST, SGST, IGST, cess)
- Rounding rules
- Thermal & A4 printer support
- Invoice PDF generation

### 5.4 Customer Management
- Customer master
- GST registered / unregistered handling
- Credit limits
- Outstanding balance tracking

### 5.5 Returns & Adjustments
- Sales return
- Damaged / expired stock handling
- Stock corrections with audit trail

### 5.6 Accounting & Finance
- Customer & supplier ledger
- GST reports (GSTR-1, GSTR-3B support)
- TCS/TDS handling (if applicable)
- Export to accounting software (Tally / Zoho)

### 5.7 Sales Mobile App
- Secure login
- Live stock view
- Order booking
- Order status tracking
- Outstanding amount view
- Offline mode with sync

### 5.8 Reports & Analytics
- Sales reports (daily, monthly, item-wise)
- Fast / slow-moving items
- Expiry risk report
- Salesman performance
- Profit margin analysis

### 5.9 Admin & Security
- Role-based access control
- Activity audit logs
- Data backup & recovery
- Multi-user concurrency handling

---

## 6. Out-of-Scope (Phase 1)
- Hospital EMR integration
- Patient-level data
- AI demand forecasting
- Third-party marketplace integrations

---

## 7. Non-Functional Requirements

### Performance
- Invoice creation < 2 seconds
- Concurrent users: 20–50 (scalable)

### Availability
- 99.5% uptime
- Daily automated backups

### Security
- HTTPS encryption
- Role-based permissions
- Audit logs for financial actions

### Compliance
- GST compliant
- Pharma batch & expiry compliance

---

## 8. Technical Architecture (High-Level)

- Frontend: Web-based (desktop-optimized)
- Mobile App: Android (Phase 1), iOS (Phase 2)
- Backend: Centralized API server
- Database: Relational (ACID-compliant)
- Optional Desktop Wrapper for billing counters

---

## 9. Data Migration Requirements
- Import customers, suppliers, products
- Import stock with batch & expiry
- Import outstanding balances
- Validation & reconciliation reports

---

## 10. Deployment Strategy

### Phase 1
- Core billing & inventory
- Parallel run with old system

### Phase 2
- Sales mobile app
- Advanced reports

### Phase 3
- Analytics dashboards
- Automation & alerts

---

## 11. Risks & Mitigation

| Risk | Mitigation |
|-----|-----------|
| Staff resistance | Familiar workflows, training |
| Billing slowdown | Keyboard shortcuts, performance testing |
| Data migration errors | Dry runs, validation reports |
| Internet dependency | Offline caching & fallback |

---

## 12. Approval & Sign-Off

| Role | Name | Signature |
|-----|------|-----------|
| Client Representative |  |  |
| Product Owner |  |  |
| Technical Lead |  |  |

---

*End of Document*

