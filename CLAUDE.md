# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Doc Chaser is a document request and tracking system designed for health insurance brokers (ACA & Medicare). It solves the chaos of chasing client documents via email and paper folders.

### Target User
- Health insurance brokers, typically 50–70 years old
- Currently managing documents through email threads and physical folders
- Not tech-savvy; needs extremely simple interfaces

### Core Pain Points Addressed
- Clients email random photos/PDFs in scattered threads
- Wrong documents or missing pages
- Time wasted chasing documents manually
- No visibility into pending vs completed documents

### Core Workflow
1. Broker enters client info + requested document type
2. Client receives SMS/email with unique upload link
3. Client uploads document from phone or computer
4. System auto-renames file: `ClientName_DocType_Date.pdf`
5. System organizes into folders: `/clients/ClientName/DocType/`
6. Broker gets notified and tracks status in Doc Tracker

## Branding Guidelines

### Name Options
- **Smart Doc Chaser** (current) - Descriptive, action-oriented
- **DocChase** - Shorter, modern
- **InsureDocs** - Industry-specific
- **BrokerBox** - Professional, container metaphor
- **PolicyPapers** - Insurance-focused
- **CoverageCollect** - Alliterative, industry-relevant

### Color Palette (Healthcare/Insurance)
- **Primary:** Trust Blue (#2563EB or #1E40AF) - Conveys reliability, professionalism
- **Secondary:** Health Green (#059669 or #10B981) - Represents health, success, completion
- **Accent:** Warm Orange (#F59E0B) - For CTAs, urgency, pending states
- **Neutral:** Slate grays for text and backgrounds

### Typography
- Clean, readable sans-serif fonts (Inter, Open Sans, or system fonts)
- Large font sizes for older demographic (minimum 16px body text)
- High contrast ratios for accessibility

### Voice & Tone
- Simple, jargon-free language
- Reassuring and professional
- Action-oriented ("Send Request", "Upload Document")
- Confirmation-focused ("Document received! Your broker has been notified.")

### UI Principles
- Minimal clicks to complete tasks
- Large buttons and touch targets
- Clear status indicators (color-coded: pending=orange, completed=green, expired=red)
- Mobile-first for client upload page (clients often use phones)

## Tech Stack

- **Frontend:** Next.js 14+ (App Router) with TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase Postgres
- **File storage:** Supabase Storage (future: GDrive sync)
- **SMS:** ClickSend (via n8n node) - chosen over Twilio/Plivo for native n8n integration, multi-channel support (SMS + fax), free inbound SMS, and 24/7 support
- **Email:** SendGrid (optional)
- **Workflow engine:** n8n Cloud (~$20/month managed service)
- **Hosting:** Vercel

## Project Structure

```
smart-doc-chaser/
├── app/
│   ├── layout.tsx              # Root layout with branding
│   ├── page.tsx                # Home/landing
│   ├── upload/
│   │   └── [token]/
│   │       └── page.tsx        # Client upload page
│   ├── request/
│   │   └── page.tsx            # Broker request form
│   └── tracker/
│       └── page.tsx            # Broker doc tracker
├── components/
│   ├── FileUpload.tsx          # Drag-drop upload component
│   ├── StatusBadge.tsx         # Color-coded status
│   └── RequestForm.tsx         # Broker form component
├── lib/
│   ├── supabase.ts             # Supabase client setup
│   └── types.ts                # TypeScript types
├── sql/
│   └── schema.sql              # Database migration
└── public/                     # Static assets
```

## Database Schema

### `document_requests` Table
| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Unique request ID |
| broker_id | UUID | Future multi-tenant support |
| client_name | text | Client full name |
| client_phone | text | Client phone number |
| client_email | text | Optional |
| document_type | text | e.g., "Proof of Income" |
| deadline | timestamp | Optional |
| status | enum | pending, completed, expired |
| upload_token | UUID | For secure upload link |
| upload_link | text | URL clients visit |
| file_url | text | Final stored file URL |
| created_at | timestamp | Default now |
| uploaded_at | timestamp | When completed |
| last_reminder_at | timestamp | Reminder tracking |
| reminders_stopped | boolean | Default false |

## n8n Workflows

### Workflow 1: Create Document Request
Trigger: Broker form submission → webhook
1. Receive form data (client name, phone, email, doc type, deadline)
2. Generate UUID upload token
3. Build upload link: `/upload/[token]`
4. Insert record into Supabase
5. Send SMS via ClickSend
6. Send email (optional)
7. Schedule reminders

### Workflow 2: Process Upload
Trigger: Supabase Storage webhook or frontend callback
1. Receive upload token + file path
2. Fetch corresponding pending request
3. Build normalized filename: `JohnSmith_ProofOfIncome_2025-11-26.pdf`
4. Move file to: `/clients/JohnSmith/ProofOfIncome/<filename>`
5. Update DB: status → completed, set uploaded_at
6. Notify broker via SMS/email

### Workflow 3: Reminders (Cron-based)
1. Find pending requests
2. 48 hours since creation → send reminder
3. 24 hours before deadline → send urgent reminder
4. Past deadline → mark expired, notify broker

## Frontend Pages

### Page 1: Broker Request Form
- Fields: Client Name, Phone, Email, Document Type, Deadline
- Button: "Send Request"
- Simple form, no distractions

### Page 2: Client Upload Page
- Token-validated access
- Shows: Document type requested, Broker name
- Large upload button (drag-drop + file picker)
- Success: "Thank you! [Broker] has been notified."

### Page 3: Broker Doc Tracker
- Table: Client Name | Document Type | Status | File Link | Upload Link
- Sorted: pending first, then completed
- Color-coded status badges

## MVP Scope

### In Scope
- Single broker operation
- Send upload links via SMS/email
- Accept file uploads
- Auto-rename and organize files
- Basic SMS/email notifications
- Simple Doc Tracker view

### Out of Scope (Future)
- Payment processing
- AI document classification
- Multi-agency support
- Bulk client import

## Security Roadmap (Post-MVP)

### V1 Security (Before Real Client Data)
1. **Private Storage Bucket** - Convert from public, use signed URLs (1hr expiry)
2. **Broker Authentication** - Supabase Auth, protect `/request` and `/tracker`
3. **Broker-Scoped RLS** - Each broker only sees their own data
4. **Auto-Deletion** - Optional 90-day file retention policy

### Security Architecture
```
Client (no auth) → /upload/[token] → Private Storage
                                          ↓
Broker (login) → /tracker → Signed URL → View file
```

### Not Required
- HIPAA compliance (not handling PHI)
- Client-side encryption (standard Supabase encryption sufficient)
- Multi-document checklists
- Medicare/Healthplanfinder integrations

## Common Document Types (Insurance)
- Proof of Income (pay stubs, tax returns)
- ID/Driver's License
- Social Security Card
- Proof of Address
- Immigration Documents
- Employer Coverage Letter
- SEP Documentation
