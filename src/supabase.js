import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// The real Wi-Fi IP address!
export const supabaseUrl = 'http://192.168.86.211:8000'; 

// THE NEW ANON KEY FROM JAMES
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzE0NzQzNjAwLCJleHAiOjIwMzAzMTk2MDB9.P_V-l_Xw_N-W_N_W_N_W_N_W_N_W_N_W_N_W_N_W_N_W';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});