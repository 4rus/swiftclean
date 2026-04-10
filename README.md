# CleanTrack — INDIMOE Cleaning Staff Portal

A full-stack web app for managing cleaning jobs across all 7 Calgary locations.

---

## Features

- **GPS login** — employees can only log in when physically at a store location
- **Dashboard** — today's jobs, completion stats, photo count
- **Jobs** — create, assign, and track cleaning jobs
- **Photos** — before & after photo uploads per job
- **Checklist** — tap to check off cleaning tasks, mark jobs complete
- **Invoices** — generate Staples-style PDF invoices (GST included, amounts in words)
- **Stores** — manager view of all 7 branches
- **Employees** — invite and manage staff

## File Structure

```
cleantrack/
├── app/
│   ├── login/          ← GPS-verified login page
│   ├── dashboard/      ← Home screen with stats
│   ├── jobs/           ← Job list + new job form
│   ├── photos/         ← Photo uploads
│   ├── checklist/      ← Cleaning task checklist
│   ├── invoices/       ← Invoice generator + history
│   ├── stores/         ← All branches (manager only)
│   └── employees/      ← Staff management (manager only)
├── components/
│   └── Layout.jsx      ← Sidebar + topbar
├── lib/
│   ├── supabase.js         ← Browser Supabase client
│   ├── supabase-server.js  ← Server Supabase client
│   ├── stores.js           ← GPS coordinates for all 7 stores
│   └── invoice.js          ← PDF generator (jsPDF)
├── supabase/
│   └── schema.sql      ← Full database schema — run this first!
├── styles/
│   └── globals.css
├── .env.local          ← Add your Supabase keys here
└── README.md           ← This file
```

---

## Tech Stack

| Layer      | Tool                    |
|------------|-------------------------|
| Frontend   | Next.js 14 (React)      |
| Database   | Supabase (PostgreSQL)   |
| Auth       | Supabase Auth           |
| Storage    | Supabase Storage        |
| PDF        | jsPDF + jspdf-autotable |
| Hosting    | Vercel                  |

---

*Built for INDIMOE Cleaning, Calgary, AB*
