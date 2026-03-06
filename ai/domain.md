# Domain Model

This project implements a slot-based appointment scheduling system.

---

# Key Entities

User
A person who can book appointments.

Slot
A block of time that can be booked.

Appointment
A reservation of a slot by a user.

Availability Template
Defines working hours for each weekday.

---

# System Logic

Availability Templates → generate → Slots

Slots → can be booked → Appointments

Appointments → reference → Users

---

# Example Scenario

Monday schedule:

09:00
10:00
11:00
12:00

These create four slots.

If a user books 10:00:

Slot 10:00 → becomes unavailable
Appointment → created

---

# Important Constraints

* One slot → one appointment
* Slots represent availability
* Appointments represent bookings
* Slots should exist before booking
