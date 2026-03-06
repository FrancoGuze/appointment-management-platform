# Coding Rules

These rules must always be followed when writing code for this project.

---

# Database Rules

* Always use the Supabase client.
* Never write raw SQL unless explicitly required.
* Always validate slot availability before creating an appointment.
* Never allow two appointments for the same slot.

---

# Architecture Rules

* All database access must be placed in `/src/services`.
* React components must never query Supabase directly.
* Components should call service functions.

Correct:

Component → Service → Supabase

Incorrect:

Component → Supabase

---

# TypeScript Rules

* Always define return types.
* Never use `any`.
* Prefer `type` or `interface` definitions for data models.

---

# UI Rules

* Components must be small and reusable.
* No business logic inside UI components.

---

# Security Rules

* Never expose private keys.
* Always assume Supabase Row Level Security is active.
