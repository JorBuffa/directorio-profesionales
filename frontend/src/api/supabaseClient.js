import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yklgdeumwxaoimlcttfz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrbGdkZXVtd3hhb2ltbGN0dGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTAzNzMsImV4cCI6MjA3MjA2NjM3M30._pWxKkHnBiSQhzdMtBXTHyvPoS33EsGzeS16Mm8R9Jo'

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan las credenciales de Supabase')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)