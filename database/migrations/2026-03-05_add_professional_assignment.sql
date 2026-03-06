-- Adds professional assignment support for appointments.
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS professional_id uuid NULL REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_appointments_professional_id
ON public.appointments (professional_id);

CREATE INDEX IF NOT EXISTS idx_appointments_status_created_at
ON public.appointments (status, created_at DESC);
