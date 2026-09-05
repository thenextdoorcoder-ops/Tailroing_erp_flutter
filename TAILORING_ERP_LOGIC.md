# 🧵 Tailoring ERP — Complete Logic & Architecture Documentation

> **Project**: KTown Aari Works Tailoring ERP  
> **Stack**: Next.js 14 (Frontend) · Node.js / Express + Prisma (Backend) · PostgreSQL · Redis  
> **Extracted from**: `Prod ready TMS` → isolated into `Tailoring ERP` folder

---

## 📁 Project Structure

```
Tailoring ERP/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # PostgreSQL schema
│   └── src/
│       ├── server.ts              # Express app (tailoring-only routes)
│       ├── config/                # Env config
│       ├── lib/                   # Redis, Prisma client
│       ├── jobs/                  # Cron jobs
│       └── modules/
│           ├── auth/              # OTP + JWT auth
│           ├── shared/            # Middleware, PDF, notifications
│           ├── admin/             # Super-admin + Tailor-admin panels
│           └── tailoring/         # 🎯 CORE TAILORING MODULES
│               ├── attendance/
│               ├── category/
│               ├── course/
│               ├── customer/
│               ├── dashboard/
│               ├── enquiry/
│               ├── expense/
│               ├── inventory/
│               ├── measurement/
│               ├── order/
│               ├── product/
│               ├── push/
│               ├── reports/
│               ├── student/
│               └── workboard/
└── frontend/
    ├── app/
    │   ├── (auth)/                # Login, Admin-login, Setup-password
    │   ├── (admin)/               # Admin panel pages
    │   ├── (dashboard)/           # All ERP dashboard routes
    │   │   ├── attendance/
    │   │   ├── attenders/
    │   │   ├── courses/
    │   │   ├── customers/
    │   │   ├── dashboard/
    │   │   ├── enquiries/
    │   │   ├── expenses/
    │   │   ├── gallery/
    │   │   ├── orders/
    │   │   ├── payments/
    │   │   ├── products/
    │   │   ├── reports/
    │   │   ├── subscription/
    │   │   ├── users/
    │   │   └── workboard/
    │   ├── blouse-gallery/        # Public blouse catalog
    │   ├── print-barcode/         # Barcode printing
    │   └── settings/              # Shop settings
    ├── components/                # UI components (ecommerce excluded)
    ├── hooks/                     # Custom React hooks
    ├── lib/                       # API clients, utilities
    └── types/                     # TypeScript types
```

---

## 👥 Roles & Permissions

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Platform owner — manages all tailor-admin tenants |
| `TAILOR_ADMIN` | Shop owner — full access to their shop's ERP |
| `STAFF` | Shop employee — scoped access by StaffRole |

### Staff Roles

| StaffRole | Purpose |
|-----------|---------|
| `DESIGNER` | Manages design stage of orders |
| `CUTTING_MASTER` | Manages cutting stage |
| `TAILOR` | Manages stitching stage |
| `DELIVERY` | Manages delivery stage |
| `PACKAGE_OFFICE` | Package handling |
| `GENERAL` | General access |

### Tenant Isolation
- Every record scoped by `userId` (the `TAILOR_ADMIN`'s ID)
- Staff linked to owner via `ownerId → User @relation("OwnerStaff")`
- All queries filter by `userId` — strict single-tenant isolation

---

## 🔐 Authentication

### OTP-Based Login (Phone Number)
1. User submits phone → OTP generated, stored in `OTPVerification` table
2. OTP has `expiresAt` TTL and max 3 `attempts`
3. On success: JWT access token + refresh token issued as httpOnly cookies
4. Device sessions tracked in `DeviceSession` (unique `userId + deviceId` pair)

### JWT Flow
- **Access Token**: Short-lived, sent as httpOnly cookie
- **Refresh Token**: Long-lived, enables silent re-auth
- **Middleware**: `authenticateToken` validates JWT on every protected route

### Rate Limiting (Redis-backed)
- Global: 1000 requests / 15 min per IP
- Auth routes: 50 requests / 15 min per IP

### CSRF Protection
- Origin/Referer header validated on all POST/PUT/PATCH/DELETE requests
- Google OAuth callback is exempt

---

## 👤 Customer Management

### Data Model: `Customer`
```
id, name, mobile (unique per shop), whatsapp, alternativeMobile
countryCode, address, city, dob
profession, preferredStyle, specialOccasion
faceAdded (Boolean), email
userId (scoped to shop owner)
```

### Key Logic
- **Unique constraint**: `(userId, mobile)` — same phone can't register twice per shop
- **Soft delete**: `deletedAt` used instead of hard deletes
- **Linked entities**: orders, measurements, gallery images, reviews
- `faceAdded` flag — indicates customer face photo captured for fitting reference

### Customer Gallery (`CustomerGallery`)
- Images per customer: design references, try-on photos
- `isDesign: Boolean` — separates design inspiration from regular photos

### Customer Reviews (`Review`)
- Rating (1–5) + optional text feedback
- Linked to customer for shop quality analytics

---

## 📦 Order Management (Core Module)

### Order Lifecycle — `TailoringOrderStatus`

```
ORDER_CREATED
    ↓
DESIGNING_STARTED ──→ DESIGNING_COMPLETED
    ↓
CUTTING_STARTED ────→ CUTTING_COMPLETED
    ↓
STITCHING_STARTED ──→ STITCHING_COMPLETED
    ↓
READY_TO_DELIVER
    ↓
DELIVERED
    (CANCELLED possible at any stage)
```

### Order Model: `TailoringOrder`
```
orderId         — human-readable ID (unique per shop)
customerId, userId
deliveryOption  — EXPRESS | CUSTOM
orderDate, dueDate
status          — TailoringOrderStatus

── Financials ──────────────────────────
productTotal    — sum of OrderItems
addOnsTotal     — sum of OrderAddOns
itemTotal       — sum of OrderMaterials (raw material cost)
deliveryCharges
gstAmount
discount
grandTotal      — computed final amount
advancePaid     — upfront collected
balanceDue      — grandTotal - advancePaid

── Extras ──────────────────────────────
orderingFor     — "self" or family member name
voiceNoteUrl    — audio instructions file URL
sketchDataUrl   — canvas sketch URL (design drawing)
attenderId      — referral source (who brought customer)
```

### Order Line Items

#### Products (`OrderItem`)
- Links `TailoringOrder → Product`
- Fields: `quantity`, `rate`, `total`, `barcode`

#### Add-Ons (`OrderAddOn`)
- Extra services (embroidery, lace, mirror work, etc.)
- Links `TailoringOrder → AddOn`
- Fields: `quantity`, `price`, `total`

#### Materials (`OrderMaterial`)
- Raw material consumption per order
- Links `TailoringOrder → Item (inventory)`
- Fields: `quantity (Decimal)`, `price`, `total`
- Deducts from `Item.stockQuantity` on order confirmation

### Order Attachments (`OrderAttachment`)
- Multiple files per order (photos, PDFs)
- Fields: `fileUrl`, `fileType`, `fileName`, `fileSize`

### Voice Notes
- Staff record audio instructions for complex tailoring
- Audio file URL stored in `TailoringOrder.voiceNoteUrl`

### Sketch Canvas
- In-browser touch/mouse drawing tool (SketchCanvas component)
- Sketch saved to `TailoringOrder.sketchDataUrl` as base64/data-URL

### Barcode System
- `Product` and `OrderItem` both carry a `barcode` field
- `/print-barcode` route renders printable labels
- Barcode scanning used at delivery to confirm correct order

---

## 💰 Payment Management

### Payment Model
```
orderId, customerId, userId
amount: Decimal
paymentMethod: CASH | CARD | UPI | BANK_TRANSFER
paymentDate, notes
```

### Payment Logic
1. Order created with initial `advancePaid` amount
2. Each additional payment creates a `Payment` record
3. `balanceDue` = `grandTotal` - total of all Payment records for the order
4. Full payment history preserved for audit

### Delivery Options
- `EXPRESS` — pre-defined fast track with fixed pricing rules
- `CUSTOM` — staff chooses date and custom delivery charges

---

## 📏 Measurement Management

### Measurement Types
| Type | Garment |
|------|---------|
| `CHUDI` | Churidar / Salwar suit |
| `BLOUSE` | Blouse |
| `LADIES_PANT` | Ladies trousers |
| `KIDS` | Kids garments |
| `GENTS_SHIRT` | Men's shirt |
| `GENTS_PANT` | Men's trousers |

### Measurement Model
```
customerId
orderId (optional — can be standalone customer measurement)
type: MeasurementType
data: Json         — all measurement fields stored as flexible JSON
categoryId, subCategoryId
notes
```

### Measurement JSON Fields (by type)

**BLOUSE**: length, shoulder, chest, waist, hip, sleeve length,
sleeve width, neck type, neck depth, fit style

**CHUDI**: top length, bottom length, chest, waist, hip,
sleeve length, sleeve width, neck measurements

**GENTS_SHIRT**: length, shoulder, chest, sleeve length, collar size

**GENTS_PANT**: waist, hip, thigh, knee, ankle, length,
pantModel (FIT_SLIM | STRAIGHT_PANT),
pleatModel (COMFORT | FORMAL)

### Fit Styles (FitStyle enum)
- `A_SIZE` — Loose/comfort fit
- `B_TYPE` — Regular fit
- `C_TYPE` — Slim/tight fit

---

## 🗂️ Product & Category Management

### Category Hierarchy
```
Category  (e.g., "Blouse", "Chudi", "Gents Shirt")
  └── SubCategory  (e.g., "Silk Blouse", "Cotton Chudi")
       └── Product  (e.g., "Basic Blouse Stitching — ₹400")
```

### Category Model
```
name, measurementType (links to MeasurementType enum)
description
userId (owner-scoped)
→ subCategories[], products[], addOns[], items[]
```

### Product Model
```
name, categoryId, subCategoryId
sellingPrice: Decimal
description, barcode
userId (owner-scoped)
```

### Add-On Model
```
name, categoryId
price: Decimal
description
Examples: Button work, Mirror work, Embroidery, Patchwork, Lace
```

---

## 📦 Inventory Management

### Unit Model
```
name (e.g., "Meter", "Gram", "Piece")
symbol (e.g., "m", "g", "pc")
```

### Item (Raw Material) Model
```
itemId      — human-readable (unique per shop)
name
categoryId, subCategoryId
unitId
stockQuantity: Decimal
purchasePrice, sellingPrice: Decimal
lastRestockDate
userId (owner-scoped)
→ orderMaterials[]  (tracks usage in orders)
→ itemGallery[]     (material photos)
```

### Inventory Logic
- Items = raw materials (fabric, thread, buttons, lining)
- `stockQuantity` decreases when linked via `OrderMaterial`
- Reports show usage per item per period for reorder planning

---

## 🏗️ Workboard (Production Pipeline)

### WorkAssignment Model
```
orderId
userId (assigned staff member)
stage: TailoringOrderStatus
assignedAt, completedAt
notes
```

### Workflow Logic
1. Order status advances (e.g., `CUTTING_STARTED`) → WorkAssignment created
2. Specific staff member assigned to that stage
3. Staff marks stage complete → `completedAt` set, order moves to next status
4. Dashboard shows each staff member's pending work queue

### Workboard View
- Kanban-style board showing orders grouped by status stage
- Staff see only their assigned orders (filtered by `StaffRole`)
- Admin sees full pipeline across all staff

---

## 📅 Attendance Management

### Attendance Model
```
userId (staff member)
date: Date         — one record per user per day (unique constraint)
status: PRESENT | ABSENT | HALF_DAY | LEAVE
checkInTime, checkOutTime
notes
```

### Logic
- `@@unique([userId, date])` — enforces one record per staff per day
- Check-in / check-out timestamps tracked
- Monthly attendance summary exported for payroll calculation

---

## 💸 Expense Management

### Expense Model
```
name, category (free-text string), description
amount: Decimal
expenseDate
userId (shop owner)
staffId (optional — links expense to a specific staff member)
```

### Common Categories
Rent, Electricity, Staff Salary, Supplies, Machine Maintenance, Miscellaneous

### Logic
- Owner tracks all shop running costs
- Can assign expense to a staff member (e.g., advance salary, bonus)
- Expense reports by date range and category

---

## 🎓 Course & Student Management

### Course Model
```
name, description
durationDays: Int
fees: Decimal
isActive: Boolean
userId (owner-scoped)
```

### Student Model
```
studentId    — human-readable ID (unique per shop)
name, mobile, whatsapp, address, city
photoUrl
courseId, courseDuration
totalFees, advancePaid, balanceAmount
joiningDate, endDate
status: ACTIVE | COMPLETED | DROPPED
userId (owner-scoped)
```

### Student Payment Model
```
studentId, userId
amount: Decimal
paymentMethod: CASH | CARD | UPI | BANK_TRANSFER
paymentDate, notes
```

### Business Logic
1. Student enrolled into a `Course`
2. Course fees collected in installments via `StudentPayment`
3. Each payment reduces `balanceAmount` on Student record
4. Status: ACTIVE → COMPLETED on end date, DROPPED if they leave early
5. Revenue from courses tracked separately from tailoring orders

---

## 📊 Dashboard & Reports

### Dashboard Metrics (Real-Time)
- Total orders today / this week / this month
- Revenue collected vs. balance due
- Orders by status (pipeline count per stage)
- Recent orders list
- Top customers by order count
- Overdue orders (dueDate < today, not DELIVERED)
- Staff attendance today
- Low-stock inventory alerts

### Report Types
| Report | Filters |
|--------|---------|
| Order Report | Date range, status, customer |
| Payment Report | Date range, payment method |
| Expense Report | Date range, category |
| Customer Report | New customers, repeat orders |
| Staff Report | Attendance, work assignments |
| Inventory Report | Stock levels, usage |
| Course/Student Report | Enrollments, fees collected |

---

## 📣 Enquiry Management

### Enquiry Model
```
userId (shop owner)
name, phone, countryCode
notes, dueDate
status: OPEN | CLOSED
```

### Logic
- Captures walk-in or phone enquiries before order is created
- Staff follow up and convert enquiry → order
- Status moves to `CLOSED` once converted or not interested

---

## 🔔 Push Notifications

### PushSubscription Model
```
userId   — who subscribed (STAFF or ADMIN)
ownerId  — shop owner (for broadcast notifications)
endpoint, p256dh, auth — Web Push API fields
```

### Notification Triggers
- New order created → notify relevant staff
- Order status changed → notify assigned staff
- Due date approaching → alert staff/admin
- Low stock item → notify admin
- New enquiry received → notify admin

---

## 👥 Attender (Referral) Tracking

### Attender Model
```
name, userId (shop owner)
isActive: Boolean
→ orders[] (orders attributed to this attender)
```

### Logic
- "Attender" = person who referred or brought the customer
- Order count per attender tracked for commission/performance
- Useful for understanding referral channels (staff, existing customers, agents)

---

## 🖼️ Gallery Management

### Shop Gallery (`ShopGallery`)
- Shop's public portfolio images
- `isDesign` flag separates design work from general images

### Customer Gallery (`CustomerGallery`)
- Per-customer photo archive (past orders, fittings)

### Item Gallery (`ItemGallery`)
- Photos of raw materials / fabric swatches

### Blouse Gallery (`BlouseGalleryGroup` + `BlouseGalleryImage`)
```
BlouseGalleryGroup: price (INR), label (optional), sortOrder
  └── BlouseGalleryImage: imageUrl, sortOrder
```
- Public blouse catalog grouped by price tier
- Accessible at `/blouse-gallery` — no authentication required

---

## 🧾 PDF Generation

Server-side PDF rendering for:
- **Order Invoice** — customer billing receipt with order details
- **Measurement Card** — customer measurement record printout
- **Barcode Labels** — printable labels for order identification

Endpoint: `POST /api/pdf/...`

---

## 🔧 Admin Panel

### Super Admin
- Creates and manages all TAILOR_ADMIN shop accounts
- Platform-level settings via `PlatformConfig` key-value store
- `LandingBanner` management for platform homepage

### Tailor Admin Panel
- Shop branding: `shopName`, `logoUrl`, `brandLogoUrl`, `appIconUrl`
- Invoice customization: `invoiceSettings: Json` (letterhead, GST number, etc.)
- Staff management: add/remove staff, assign `StaffRole`
- `signatureUrl` for signed invoices/documents

---

## 🗄️ Database Models — Quick Reference

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| `User` | role, staffRole, ownerId | Auth + multi-tenant staff |
| `OTPVerification` | phoneNumber, otp, expiresAt | Phone auth |
| `DeviceSession` | userId, deviceId | Active sessions |
| `Customer` | name, mobile, userId | Customer CRM |
| `Category` | name, measurementType | Product taxonomy L1 |
| `SubCategory` | name, categoryId | Product taxonomy L2 |
| `Product` | name, sellingPrice, barcode | Service catalog |
| `AddOn` | name, price, categoryId | Extra services |
| `Unit` | name, symbol | Inventory units of measure |
| `Item` | stockQuantity, purchasePrice | Raw material inventory |
| `TailoringOrder` | status, grandTotal, balanceDue | Core order |
| `OrderItem` | productId, quantity, rate | Order service line |
| `OrderAddOn` | addOnId, quantity, price | Extra service per order |
| `OrderMaterial` | itemId, quantity | Raw material per order |
| `OrderAttachment` | fileUrl, fileType | Files attached to order |
| `Payment` | amount, paymentMethod | Payments collected |
| `Measurement` | type, data (JSON) | Customer body measurements |
| `WorkAssignment` | stage, userId | Staff task assignment |
| `Attendance` | date, status, checkIn/Out | Staff attendance |
| `Expense` | category, amount | Shop running costs |
| `Course` | name, fees, durationDays | Tailoring course catalog |
| `Student` | name, courseId, fees | Course enrollment |
| `StudentPayment` | amount, method | Course fee installments |
| `Enquiry` | name, phone, status | Lead management |
| `Attender` | name | Referral source tracking |
| `CustomerGallery` | imagePath, isDesign | Customer photo archive |
| `ShopGallery` | imagePath, isDesign | Shop portfolio |
| `ItemGallery` | imagePath | Material photos |
| `BlouseGalleryGroup` | price, label | Blouse catalog group |
| `BlouseGalleryImage` | imageUrl | Blouse catalog image |
| `Review` | rating, feedback | Customer satisfaction |
| `PushSubscription` | endpoint, userId | Web push tokens |
| `AuditLog` | action, entity, changes | Full audit trail |
| `PlatformConfig` | key, value | Platform settings |

---

## 🌐 API Endpoints — Tailoring ERP

| Route Prefix | Module |
|-------------|--------|
| `/api/auth/*` | OTP Login, Google OAuth, Refresh Token |
| `/api/users/*` | User profile, staff management |
| `/api/customers/*` | Customer CRUD |
| `/api/categories/*` | Category management |
| `/api/sub-categories/*` | Sub-category management |
| `/api/products/*` | Product/service catalog |
| `/api/add-ons/*` | Add-on services |
| `/api/units/*` | Inventory units |
| `/api/items/*` | Raw material inventory |
| `/api/orders/*` | Order CRUD + status updates |
| `/api/payments/*` | Payment collection |
| `/api/expenses/*` | Expense tracking |
| `/api/attendance/*` | Staff attendance |
| `/api/work-assignments/*` | Workboard assignments |
| `/api/gallery/*` | Customer & shop gallery |
| `/api/dashboard/*` | Real-time stats |
| `/api/reviews/*` | Customer reviews |
| `/api/reports/*` | Business reports |
| `/api/measurements/*` | Measurement records |
| `/api/voice-notes/*` | Audio notes for orders |
| `/api/attenders/*` | Referral/attender tracking |
| `/api/pdf/*` | Invoice & label PDF generation |
| `/api/courses/*` | Course management |
| `/api/students/*` | Student enrollment |
| `/api/feedback/*` | Customer feedback |
| `/api/enquiries/*` | Enquiry/lead management |
| `/api/push/*` | Web push notifications |
| `/api/admin/*` | Admin panel (super-admin) |
| `/api/admin/tailor-admins/*` | Tailor-admin management |
| `/api/public/*` | Public data (no auth required) |

---

## 📱 Android App — Feasibility & Plan

**Yes — a mobile app is 100% feasible. The existing REST API backend works as-is.**

---

### Recommended Tech Stack: React Native + Expo

Since the web frontend is React/Next.js, React Native reuses component patterns and state management logic.

```
React Native (Expo)
  ├── Axios / TanStack Query   — same API layer as web
  ├── React Navigation         — tab + stack navigator
  ├── Expo Camera              — barcode scanning, photo capture
  ├── Expo AV                  — voice note recording
  ├── Expo Notifications       — push notifications (FCM)
  ├── AsyncStorage             — local caching for offline
  ├── react-native-sketch-canvas — design sketch feature
  └── react-native-signature   — digital signatures
```

---

### Alternative: Flutter

| | React Native | Flutter |
|--|--|--|
| Language | JavaScript/TypeScript | Dart |
| Reuse web logic | ✅ High overlap | ❌ Rewrite |
| Performance | Very Good | Excellent |
| UI Customization | Good | Excellent (Material 3) |
| Ecosystem | Very large | Large + growing |
| Recommendation | ✅ If dev knows JS | If starting fresh |

---

### Backend Changes Needed for Mobile

| Change | Reason |
|--------|--------|
| JWT in `Authorization: Bearer` header | Mobile can't use httpOnly cookies easily |
| Firebase Cloud Messaging (FCM) | Web Push API doesn't work on Android native |
| Ensure multipart file uploads work | React Native `FormData` for photos, voice notes |
| Optional: `/api/v1/` versioning | Clean separation of mobile vs web API |

---

### Core App Screens

| Screen | Key Features | API |
|--------|-------------|-----|
| Login | Phone OTP entry | `/api/auth/*` |
| Dashboard | KPI cards, recent orders | `/api/dashboard/*` |
| Orders List | Filter by status, search | `/api/orders/*` |
| New Order | Customer picker, product selection | `/api/orders/` |
| Order Detail | Status update, payment, attachments | `/api/orders/:id` |
| Customer List | Search, filter, customer profile | `/api/customers/*` |
| Measurements | Form by garment type, history | `/api/measurements/*` |
| Workboard | Kanban stages, assign/complete | `/api/work-assignments/*` |
| Attendance | Check-in/check-out | `/api/attendance/*` |
| Barcode Scanner | Scan → find order | `/api/orders/*` |
| Expenses | Add expense, category, amount | `/api/expenses/*` |
| Reports | Date range, export | `/api/reports/*` |
| Notifications | Push alerts, order updates | FCM |
| Students | Enrollment, fee payment | `/api/students/*` |
| Enquiries | Lead list, follow-up | `/api/enquiries/*` |

---

### Key Mobile-Specific Features

1. **📷 Barcode Scanner** — scan order ID at delivery, confirm handover
2. **🎙️ Voice Notes** — record audio stitching instructions on-device
3. **✏️ Sketch Canvas** — draw garment design on touchscreen
4. **📸 Camera Integration** — capture measurement photos, gallery images
5. **🔔 Push Notifications** — FCM for real-time order status alerts
6. **📴 Offline Mode** — cache recent 50 orders, sync when online
7. **💬 WhatsApp Integration** — share order confirmation via WhatsApp API
8. **📊 Quick Reports** — swipe-based date range picker for revenue stats

---

## 🔄 Complete Business Flow

```
Walk-in / Call
    │
    ▼
[Enquiry Captured] ──────────────────────────► Enquiry Management
    │
    ▼
Customer Profile Created ─────────────────────► Customer CRM
    │
    ▼
Measurements Taken ───────────────────────────► Measurement Records
    │
    ▼
Order Created
  ├─ Products selected (from catalog)
  ├─ Add-ons added (embroidery, mirror work...)
  ├─ Materials assigned (fabric from inventory)
  └─ Advance payment collected
    │
    ▼
Work Assigned to Staff ───────────────────────► Workboard
    │
    ▼
Production Pipeline:
  DESIGNING → CUTTING → STITCHING
    │
    ▼
READY TO DELIVER
  └─ Push Notification sent to admin
    │
    ▼
Balance Payment Collected ────────────────────► Payment Records
    │
    ▼
Order DELIVERED ──────────────────────────────► Order Closed
    │
    ▼
Customer Review Collected ────────────────────► Analytics
    │
    ▼
Reports & Dashboard Updated ──────────────────► Business Insights
```

---

## 🛡️ Security Architecture

| Layer | Implementation |
|-------|---------------|
| Rate Limiting | Redis-backed, per-IP, 1000 req/15min global, 50 req/15min auth |
| CSRF Protection | Origin header validated on all state-changing requests |
| Authentication | httpOnly JWT cookies — prevents XSS token theft |
| Tenant Isolation | All DB queries scoped by `userId` (tailor admin ID) |
| File Access Control | Private uploads require authenticated request |
| Audit Logging | `AuditLog` model tracks all critical create/update/delete actions |
| Soft Deletes | `deletedAt` pattern — no accidental permanent data loss |
| OTP Brute Force | Max 3 attempts per OTP before automatic invalidation |
| Helmet.js | Standard HTTP security headers on all responses |

---

*Documentation auto-generated from codebase analysis*  
*Source: `Prod ready TMS` — Tailoring ERP modules*  
*Date: August 2026*
