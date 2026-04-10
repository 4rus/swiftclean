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

---

## Setup Instructions (Step by Step)

### 1. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) → Sign up (free)
2. Click **New project**
3. Name it `cleantrack`, pick a strong password, select **Canada (Central)**

### 2. Run the database schema

1. In Supabase dashboard → **SQL Editor** → **New query**
2. Open `supabase/schema.sql` from this folder
3. Paste the entire contents and click **Run**
4. Then run the storage bucket lines (at the bottom of schema.sql) in a **second** query

### 3. Add your environment variables

1. In Supabase → **Project Settings** → **API**
2. Copy `Project URL` and `anon public` key
3. Open `.env.local` in this folder and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 4. Create the manager account

1. In Supabase → **Authentication** → **Users** → **Invite user**
2. Enter your dad's email address
3. After he sets his password, go to **Table Editor** → `profiles`
4. Find his row and set `role` = `manager` and assign his `store_id`

### 5. Install and run

Make sure you have **Node.js 18+** installed ([nodejs.org](https://nodejs.org))

```bash
# In this folder:
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to the internet (free)

1. Go to [https://vercel.com](https://vercel.com) → Sign up with GitHub
2. Push this folder to a GitHub repo
3. Import it in Vercel
4. Add the two environment variables from step 3
5. Click Deploy — done! You get a free `.vercel.app` URL

---

## GPS Radius

Employees must be within **200 metres** of a store to log in.

To adjust this, open `lib/stores.js` and change:
```js
export const GPS_RADIUS_METRES = 200
```

---

## Invoice Details

- **Company:** INDIMOE Cleaning
- **Address:** 48 Castleridge Crescent NE, Calgary, AB T3J 1N7
- **Tax Reg. No.:** 73762-9089RT0001
- **GST:** 5% (Alberta — no HST)
- PDF downloads automatically to the user's device

---

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
| Hosting    | Vercel (free tier)      |

---

*Built for INDIMOE Cleaning, Calgary, AB*
