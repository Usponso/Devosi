import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Client Supabase, ou null si le projet n'est pas configuré (.env.local) */
export const supabase = url && anonKey ? createClient(url, anonKey) : null
