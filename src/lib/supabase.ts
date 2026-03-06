import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublic = process.env.SUPABASE_PUBLIC;
const supabaseSecret = process.env.SUPABASE_SECRET;


if (!supabaseUrl || (!supabasePublic || !supabaseSecret)) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}


/* 
--------------------------------------------------------------------------------------------- 
                                      IMPORTANTE 
--------------------------------------------------------------------------------------------- 
El uso de la public key esta en que necesita cumplir con las politicas establecidas en supabase para funcionar, y esta pensada mas que nada para el us en frontend. 
Ej, si queremos ver los datos de nuestro usuario, y la politica define que el uuid debe ser igual al id de public.users, debemos cumplirlo
*/

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseSecret);
