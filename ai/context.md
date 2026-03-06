# Project Context

## Overview

This project is an appointment scheduling system built with **Next.js** and **Supabase**.

The system allows users to book appointments using a **slot-based scheduling model**.

Appointments are organized in discrete time slots generated from a weekly availability template.

The frontend communicates directly with Supabase using the official Supabase JavaScript client.

---

# Core Concepts

The scheduling system works with four main concepts:

1. Users
2. Availability Templates
3. Slots
4. Appointments

Slots represent the real time blocks that can be booked.

Appointments represent bookings made by users.

---

# Scheduling Model

The system works as follows:

1. A weekly availability template defines working hours.
2. From this template, slots are generated for real calendar days.
3. Each slot represents a single possible appointment.
4. Users can book a slot.
5. When a slot is booked, an appointment is created.

---

# Example Workflow

1. User opens the calendar page
2. Frontend fetches available slots from Supabase
3. Slots are displayed grouped by date
4. User selects a slot
5. Frontend creates an appointment
6. The slot becomes unavailable

---

# Important Business Rules

* One slot can only have **one appointment**
* Slots represent the canonical source of availability
* Appointments only reference slots
* Users cannot create appointments without a valid slot

---

# Frontend Behavior

The frontend should:

Fetch available slots:

* slot_date >= today
* state = scheduled

Display them in a calendar UI.

When a user selects a slot:

1. create an appointment
2. update slot state if needed
3. refresh the calendar.

---

# Future Features

Possible future additions:

* availability exceptions (holidays)
* service types
* multi-staff scheduling
* cancellation policies
