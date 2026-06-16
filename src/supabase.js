import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://irdkdylthdqizpwcdnfo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyZGtkeWx0aGRxaXpwd2NkbmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE3MjEsImV4cCI6MjA5NzA4NzcyMX0.YWv6WP_iayfSalxJ0lHE-pCgZo_YrBfctEfH41YC4oI'

export const supabase = createClient(supabaseUrl, supabaseKey)