# Smart Doc Chaser MVP – Detailed Requirements Prompt (DRP)

## 1. Target User & Pain

**Primary user:**  
Health insurance broker (ACA & Medicare), 50–70 years old, often using email + physical folders to manage client documents.

**Core pain points:**
- Clients email random photos and PDFs  
- Wrong docs sent or missing pages  
- Broker spends too much time chasing documents  
- Everything gets lost in email threads or paper folders  
- No simple way to track "pending vs completed" documents  

---

## 2. Core MVP Outcome

A simple workflow:
1. Broker enters client info + requested document type  
2. Client receives SMS/email with a unique upload link  
3. Client uploads document from phone or computer  
4. System automatically renames + organizes the file  
5. Broker is notified  
6. Broker can view a simple Doc Tracker of pending/completed documents  

No logins or dashboards needed for MVP. Keep it extremely simple.

---

## 3. Proposed Tech Stack

- **Workflow engine:** n8n (self-hosted)  
- **Database:** Supabase Postgres  
- **File storage:** Supabase Storage (optional GDrive syncing later)  
- **Messaging:** Twilio for SMS, Supabase/SendGrid for email  
- **Frontend:** Simple web UI (HTML/JS or lightweight React)  
- **Hosting:** Vercel, Supabase Edge, or static hosting  

No auth needed for MVP (use shared secret or URL protection).

---

## 4. Data Model (Supabase)

### `document_requests` Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Unique request ID |
| broker_id | UUID | Optional, future multi-tenant support |
| client_name | text | Client full name |
| client_phone | text | Client phone number |
| client_email | text | Optional |
| document_type | text | e.g., "Proof of Income" |
| deadline | timestamp | Optional |
| status | enum | pending, completed, expired |
| upload_token | UUID | For upload link |
| upload_link | text | URL clients visit |
| file_url | text | Final file URL |
| created_at | timestamp | Default now |
| uploaded_at | timestamp | When completed |
| last_reminder_at | timestamp | Reminder tracking |
| reminders_stopped | boolean | Default false |

---

## 5. High-Level Workflows (n8n)

### Workflow 1: Create Document Request

Triggered by broker form → n8n webhook
1. Receive form data  
2. Generate UUID upload token  
3. Build upload link e.g. `/upload?token=UUID`  
4. Insert record into Supabase  
5. Send SMS via Twilio  
6. Send email (optional)  
7. (Optional) Schedule reminders  

---

### Workflow 2: Process Upload

Triggered by Supabase Storage webhook or frontend callback.

Steps:
1. Receive upload token + file path  
2. Fetch corresponding pending request  
3. Build normalized filename:  
   `JohnSmith_ProofOfIncome_2025-11-26.pdf`  
4. Move file into structured folders:  
   `/clients/JohnSmith/ProofOfIncome/<filename>`  
5. Update DB: mark as completed  
6. Notify broker by SMS/email  

---

### Workflow 3: Reminders

Cron-based or Wait node based:
1. Find pending requests  
2. If 48 hours since creation → send reminder  
3. If deadline exists and 24 hours away → send urgent reminder  
4. If past deadline → mark expired + notify broker  

---

## 6. Frontend Components

### A. Broker Request Form (Page 1)
Fields:
- Client Name  
- Phone  
- Email  
- Document Type  
- Deadline  
Button: **Send Request**

### B. Client Upload Page (Page 2)
Loads token, verifies request, shows:
- Document type  
- Broker name  
- Upload button  

After upload:
> “Thank you! Debbie has been notified.”

### C. Broker Doc Tracker (Page 3)
Simple table with:
- Client Name  
- Document Type  
- Status  
- File Link  
- Upload Link  

Sort: pending → completed.

---

## 7. MVP Scope vs Non-Goals

### In Scope:
- Single broker  
- Send upload link  
- Accept file uploads  
- Rename + organize  
- Basic notifications  
- Simple Doc Tracker  

### Out of Scope:
- Auth system  
- Payments  
- AI classification  
- Agency-level support  
- Bulk client import  
- Multi-doc checklists  
- Medicare/Healthplanfinder integrations  

---

## 8. Tasks for Claude

1. Refine architecture  
2. Generate SQL schema  
3. Provide n8n workflow nodes step-by-step  
4. Define backend endpoints  
5. Generate starter frontend pages  

---

## End of DRP
