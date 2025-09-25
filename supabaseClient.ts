import { createClient } from '@supabase/supabase-js';

// PENTING: Ganti dengan URL Proyek dan Kunci API (anon) Anda dari dasbor Supabase.
const supabaseUrl = 'MASUKKAN_URL_SUPABASE_ANDA_DI_SINI';
const supabaseKey = 'MASUKKAN_KUNCI_ANON_SUPABASE_ANDA_DI_SINI';

if (!supabaseUrl || supabaseUrl === 'MASUKKAN_URL_SUPABASE_ANDA_DI_SINI') {
    console.error("Peringatan: URL Supabase belum diatur. Silakan atur di supabaseClient.ts");
}

if (!supabaseKey || supabaseKey === 'MASUKKAN_KUNCI_ANON_SUPABASE_ANDA_DI_SINI') {
    console.error("Peringatan: Kunci Supabase belum diatur. Silakan atur di supabaseClient.ts");
}


export const supabase = createClient(supabaseUrl, supabaseKey);
