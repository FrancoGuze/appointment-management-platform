# Project Architecture

Stack:

Frontend: Next.js
Backend: Supabase
Database: PostgreSQL (Supabase)
Language: TypeScript

---

# Application Architecture

The system uses a **frontend-driven architecture**.

Next.js communicates directly with Supabase using the Supabase JS client.

There is no custom backend server.

---

# Data Flow

User Action → Next.js → Supabase → Database → Response → UI Update

Example:

User books a slot

1. Frontend sends request to Supabase
2. Supabase inserts appointment
3. Slot becomes unavailable
4. UI refreshes

---

# Recommended Folder Structure

src/

app/
pages and routes

components/
UI components

lib/

supabaseClient.ts
Supabase initialization

services/

appointments.ts
slots.ts
users.ts

utils/

dateUtils.ts

---

# Supabase Client Example

supabaseClient.ts

import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

---

# Data Access Pattern

Database access should be isolated in service files.

Example:

services/appointments.ts

Functions:

createAppointment()
getAppointmentsByUser()
cancelAppointment()

This keeps components clean.

---

# Security Notes

Passwords must always be hashed.

Never expose service role keys in the frontend.

Use Supabase RLS policies when authentication is added.
