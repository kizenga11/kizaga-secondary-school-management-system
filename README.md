# Kitukutu Technical School Management System

A comprehensive school management system for secondary schools in Tanzania. Built with React, Express, and Supabase.

## Features

- **Student Management** - Register, promote, track students by class/stream
- **Staff Management** - Manage teachers, academic staff, headmaster
- **Curriculum & Topics** - Track teaching progress, topic coverage, tests
- **Examination** - Create exams, enter scores, process results
- **Reports** - Division summaries, trend analysis, broadsheets

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Express.js (API Server)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

## Quick Start

### 1. Clone and Install

```bash
npm install
```

### 2. Supabase Setup

1. Create project at https://supabase.com
2. Copy `.env.example` to `.env`
3. Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   ```
4. Run schema in Supabase SQL Editor: `supabase/schema.sql`

### 3. Run Development

```bash
npm run dev
# Opens at http://localhost:5173
```

## Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── lib/         # Supabase client
│   └── App.tsx      # Main app
├── server.supabase.ts  # Express API
├── supabase/
│   └── schema.sql    # Database schema
└── package.json
```

## Default Login

After setting up Supabase, create a user in Authentication → Users

- **Admin**: admin@kitukutu.sc.tz
- **Password**: (set during signup)

## Git Commit Ready

```bash
git add -A
git commit -m "Kitukutu Technical School Management System

- React + Express + Supabase stack
- Student management with streams
- Curriculum & topic tracking
- Examination processing module
- Reports & analytics"
```

## License

MIT