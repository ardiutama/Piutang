import { createClient } from '@supabase/supabase-js';

// PENTING: Ganti dengan URL Proyek dan Kunci API (anon) Anda dari dasbor Supabase.
const supabaseUrl = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptenRwa2p6bmxhcW5xYWh4ZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjA0MzUsImV4cCI6MjA3NDMzNjQzNX0.NxHHhRWL8_hAEypUTZBmyq6yY5oRrdh7RqwyOJuwxEk';
const supabaseKey = 'MASUKKAN_KUNCI_ANON_SUPABASE_ANDA_DI_SINI';

if (!supabaseUrl || supabaseUrl === 'https://zmztpkjznlaqnqahxdfm.supabase.co') {
    console.error("Peringatan: URL Supabase belum diatur. Silakan atur di supabaseClient.ts");
}

if (!supabaseKey || supabaseKey === 'F%W7?uiNw7Gaz9a') {
    console.error("Peringatan: Kunci Supabase belum diatur. Silakan atur di supabaseClient.ts");
}


export const supabase = createClient(supabaseUrl, supabaseKey);
