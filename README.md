# Hemratan Apartment Manager

> One community. One connected platform.

Hemratan Apartment Manager is a modern, production-conscious residential society management SaaS platform designed to streamline day-to-day operations for residential societies (such as Hemratan Apartments with ~100 flats, architected for up to 500 simultaneous active users). It replaces paper visitor registers, WhatsApp complaint threads, fragmented spreadsheets, manual parking allocations, and manual maintenance billing.

---

## Target Users & Four Dedicated Interfaces

1. **Resident** – Welcome dashboard with personalised greeting, maintenance dues, pre-approved visitors, complaint submissions (named or anonymous), community announcements, bylaws, and amenity bookings.
2. **Security Guard** – Mobile-first, high-contrast access control for visitor onboarding with OTP verification and Godrej intercom confirmation, delivery intake, domestic staff attendance, and visitor parking monitoring.
3. **Managing Committee** – Operations cockpit for complaint triage and priority overrides, monthly hybrid maintenance billing, expense tracking with receipt audits, parking slot management, rules/amenities management, and society reports.
4. **Super Admin** – System governance, building/wing/flat configuration, role and permission matrix management, security audit logging, and platform monitoring.

---

## Major Modules

- **Authentication & Role-Based Access Control**: Secure session management, least-privilege permissions, flat-level data isolation, and audit logging.
- **Visitor Management**: Multi-step verification (visitor details, age-range, private photo capture, secure 6-digit OTP, intercom confirmation, and entry/exit timestamps).
- **Complaints & Task Engine**: Named/anonymous complaints with deterministic priority scoring (severity, urgency, affected flats, recurrence, property damage), emergency overrides, assignment workflows, and auditable event tracking.
- **Hybrid Maintenance Billing Engine**: Strict monthly cycle supporting Base Maintenance = Fixed charge + (Area × Rate/sq.ft) + Funds + manual GST entry, immutable bill snapshots, and consolidated/individual PDF generation.
- **Visitor Parking & Delivery Management**: Slot reservations (P1–P5), overstay detection, delivery intake, and collection tracking.
- **Staff Attendance & Society Directory**: Domestic help attendance, flat access mapping, and consent-based verified service provider directory.
- **Rules, Bylaws & Amenities**: Searchable society regulations, versioned publishing, gym/game room operating schedules, and slot reservations.
- **Reports & Security Audits**: Comprehensive analytics and append-only audit trail for administrative actions.

---

## Technology Stack

- **Frontend**: Next.js App Router, React 19, TypeScript (Strict Mode), Tailwind CSS, Lucide React icons, React Hook Form, Zod.
- **UI Design System**: Pastel Neo-Brutalism with modern SaaS aesthetics (Lavender #EAE5FA, Lime Green #C9F36B, Dark Navy Borders #303044, Crisp White cards, clean typography).
- **Backend**: Next.js Route Handlers & Server Actions, modular services, strict validation layers.
- **Database & Storage**: Supabase PostgreSQL with transaction pooling, SQL migrations, Row-Level Security, integer paise for all financial computations, and private storage buckets with signed URLs.
- **Deployment**: Vercel Serverless & Edge infrastructure.

---

## Security & Privacy Philosophy

- **Zero-Trust & Least Privilege**: Server-side role and flat-level authorization on every request.
- **Data Protection & Privacy**: Anonymized complaint identity separation, private photo storage with expiring signed URLs, no real OTP exposure in logs.
- **Financial Rigour**: Pure integer paise calculations preventing floating-point errors, immutable billing snapshots.
- **Deterministic Logic**: No unnecessary paid AI/LLM dependencies; explainable, testable business logic.

---

## Development Status

Implementation in active staged progress according to the development roadmap.

- [x] **Stage 0: Repository Foundation & Core Next.js Setup**
- [x] **Stage 1: Authentication & Role Dashboards**
- [ ] **Stage 2: Visitor Management & OTP Workflow**
- [ ] **Stage 3: Visitor Parking & Delivery Management**
- [ ] **Stage 4: Complaints & Task Management**
- [ ] **Stage 5: Directory & Domestic Help Attendance**
- [ ] **Stage 6: Society Rules & Amenities Management**
- [ ] **Stage 7: Maintenance Billing & Financial Engine**
- [ ] **Stage 8: Reports, PWA & Production Hardening**

---

## Local Setup Instructions

### Prerequisites
- Node.js (v20+ or v22 LTS recommended)
- npm or pnpm
- Supabase account / project for PostgreSQL & Storage

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/nish-09/Hemratan-Apartment-Manager.git
   cd Hemratan-Apartment-Manager
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   # Populate NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.
   ```
4. Run tests:
   ```bash
   npm test
   ```
5. Start development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.
