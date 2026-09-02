import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fbgtqcogaykvdtysqmsz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZ3RxY29nYXlrdmR0eXNxbXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODU1MTgsImV4cCI6MjEwMzY2MTUxOH0.QiuLfAzfmEHIiwFKwy2b6IdAkqob9jD38UbCy1GxaLc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
