# Supabase Migration Guide

## Prerequisites

1. **Create a Supabase Project** at https://supabase.com
2. Get your credentials from Project Settings → API

## Step 1: Set Environment Variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

## Step 2: Run SQL Schema

Go to Supabase Dashboard → SQL Editor and run the contents of:
```
supabase/schema.sql
```

## Step 3: Configure Authentication

The app uses Supabase Auth. Users will be created via the signup flow or admin can create them manually in Supabase Dashboard → Authentication → Users.

## Step 4: Run the Server

Update package.json scripts to use the new server:

```json
"scripts": {
  "dev": "tsx server.supabase.ts",
  "build": "tsc && vite build",
  "preview": "vite preview"
}
```

## Key Changes from SQLite

| Feature | SQLite | Supabase |
|---------|--------|---------|
| Database | school.db file | Cloud PostgreSQL |
| Auth | bcrypt + JWT | Supabase Auth |
| Queries | better-sqlite3 | @supabase/js |
| Real-time | No | Yes (optional) |
| Offline | Yes | No |

## Data Migration (Optional)

If you have existing SQLite data, export it and import via Supabase Dashboard → SQL Editor:

```sql
-- Example: Migrate students
INSERT INTO students (id, full_name, gender, form, parent_phone)
SELECT 
  uuid_generate_v4(), 
  full_name, 
  gender, 
  form, 
  parent_phone 
FROM students_old;
```

## Testing Locally

```bash
npm run dev
# Opens at http://localhost:5173
```

## Production

Deploy via:
- **Frontend**: Vercel, Netlify, or any static host
- **Backend**: Set as Supabase Edge Function or deploy to Vercel/Cloud Run

## Troubleshooting

**"Supabase not configured"**
- Check your `.env` file is correct

**"Row Level Security error"**
- Add appropriate RLS policies in schema.sql

**"Invalid token"**
- Regenerate your Supabase keys

## Git Commits

After configuration, you can commit these new files:

```bash
git add -A
git commit -m "convert to Supabase backend

- Add Supabase client config (src/lib/supabase.ts, src/lib/db.ts)
- Add schema migration (supabase/schema.sql)
- Add new Express server (server.supabase.ts)
- Add Supabase dependencies
- Create migration guide"
```