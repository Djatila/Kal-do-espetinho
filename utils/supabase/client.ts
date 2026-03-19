'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    'https://mtvehkyansdqiwpddwwa.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dmVoa3lhbnNkcWl3cGRkd3dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjA0NTcsImV4cCI6MjA3NDAzNjQ1N30.6nwYHvgW5KrYfVV-pSLEZicY-Nre6ZPoLLxJkc61WoU'
  )
}
