import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qycehjnsonhotbqowlln.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Y2Voam5zb25ob3RicW93bGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ0OTgwMjQsImV4cCI6MjA0MDA3NDAyNH0.TxV31r6yGX7Ftmj5o8MxBKQYsnizSdUOxvObmRWoJy4';

export const supabase = createClient(supabaseUrl, supabaseKey); 