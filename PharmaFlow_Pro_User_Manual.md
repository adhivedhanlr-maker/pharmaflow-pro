# PharmaFlow Pro - Complete User Manual

## 📘 Enterprise Pharmaceutical Distribution Management System

**Version:** 1.0  
**Last Updated:** January 30, 2026

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Admin Guide](#admin-guide)
5. [Billing Operator Guide](#billing-operator-guide)
6. [Warehouse Manager Guide](#warehouse-manager-guide)
7. [Accountant Guide](#accountant-guide)
8. [Sales Representative Guide](#sales-representative-guide)
9. [Advanced Features](#advanced-features)
10. [Best Practices](#best-practices)

---

## System Overview

### What is PharmaFlow Pro?

PharmaFlow Pro is a comprehensive, enterprise-grade pharmaceutical distribution management system designed specifically for B2B pharmaceutical wholesalers and distributors. It provides end-to-end management of your pharmaceutical supply chain, from purchase to sales, with complete regulatory compliance and audit trails.

### Key Capabilities

**Inventory Management**
- Real-time batch-wise stock tracking
- Expiry date monitoring with automated alerts
- Low stock warnings
- Multi-location support ready
- FIFO/FEFO inventory methods

**Financial Management**
- GST-compliant invoicing (12% GST)
- Credit/Cash sales tracking
- Customer/Supplier balance management
- Automated accounting entries
- Comprehensive financial reports

**Regulatory Compliance**
- GSTIN validation
- Batch number tracking
- Expiry date management
- Complete audit trails
- Drug license compliance ready

**Business Intelligence**
- Real-time dashboard analytics
- Sales performance tracking
- Inventory valuation
- Profit margin analysis
- Customer/Supplier insights

---

## Getting Started

### System Requirements

**Supported Browsers:**
- Google Chrome (Recommended)
- Microsoft Edge
- Mozilla Firefox
- Safari

**Internet Connection:** Required for cloud-based access

### First-Time Login

1. **Access the System**
   - Navigate to your PharmaFlow Pro URL
   - You'll see the login screen

2. **Enter Credentials**
   - Username: Provided by your administrator
   - Password: Initial password (you'll be prompted to change)

3. **Two-Factor Authentication (Optional)**
   - For enhanced security, enable 2FA in Settings
   - Scan QR code with Google Authenticator or similar app
   - Enter 6-digit code on each login

4. **Dashboard Access**
   - Upon successful login, you'll see your personalized dashboard
   - Navigation menu on the left shows available modules based on your role

---

## User Roles & Permissions

PharmaFlow Pro implements role-based access control (RBAC) to ensure data security and operational efficiency.

### Role Matrix

| Feature | Admin | Billing Operator | Warehouse Manager | Accountant | Sales Rep |
|---------|-------|------------------|-------------------|------------|-----------|
| **Dashboard** | ✅ Full | ✅ Sales View | ✅ Stock View | ✅ Financial View | ✅ Sales View |
| **Billing/Sales** | ✅ | ✅ | ❌ | ✅ View | ✅ |
| **Purchases** | ✅ | ❌ | ✅ | ✅ View | ❌ |
| **Stock Management** | ✅ | ✅ View | ✅ | ❌ | ❌ |
| **Parties (Customers)** | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Parties (Suppliers)** | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Returns** | ✅ | ✅ Sales | ✅ Purchase | ✅ View | ❌ |
| **Reports** | ✅ All | ✅ Sales | ✅ Stock | ✅ All | ✅ Sales |
| **User Management** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Settings** | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Admin Guide

### Overview
As an **Administrator**, you have complete access to all system features. You are responsible for system configuration, user management, and overall operational oversight.

### 1. User Management

**Creating New Users**

1. Navigate to **Users** from the sidebar
2. Click **"Add User"** button
3. Fill in user details:
   - Full Name
   - Username (unique identifier)
   - Password (minimum 8 characters, must include uppercase, lowercase, number, special character)
   - Role selection
4. Click **"Create User"**

**Best Practices:**
- Use descriptive usernames (e.g., `john.billing`, `sarah.warehouse`)
- Assign minimal necessary permissions
- Regularly review user access
- Disable accounts for departed employees immediately

**Editing Users**

1. Find user in the list
2. Click the **3-dot menu** → **Edit**
3. Modify details as needed
4. Save changes

**Deleting Users**

1. Click **3-dot menu** → **Delete**
2. Confirm deletion
3. User's historical data remains for audit purposes

---

### 2. Business Profile Configuration

**Setting Up Your Company Profile**

1. Go to **Settings** → **Business Profile**
2. Configure:
   - **Company Name:** Your legal business name
   - **GSTIN:** Your GST registration number
   - **Address:** Complete business address
   - **Phone/Email:** Contact information
   - **Logo:** Upload company logo (recommended: 200x200px PNG)

3. Click **"Save Changes"**

**Why This Matters:**
- Appears on all invoices and reports
- Required for GST compliance
- Professional branding

---

### 3. Inventory Setup

**Adding Products**

1. Navigate to **Inventory**
2. Click **"Add Product"**
3. Enter:
   - Product Name (e.g., "Paracetamol 500mg")
   - HSN Code (for GST)
   - Category (optional)
   - Manufacturer
   - Description

4. Save product

**Product Best Practices:**
- Use consistent naming conventions
- Include strength/dosage in name
- Add manufacturer for easy identification
- Keep HSN codes accurate for GST filing

---

### 4. Managing Parties

**Adding Customers**

1. Go to **Parties** → **Customers** tab
2. Click **"Add Customer"**
3. Fill in:
   - Customer Name
   - GSTIN (if registered)
   - Phone Number
   - Address
   - Credit Limit (optional)

**Adding Suppliers**

1. Go to **Parties** → **Suppliers** tab
2. Click **"Add Supplier"**
3. Enter supplier details

**Editing Parties**

1. Click **3-dot menu** on any party
2. Select **Edit**
3. Modify details
4. Save changes

**Deleting Parties**

- Only parties with **no transaction history** can be deleted
- This prevents data integrity issues
- If deletion fails, the party has existing transactions

---

### 5. System Monitoring

**Dashboard Metrics**

Monitor key performance indicators:
- **Total Sales:** Today/This Month/This Year
- **Stock Value:** Current inventory valuation
- **Pending Receivables:** Customer outstanding balances
- **Low Stock Alerts:** Products below reorder level
- **Expiry Alerts:** Products expiring soon

**Audit Logs**

- View all system activities
- Track user actions
- Identify security issues
- Compliance reporting

---

### 6. Security Features

**Two-Factor Authentication**

1. Go to **Settings** → **Security**
2. Click **"Enable 2FA"**
3. Scan QR code with authenticator app
4. Enter verification code
5. Save backup codes securely

**Session Management**

- Auto-logout after 30 minutes of inactivity
- Manual logout available
- Session timeout configurable

---

## Billing Operator Guide

### Overview
As a **Billing Operator**, you are responsible for creating sales invoices, managing customer interactions, and processing sales returns.

### 1. Creating Sales Invoices

**Step-by-Step Process**

1. **Navigate to Billing**
   - Click **Billing** in sidebar
   - You'll see the invoice creation screen

2. **Select Customer**
   - Click customer dropdown
   - Search by name or GSTIN
   - **New Customer?** Click **"Add Customer"** to create on-the-fly

3. **Add Products**
   - Click **"Add Item"** or press **F2**
   - Search for product
   - Select batch (system shows available stock)
   - Enter quantity
   - Add free quantity if applicable (e.g., "Buy 10 Get 1 Free")
   - Repeat for all items

4. **Review Invoice**
   - Check quantities and prices
   - Verify GST calculations (12%)
   - Review total amount

5. **Payment Method**
   - Toggle **Cash/Credit** switch
   - **Cash:** Full payment received
   - **Credit:** Adds to customer's outstanding balance

6. **Save Invoice**
   - Click **"Save Invoice"**
   - System automatically:
     - Deducts stock
     - Updates customer balance (if credit)
     - Generates invoice number
     - Creates audit trail

7. **Print Invoice**
   - Click **"Print"** button
   - Invoice opens in print dialog
   - Print or save as PDF

---

### 2. Customer Management

**Quick Customer Creation**

During billing, if customer doesn't exist:
1. Click **"Add Customer"** in dropdown
2. Enter minimal details (Name, Phone)
3. Complete full profile later in Parties module

**Viewing Customer Balance**

- Customer dropdown shows current balance
- Red indicates outstanding amount
- Green indicates advance/credit balance

---

### 3. Processing Sales Returns (Credit Notes)

**When to Use:**
- Customer returns defective products
- Wrong product delivered
- Expired products
- Customer dissatisfaction

**Process:**

1. **Navigate to Returns**
   - Click **Returns** in sidebar
   - Select **Sales Returns** tab

2. **Find Original Invoice**
   - Enter invoice number in search
   - Click **"Find Transaction"**

3. **Select Items to Return**
   - System displays all items from invoice
   - Enter return quantity for each item
   - **Cannot exceed sold quantity**
   - Provide reason for return (mandatory)

4. **Process Credit Note**
   - Review return amount
   - Click **"Process Credit Note"**
   - System automatically:
     - Restores stock
     - Reduces customer balance
     - Creates credit note record

---

### 4. Keyboard Shortcuts

**Efficiency Tips:**

- **F2:** Add new item to invoice
- **Enter:** Move to next field
- **Tab:** Navigate between fields
- **Ctrl + S:** Save invoice (when focused)

---

### 5. Daily Workflow

**Morning Routine:**
1. Check dashboard for pending orders
2. Review low stock alerts
3. Verify customer credit limits

**During Day:**
1. Process sales invoices
2. Handle customer queries
3. Process returns if needed

**End of Day:**
1. Review day's sales in Reports
2. Verify all invoices saved
3. Check for any errors

---

## Warehouse Manager Guide

### Overview
As a **Warehouse Manager**, you oversee inventory, process purchase orders, handle stock adjustments, and manage supplier relationships.

### 1. Processing Purchases (GRN - Goods Receipt Note)

**Complete Purchase Entry Process**

1. **Navigate to Purchases**
   - Click **Purchases** in sidebar

2. **Enter Bill Details**
   - **Supplier:** Select from dropdown or add new
   - **Bill/Invoice Number:** Supplier's invoice number
   - **Date:** Auto-filled (today)

3. **Add Purchase Items**
   - Click **"Add Item"**
   - For each product:
     - **Product:** Select from dropdown
     - **Batch Number:** Enter from supplier invoice
     - **Expiry Date:** Critical! Enter accurate expiry
     - **Quantity:** Units received
     - **Purchase Price:** Cost per unit (excluding GST)
     - **Sale Price:** Your selling price (excluding GST)

4. **Review Summary**
   - Check gross amount
   - Verify tax calculation (12% GST)
   - Confirm net total

5. **Save Purchase**
   - Click **"Save Purchase"**
   - System automatically:
     - Creates new batches in inventory
     - Updates stock levels
     - Updates supplier balance
     - Records transaction

**Important Notes:**
- ✅ Always verify batch numbers match supplier invoice
- ✅ Double-check expiry dates
- ✅ Ensure sale price > purchase price for profitability
- ⚠️ Cannot modify purchase after saving (create return instead)

---

### 2. Stock Management

**Viewing Current Stock**

1. Go to **Stock** module
2. View all batches with:
   - Product name
   - Batch number
   - Expiry date
   - Current quantity
   - Sale price
   - Stock value
   - Status (OK/Low Stock/Expiring Soon/Expired)

**Manual Stock Adjustment**

When physical stock doesn't match system:

1. Find the batch in Stock list
2. Click **Edit** icon
3. Enter:
   - **New Quantity:** Actual physical count
   - **Reason:** Mandatory (e.g., "Damaged goods", "Inventory correction", "Theft")
4. Click **"Update Stock"**

**Common Adjustment Reasons:**
- Damaged/broken products
- Expired products disposal
- Theft/loss
- Inventory count corrections
- Sampling/testing

---

### 3. Supplier Management

**Adding New Suppliers**

1. **Parties** → **Suppliers** tab
2. Click **"Add Supplier"**
3. Enter:
   - Supplier name
   - GSTIN
   - Contact details
   - Address
   - Payment terms (optional notes)

**Editing Supplier Details**

1. Find supplier in list
2. Click **3-dot menu** → **Edit**
3. Update information
4. Save changes

---

### 4. Processing Purchase Returns (Debit Notes)

**When to Use:**
- Received defective products
- Wrong products delivered
- Expired products received
- Quality issues

**Process:**

1. **Navigate to Returns**
   - Click **Returns** → **Purchase Returns** tab

2. **Find Original Purchase**
   - Enter bill number
   - Click **"Find Transaction"**

3. **Select Items to Return**
   - Enter return quantity
   - Provide reason (mandatory)
   - Review return amount

4. **Process Debit Note**
   - Click **"Process Debit Note"**
   - System automatically:
     - Reduces stock
     - Reduces supplier payable
     - Creates debit note record

---

### 5. Inventory Monitoring

**Daily Checks:**

1. **Low Stock Alerts**
   - Check dashboard for products below reorder level
   - Plan purchase orders

2. **Expiry Alerts**
   - Review products expiring in next 30/60/90 days
   - Plan promotions or returns

3. **Stock Valuation**
   - Monitor total inventory value
   - Identify slow-moving items

**Monthly Tasks:**

1. **Physical Stock Verification**
   - Conduct physical count
   - Compare with system stock
   - Make adjustments with proper reasons

2. **Expiry Management**
   - Dispose expired products
   - Document disposal
   - Adjust stock

---

### 6. Best Practices

**Batch Management:**
- Always use supplier's batch number
- Never create duplicate batches
- Verify expiry dates carefully

**Stock Accuracy:**
- Regular physical counts
- Immediate adjustment entry
- Proper documentation

**Supplier Relations:**
- Maintain accurate contact info
- Track delivery performance
- Monitor quality issues

---

## Accountant Guide

### Overview
As an **Accountant**, you have read access to most modules and full access to financial reports. You monitor financial health, reconcile accounts, and ensure compliance.

### 1. Financial Dashboard

**Key Metrics to Monitor:**

- **Total Revenue:** Sales performance
- **Outstanding Receivables:** Customer dues
- **Payables:** Supplier dues
- **Inventory Value:** Stock investment
- **Profit Margins:** Business profitability

---

### 2. Reports & Analytics

**Available Reports:**

**Sales Reports**
1. Navigate to **Reports** → **Sales**
2. Select date range
3. View:
   - Daily/Monthly/Yearly sales
   - Customer-wise sales
   - Product-wise sales
   - Payment mode analysis (Cash vs Credit)

**Purchase Reports**
1. **Reports** → **Purchases**
2. Analyze:
   - Supplier-wise purchases
   - Product-wise purchases
   - Purchase trends

**Inventory Reports**
1. **Reports** → **Inventory**
2. Review:
   - Current stock value
   - Product-wise valuation
   - Slow-moving items
   - Fast-moving items

**Party Ledgers**
1. **Reports** → **Party Ledgers**
2. Select customer or supplier
3. View complete transaction history
4. Check outstanding balances

**GST Reports**
1. **Reports** → **GST**
2. Generate GST-compliant reports
3. Export for filing

---

### 3. Financial Reconciliation

**Customer Balance Verification**

1. Go to **Parties** → **Customers**
2. Review current balances
3. Cross-check with:
   - Sales invoices
   - Credit notes
   - Payment receipts

**Supplier Balance Verification**

1. **Parties** → **Suppliers**
2. Verify payables
3. Match with:
   - Purchase bills
   - Debit notes
   - Payments made

---

### 4. Month-End Procedures

**Checklist:**

1. ✅ Verify all invoices for the month
2. ✅ Check all returns processed
3. ✅ Reconcile customer balances
4. ✅ Reconcile supplier balances
5. ✅ Generate monthly reports
6. ✅ Review inventory valuation
7. ✅ Prepare GST returns
8. ✅ Archive important documents

---

### 5. Audit Trail Review

**Accessing Audit Logs:**

1. Navigate to **Settings** → **Audit Logs**
2. Filter by:
   - Date range
   - User
   - Action type
   - Module

**What to Look For:**
- Unusual transactions
- Stock adjustments
- User access patterns
- Data modifications

---

## Sales Representative Guide

### Overview
As a **Sales Representative**, you focus on customer acquisition, order processing, and customer relationship management.

### 1. Customer Management

**Adding New Customers**

1. **Parties** → **Customers**
2. Click **"Add Customer"**
3. Collect and enter:
   - Business name
   - GSTIN (if applicable)
   - Contact person
   - Phone/Email
   - Delivery address
   - Credit limit (if approved)

**Updating Customer Information**

1. Find customer in list
2. Click **3-dot menu** → **Edit**
3. Update details
4. Save changes

---

### 2. Creating Sales Orders

**Process:**

1. **Navigate to Billing**
2. Select your customer
3. Add products based on customer order
4. Review pricing and discounts
5. Choose payment method
6. Save invoice

**Tips:**
- Verify stock availability before confirming orders
- Check customer credit limit
- Offer free quantities for bulk orders
- Ensure competitive pricing

---

### 3. Customer Service

**Checking Order Status**

1. Go to **Reports** → **Sales**
2. Filter by customer
3. View all invoices
4. Share invoice details with customer

**Handling Returns**

1. Coordinate with Billing Operator
2. Provide customer details
3. Explain return policy
4. Follow up on credit note

---

### 4. Sales Performance Tracking

**Your Dashboard Shows:**
- Today's sales
- Monthly targets
- Customer acquisition
- Top-selling products

**Reports to Review:**
1. **Personal Sales Report**
   - Your sales performance
   - Customer-wise breakdown
   - Product preferences

2. **Customer Analysis**
   - Purchase frequency
   - Average order value
   - Payment patterns

---

## Advanced Features

### 1. Two-Factor Authentication (2FA)

**Why Use 2FA?**
- Enhanced security
- Protects sensitive data
- Prevents unauthorized access
- Industry best practice

**Setup Process:**

1. **Settings** → **Security** → **Enable 2FA**
2. Install authenticator app (Google Authenticator, Authy)
3. Scan QR code
4. Enter 6-digit verification code
5. Save backup codes (important!)

**Daily Use:**
- Enter username and password
- Open authenticator app
- Enter current 6-digit code
- Access granted

---

### 2. Batch-Wise Inventory Tracking

**Benefits:**
- Complete traceability
- Expiry management
- Recall capability
- Regulatory compliance

**How It Works:**
- Every purchase creates unique batch
- Each batch has:
  - Batch number
  - Expiry date
  - Purchase price
  - Sale price
  - Current stock

**During Sales:**
- System suggests batch (usually FEFO - First Expiry First Out)
- You can select different batch if needed
- Stock deducted from specific batch

---

### 3. Credit Management

**Setting Credit Limits:**

1. Edit customer
2. Set **Credit Limit** (e.g., ₹50,000)
3. Save

**How It Works:**
- System tracks customer balance
- Warns when approaching limit
- Can block sales if limit exceeded (configurable)

**Monitoring:**
- Dashboard shows total receivables
- Customer list shows individual balances
- Aging reports show overdue amounts

---

### 4. GST Compliance

**Automatic GST Calculation:**
- 12% GST applied on all transactions
- Separate display of base amount and GST
- GST-compliant invoice format

**GSTIN Validation:**
- System validates GSTIN format
- Ensures 15-character alphanumeric
- State code verification

**GST Reports:**
- GSTR-1 ready data
- Input tax credit tracking
- Tax liability calculation

---

### 5. Multi-User Collaboration

**Real-Time Updates:**
- Stock updates immediately visible to all users
- No conflicts or overwrites
- Concurrent user support

**Activity Tracking:**
- Who created what
- When actions occurred
- Modification history

---

## Best Practices

### Inventory Management

**✅ DO:**
- Verify batch numbers carefully
- Check expiry dates before purchase
- Conduct regular physical counts
- Rotate stock (FEFO method)
- Monitor slow-moving items

**❌ DON'T:**
- Create duplicate batches
- Ignore expiry alerts
- Skip stock adjustments
- Delay purchase entry

---

### Financial Management

**✅ DO:**
- Set appropriate credit limits
- Monitor receivables regularly
- Follow up on overdue payments
- Reconcile daily
- Generate regular reports

**❌ DON'T:**
- Ignore outstanding balances
- Skip month-end procedures
- Delay invoice generation
- Forget to process returns

---

### Security

**✅ DO:**
- Enable 2FA for all users
- Use strong passwords
- Log out when leaving desk
- Review audit logs
- Restrict user permissions

**❌ DON'T:**
- Share passwords
- Use public computers
- Leave system unattended
- Grant unnecessary permissions

---

### Data Entry

**✅ DO:**
- Double-check quantities
- Verify prices
- Use consistent naming
- Enter complete information
- Provide reasons for adjustments

**❌ DON'T:**
- Rush data entry
- Skip mandatory fields
- Use abbreviations inconsistently
- Forget to save

---

## Troubleshooting

### Common Issues

**Issue: Cannot Login**
- ✅ Check username spelling
- ✅ Verify password (case-sensitive)
- ✅ Check 2FA code if enabled
- ✅ Contact administrator

**Issue: Stock Not Updating**
- ✅ Refresh page
- ✅ Check if invoice saved successfully
- ✅ Verify batch selection
- ✅ Contact support

**Issue: Cannot Delete Customer/Supplier**
- ✅ This is by design
- ✅ Parties with transactions cannot be deleted
- ✅ Prevents data integrity issues
- ✅ Edit details instead

**Issue: Invoice Not Printing**
- ✅ Check browser pop-up blocker
- ✅ Allow pop-ups for this site
- ✅ Try different browser
- ✅ Save as PDF instead

---

## Support & Training

### Getting Help

**In-App Support:**
- Hover over ⓘ icons for tooltips
- Check field validations
- Review error messages

**Administrator:**
- Contact your system administrator
- Request additional training
- Report bugs or issues

**Documentation:**
- Refer to this manual
- Check role-specific sections
- Review best practices

---

## Appendix

### Glossary

**Batch:** A specific lot of product with unique batch number and expiry date

**Credit Note:** Document issued for sales returns, reduces customer balance

**Debit Note:** Document issued for purchase returns, reduces supplier payable

**FEFO:** First Expiry First Out - inventory method prioritizing near-expiry stock

**GRN:** Goods Receipt Note - document for recording purchases

**GSTIN:** Goods and Services Tax Identification Number

**HSN:** Harmonized System of Nomenclature - product classification code

**RBAC:** Role-Based Access Control - permission system

**2FA:** Two-Factor Authentication - enhanced security method

---

### Keyboard Shortcuts

| Shortcut | Action | Module |
|----------|--------|--------|
| F2 | Add Item | Billing |
| Ctrl + S | Save | All Forms |
| Esc | Close Dialog | All Dialogs |
| Enter | Submit/Next | All Forms |

---

### System Limits

- **Maximum Users:** Unlimited
- **Maximum Products:** Unlimited
- **Maximum Transactions:** Unlimited
- **Data Retention:** Permanent
- **Concurrent Users:** Unlimited
- **File Upload Size:** 5MB (logos)

---

## Conclusion

PharmaFlow Pro is designed to streamline your pharmaceutical distribution operations, ensure regulatory compliance, and provide actionable business insights. By following this manual and adhering to best practices, you'll maximize the system's potential and drive business growth.

**For additional support or feature requests, contact your system administrator.**

---

**Document Version:** 1.0  
**Last Updated:** January 30, 2026  
**© 2026 PharmaFlow Pro. All rights reserved.**
