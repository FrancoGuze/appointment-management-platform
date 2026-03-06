# Coding Patterns

This document shows the preferred patterns for interacting with Supabase.

---

# Fetching Slots

Always use service functions.

Example:

services/slots.ts

export async function getAvailableSlots() {
const { data, error } = await supabase
.from("slots")
.select("*")
.gte("slot_date", new Date().toISOString())
.eq("state", "scheduled")
.order("slot_date")

if (error) throw error

return data
}

---

# Creating Appointments

services/appointments.ts

export async function createAppointment(slotId: string, userId: string) {

const { data, error } = await supabase
.from("appointments")
.insert({
slot_id: slotId,
user_id: userId,
status: "scheduled"
})

if (error) throw error

return data
}

---

# Component Usage

React components should call service functions.

Example:

const slots = await getAvailableSlots()
