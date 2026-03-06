# Database Schema

The system uses **Supabase (PostgreSQL)**.

Primary tables:

* users
* availability_templates
* slots
* appointments

---

# users

Stores application users.

Columns:

id (uuid)
Primary key. Generated with gen_random_uuid().

email (text)
Unique user email.

password_hash (text)
Hashed password.

created_at (timestamptz)
Account creation timestamp.

last_login (timestamptz)
Last login timestamp.

---

# availability_templates

Defines the weekly schedule.

Columns:

id (uuid)
Primary key.

weekday (int)
0 = Sunday
6 = Saturday.

start_time (time)

end_time (time)

slot_duration_minutes (int)

created_at (timestamptz)

---

# slots

Represents individual time slots.

Columns:

id (uuid)

slot_date (date)

start_time (time)

end_time (time)

state (appointment_status)

created_at (timestamptz)

---

# appointment_status (enum)

Values:

scheduled
completed
cancelled
no_show

---

# appointments

Represents a booking made by a user.

Columns:

id (uuid)

slot_id (uuid)
Foreign key → slots.id

user_id (uuid)
Foreign key → users.id

status (appointment_status)

notes (text)

created_at (timestamptz)

---

# Database Rules

* One slot can only have one appointment.
* Appointments must reference a valid slot.
* Slots represent availability.
* The frontend must not create appointments without checking slot availability.

---

# Indexing Strategy

Important indexes:

appointments(slot_id)

slots(slot_date)

slots(state)

These indexes allow fast queries for calendars.
