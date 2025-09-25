import { createClient } from '@supabase/supabase-js';

// URL Proyek Anda dari dasbor Supabase
const supabaseUrl = 'https://zmztpkjznlaqnqahxdfm.supabase.co';

// Kunci API (anon) Anda dari dasbor Supabase
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptenRwa2p6bmxhcW5xYWh4ZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjA0MzUsImV4cCI6MjA3NDMzNjQzNX0.NxHHhRWL8_hAEypUTZBmyq6yY5oRrdh7RqwyOJuwxEk';


// Validasi sederhana untuk memastikan kredensial telah diisi
if (!supabaseUrl || !supabaseKey) {
    console.error("Peringatan: Kredensial Supabase (URL atau Kunci) belum diatur dengan benar di supabaseClient.ts. Aplikasi mungkin tidak akan berfungsi.");
}


export const supabase = createClient(supabaseUrl, supabaseKey);
