import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Tus credenciales reales de Supabase para Bodega Valentino
const SUPABASE_URL = 'https://ziorhfqxowzhwqqsfxve.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JDnQT3CHNIpAXCHYwPng1w_WqFmoY5q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);