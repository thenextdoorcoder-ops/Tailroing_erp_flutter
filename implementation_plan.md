# 📱 KTown Aari Works — Android ERP App Implementation Plan

A premium, market-standard Android application for the KTown Tailoring ERP system, built on the existing REST API backend.

---

## Overview

The existing backend (Node.js/Express + PostgreSQL + Redis) is already feature-complete. This plan converts the web frontend logic into a **native Android app** using **Flutter** — delivering buttery-smooth Material 3 UI, offline-first capability, native camera/barcode/audio features, and FCM push notifications.

> **Why Flutter over React Native?**
> Flutter provides **pixel-perfect, platform-native performance**, outstanding Material 3 design support, a rich widget ecosystem, and single-codebase deployment for Android (with iOS ready later). Since the backend is already built, there is no JS-reuse advantage to React Native.

---

## User Review Required

## All Decisions Confirmed ✅

> [!NOTE]
> ✅ **Single App, Role-Based Access**: One app for Admin + Staff. UI adapts after login based on `role` + `staffRole`.
>
> ✅ **Firebase = FCM Notifications Only**: PostgreSQL remains the real database. FCM is free push delivery.
>
> ✅ **Backend changes approved**: Bearer token JWT auth + FCM token endpoint to be added.
>
> ✅ **Flutter confirmed**: Material 3, premium animations, Riverpod state management.
>
> ✅ **Offline Mode from Day 1**: Hive local database caches recent 50 orders + customers. Auto-syncs when back online.
>
> ✅ **Distribution**: APK install first → Google Play Store later (both supported via `--release` build).
>
> ✅ **Theme**: Light + Dark mode toggle. User preference saved in local storage.

---

## Architecture

```
Flutter App (Android)
├── Presentation Layer (UI)
│   ├── Screens / Pages         — full-screen views per module
│   ├── Widgets                 — reusable UI components
│   └── Themes                  — Material 3 color scheme, typography
│
├── State Management (Riverpod)
│   ├── Providers               — reactive state for each module
│   ├── Notifiers               — business logic + API calls
│   └── AsyncValue              — loading/error/data states
│
├── Data Layer
│   ├── API Client (Dio)        — JWT auth interceptor, retry, timeout
│   ├── Repositories            — abstract data access interface
│   ├── DTOs                    — JSON serialization (freezed)
│   └── Local Cache (Hive)      — offline-first order/customer cache
│
└── Core
    ├── Router (go_router)      — deep-link aware navigation
    ├── Secure Storage          — JWT token storage (flutter_secure_storage)
    ├── FCM Service             — push notification handler
    └── Services                — barcode, camera, audio, PDF viewer
```

### State Management: Riverpod
- Reactive, testable, compile-safe
- AsyncNotifierProvider for API-backed data
- StateNotifierProvider for local UI state

### Navigation: go_router
- Declarative, deep-link ready
- Role-based route guards (STAFF vs ADMIN redirects)

---

## Design System

### Color Palette (Material 3 — Dark + Light)

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#7C4DFF` (Deep Purple) | CTA buttons, active states |
| Secondary | `#FF6D00` (Deep Orange) | Accent, badges, alerts |
| Surface | `#1C1B1F` / `#FFFBFE` | Card backgrounds |
| Error | `#CF6679` | Validation, warnings |
| On Primary | `#FFFFFF` | Text on primary |
| Neutral | `#CAC4D0` | Dividers, disabled |

### Typography (Google Fonts: Plus Jakarta Sans)
- Display: 32sp Bold — page titles
- Headline: 24sp SemiBold — section headings
- Title: 18sp Medium — card titles
- Body: 14sp Regular — data labels
- Label: 12sp Medium — chips, badges

### Animations
- Hero transitions between list → detail screens
- Lottie animations for loading states and empty states
- Shimmer skeleton loaders for API calls
- Spring physics on FAB and bottom sheet reveals
- Animated status badge color transitions

---

## Proposed Changes

### Phase 1 — Foundation & Core Infrastructure

#### [NEW] Flutter Project Setup
- `flutter create ktailoring_erp --org com.ktailoring`
- Enable Material 3, set minimum SDK 26
- Configure `google-services.json` for FCM
- Set up flavors: `dev` (staging backend) and `prod`

#### [NEW] Core Dependencies (`pubspec.yaml`)
```yaml
# Networking & State
dio: ^5.4.0               # HTTP client
riverpod: ^2.5.0          # State management
freezed: ^2.4.0           # Immutable data classes
json_serializable: ^6.7.0 # JSON codegen

# Navigation
go_router: ^13.0.0

# Local Storage
hive_flutter: ^1.1.0      # Offline cache
flutter_secure_storage: ^9.0.0  # JWT token storage

# Firebase
firebase_core: ^2.24.0
firebase_messaging: ^14.7.0

# UI & Animations
lottie: ^3.0.0
shimmer: ^3.0.0
flutter_animate: ^4.3.0
cached_network_image: ^3.3.0
google_fonts: ^6.1.0

# Device Features
mobile_scanner: ^5.0.0    # Barcode scanner
camera: ^0.10.5           # Camera capture
record: ^5.0.0            # Voice note recording
just_audio: ^0.9.36       # Voice note playback
signature: ^5.4.0         # Sketch / signature canvas
image_picker: ^1.0.7      # Gallery photo picker
geolocator: ^11.0.0       # Optional location
open_filex: ^4.3.4        # Open PDF/invoice

# Utilities
intl: ^0.19.0             # Date/currency formatting
share_plus: ^7.2.0        # WhatsApp / share
url_launcher: ^6.2.0      # WhatsApp deep links
flutter_local_notifications: ^16.2.0
permission_handler: ^11.3.0
```

---

### Phase 2 — Authentication Module

#### [NEW] `lib/features/auth/`
- **Login Screen** — Email / Phone Number + Password entry
  - Clean branded UI with Shop Logo / Illustration
  - Password visibility toggle with animation
  - Role switcher tab or auto-role detection on login
  - Remember Me toggle (persists email/phone)
  - Quick error handling with shake animations
- **JWT Storage** — `flutter_secure_storage` (keystore-backed)
- **Auth Interceptor (Dio)** — auto-attaches `Authorization: Bearer <token>` to all protected endpoints, auto-handles 401 & session expiry
- **Profile / Session Management** — stores user object (`role`, `staffRole`, `shopName`, `ownerId`) to conditionally adapt the UI

**Backend change needed**: Add `Authorization: Bearer` header support alongside existing cookie auth in `auth.middleware.ts`.

---

### Phase 3 — Dashboard Module

#### [NEW] `lib/features/dashboard/`

**Dashboard Screen** — scrollable feed layout:
- **KPI Cards Row** (horizontal scroll):
  - Today's Orders / Revenue / Balance Due
  - Animated counter on load
  - Tap to navigate to filtered orders list
- **Production Pipeline** — horizontal mini Kanban
  - Count badge per status stage
  - Color-coded stage chips
- **Recent Orders** — list with status badges
- **Low Stock Alerts** — warning cards for inventory
- **Overdue Orders** — red-highlighted list
- **Staff Attendance Today** — avatar grid with status dot
- **Quick Actions** — FAB with speed dial:
  - ➕ New Order
  - 👤 New Customer
  - 🔍 Scan Barcode
  - 📝 New Enquiry

---

### Phase 4 — Orders Module (Core)

#### [NEW] `lib/features/orders/`

**Orders List Screen**:
- Segmented tab bar: All / Today / Pending / Overdue
- Search bar with debounced API query
- Filter bottom sheet: status, date range, category
- Order card: customer name, orderId, status badge, due date, balance
- Pull-to-refresh, infinite scroll pagination
- Swipe actions: Quick Status Update, Call Customer

**New Order Screen** (multi-step wizard):
1. **Customer Step** — search/select existing or create new
2. **Products Step** — category picker → product grid with quantity
3. **Add-Ons Step** — checklist of extra services
4. **Materials Step** — raw material assignment from inventory
5. **Measurements Step** — pre-fill from customer history or enter new
6. **Payment Step** — advance amount, delivery option (EXPRESS/CUSTOM)
7. **Review & Confirm** — summary before submit

**Order Detail Screen**:
- Status timeline stepper (visual lifecycle)
- **Quick Status Advance** button (e.g., "Mark Cutting Complete")
- Payment history + Add Payment bottom sheet
- Measurements card (expand/collapse)
- Attached files viewer (images + PDF)
- **Voice Note** — record / playback
- **Sketch Canvas** — draw garment design (finger drawing)
- **Generate Invoice** — download/share PDF
- **WhatsApp Share** — send order confirmation

**Barcode Scanner Screen**:
- Full-screen camera with laser overlay animation
- Auto-focus, torch toggle
- On scan → navigate to order detail instantly

---

### Phase 5 — Customer Module

#### [NEW] `lib/features/customers/`

**Customer List Screen**:
- Alphabetically indexed scroll list
- Search with name/phone
- Customer avatar with initials (colored by name hash)
- Quick call button on swipe

**Customer Profile Screen**:
- Profile header with photo + contact info
- Order history tab
- Measurement records tab (by garment type)
- Gallery tab (customer photos + design refs)
- Reviews tab

**Measurement Entry Screen**:
- Garment type selector (visual icons: Blouse / Chudi / Shirt / etc.)
- Dynamic form fields based on garment type
- `FitStyle` toggle (A/B/C)
- Body diagram reference image alongside fields

---

### Phase 6 — Workboard Module

#### [NEW] `lib/features/workboard/`

**Workboard Screen** (Kanban):
- Horizontal scrollable stage columns:
  `ORDER_CREATED → DESIGNING → CUTTING → STITCHING → READY → DELIVERED`
- Drag-and-drop order cards between stages
- Each card: order ID, customer name, product count, due date
- Staff filter chips (admin sees all, staff sees own)
- **Assign Staff** bottom sheet on card tap
- Animation on stage advance

---

### Phase 7 — Attendance Module

#### [NEW] `lib/features/attendance/`

**Attendance Screen**:
- Calendar heatmap for monthly view
- Quick check-in / check-out with timestamp
- Staff attendance list (admin view)
- Half-day / Leave marking
- Monthly summary card (present/absent count)

---

### Phase 8 — Inventory Module

#### [NEW] `lib/features/inventory/`

**Inventory List Screen**:
- Items list with stock quantity badges
- Low-stock highlighted in orange/red
- Quick restock bottom sheet (add quantity)
- Item detail: purchase price, selling price, unit, gallery

---

### Phase 9 — Expenses Module

#### [NEW] `lib/features/expenses/`

**Expenses Screen**:
- Grouped by date list
- Category chips filter
- Monthly total header card
- Add Expense FAB → form bottom sheet
- Chart: expenses by category (pie chart — `fl_chart`)

---

### Phase 10 — Reports Module

#### [NEW] `lib/features/reports/`

**Reports Screen**:
- Report type selector cards with icons
- Date range picker (quick: Today / Week / Month / Custom)
- Charts using `fl_chart`:
  - Revenue bar chart (daily/weekly/monthly)
  - Order status donut chart
  - Expense breakdown pie chart
- Export options: PDF download / WhatsApp share

---

### Phase 11 — Students & Courses Module

#### [NEW] `lib/features/students/`

**Student List Screen** → **Student Profile**:
- Enrollment status badge (ACTIVE / COMPLETED / DROPPED)
- Fee payment history
- Add payment bottom sheet
- Course progress indicator

---

### Phase 12 — Enquiries Module

#### [NEW] `lib/features/enquiries/`

**Enquiry List Screen**:
- OPEN vs CLOSED tab filter
- Quick "Convert to Order" action
- Follow-up due date highlighting

---

### Phase 13 — Push Notifications

#### [NEW] `lib/core/notifications/`

**FCM Integration**:
- Request notification permission on first launch
- Register FCM token with backend on login
- Handle foreground notifications (in-app banner)
- Handle background tap → navigate to relevant screen
- Notification categories:
  - 🆕 New Order → Order Detail
  - 📦 Status Change → Order Detail
  - ⏰ Due Date Alert → Orders List
  - ⚠️ Low Stock → Inventory
  - 👤 New Enquiry → Enquiries

**Backend change needed**:
- New `FcmToken` model: `userId, token, deviceId, platform`
- `POST /api/push/fcm-token` — register/update device token
- Replace `web-push` calls with Firebase Admin SDK `sendToDevice()`

---

### Phase 14 — Settings & Admin

#### [NEW] `lib/features/settings/`

**Settings Screen**:
- Shop branding (name, logo upload)
- Invoice settings (GST number, footer text)
- Staff management (TAILOR_ADMIN only)
- App theme: Light / Dark / System
- Notification preferences
- Logout with session clear

---

## App Navigation Structure

```
Root (AuthGuard)
├── Auth Stack
│   └── /login          → LoginScreen (Email/Phone + Password)
│
└── Main Shell (BottomNavBar)
    ├── /dashboard       → DashboardScreen
    ├── /orders          → OrdersListScreen
    │   ├── /orders/new  → NewOrderWizard
    │   └── /orders/:id  → OrderDetailScreen
    ├── /customers       → CustomerListScreen
    │   └── /customers/:id → CustomerProfileScreen
    ├── /workboard       → WorkboardKanbanScreen
    └── /more            → More Menu
        ├── /attendance
        ├── /inventory
        ├── /expenses
        ├── /reports
        ├── /students
        ├── /enquiries
        └── /settings
```

---

## Backend Changes Summary

| Change | Effort | Priority |
|--------|--------|----------|
| Add `Authorization: Bearer` JWT header support in auth middleware | 30 mins | 🔴 Critical |
| Add `FcmToken` model + registration endpoint | 2 hrs | 🔴 Critical |
| Replace Web Push with FCM Admin SDK | 3 hrs | 🟡 High |
| Add `/api/v1/` prefix (mobile versioning) | 1 hr | 🟢 Optional |
| Ensure multipart file upload works from mobile | Test only | 🟡 High |

---

## Screens Summary (17 Core + Supporting)

| # | Screen | Role | Priority |
|---|--------|------|----------|
| 1 | Login (Email/Phone + Password) | All | P0 |
| 2 | Dashboard | All | P0 |
| 3 | Orders List | All | P0 |
| 4 | New Order Wizard | Admin/Staff | P0 |
| 5 | Order Detail | All | P0 |
| 6 | Barcode Scanner | All | P0 |
| 7 | Customer List | All | P0 |
| 8 | Customer Profile | All | P1 |
| 9 | Measurement Entry | All | P1 |
| 10 | Workboard Kanban | All | P1 |
| 11 | Attendance | All | P1 |
| 12 | Inventory | Admin | P1 |
| 13 | Expenses | Admin | P2 |
| 14 | Reports & Charts | Admin | P2 |
| 15 | Students / Courses | Admin | P2 |
| 16 | Enquiries | All | P2 |
| 17 | Settings | Admin | P2 |
| 18 | Notifications | All | P1 |

---

## Development Phases & Timeline

| Phase | Work | Estimated Time |
|-------|------|----------------|
| Phase 1 | Project setup, design system, auth | 3 days |
| Phase 2 | Dashboard + Orders (list + detail) | 5 days |
| Phase 3 | New Order Wizard + Measurements | 4 days |
| Phase 4 | Customer module + Workboard | 3 days |
| Phase 5 | Attendance + Inventory + Expenses | 3 days |
| Phase 6 | Reports + Charts + PDF | 2 days |
| Phase 7 | FCM Notifications + Barcode | 2 days |
| Phase 8 | Students + Enquiries + Settings | 2 days |
| Phase 9 | Offline mode (Hive caching) | 2 days |
| Phase 10 | Testing + Polish + Play Store prep | 3 days |
| **Total** | | **~29 working days** |

---

## Verification Plan

### Automated Tests
```bash
flutter test                          # Unit + widget tests
flutter test integration_test/        # Integration tests
flutter analyze                       # Static analysis
```

### Manual Verification
- ✅ OTP login works end-to-end with real backend
- ✅ Create order → verify data in PostgreSQL
- ✅ Barcode scan → opens correct order
- ✅ Voice note records + plays back
- ✅ FCM notification received on device when order status changes
- ✅ Offline mode: disconnect wifi → app shows cached orders
- ✅ PDF invoice generates and opens
- ✅ WhatsApp share works

### Build Commands
```bash
flutter build apk --release           # Debug APK for testing
flutter build appbundle --release     # Play Store AAB bundle
```

---

*Plan prepared: August 2026 | KTown Aari Works Tailoring ERP Android App*
