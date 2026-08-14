# WorkforceOS — Supabase Migrations

## How to Apply These Migrations

Run the files **in numbered order** inside your **own** Supabase project dashboard.

### Steps

1. Open [supabase.com](https://supabase.com) → your project
2. Click **SQL Editor** (left sidebar) → **New Query**
3. Open each `.sql` file below, copy the contents, paste and **Run**

### Order

| # | File | What it does |
|---|---|---|
| 1 | `20260814_001_initial_schema.sql` | Creates all tables + indexes |
| 2 | `20260814_002_rls_policies.sql` | Adds Row Level Security (multi-tenant isolation) |
| 3 | `20260814_003_seed_data.sql` | Inserts demo/dev data matching mockData.ts |

---

## Adding New Tables (Day-to-Day Workflow)

When you need a new table (e.g., payroll):

```bash
# 1. Create a new migration file (name it with today's date + sequence number)
#    Example: 20260820_004_payroll_tables.sql

# 2. Write the SQL in that file

# 3. Test it in your OWN Supabase dashboard

# 4. Commit to git
git add supabase/migrations/20260820_004_payroll_tables.sql
git commit -m "feat(db): add payroll_runs and salary_structures tables"

# 5. The other developer pulls and runs the new file in their own dashboard
```

## Rule

> **Never change the database schema directly from the Supabase Table Editor.**  
> **Always use SQL migration files committed to git.**

This keeps D1 and D2 Supabase projects in sync.
