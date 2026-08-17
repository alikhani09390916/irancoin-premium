// js/supabase.js — Supabase Client for IRAN COIN
const SUPABASE_URL = 'https://ibnpgzmbepieudwalwtv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnBnem1iZXBpZXVkd2Fsd3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NDE5MzcsImV4cCI6MjEwMjQxNzkzN30.Ayeyo4ifmUr9kV6sCI_2-JtT81QxLL45znknrddoB5E';
const SUPABASE_FUNCTIONS_URL = SUPABASE_URL + '/functions/v1';

const IC = window.IC || {};
IC.supabase = { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, functionsUrl: SUPABASE_FUNCTIONS_URL };

IC.api = {
  async post(fn, body) {
    const res = await fetch(SUPABASE_FUNCTIONS_URL + '/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },
  async get(fn, token) {
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token || SUPABASE_ANON_KEY) };
    const res = await fetch(SUPABASE_FUNCTIONS_URL + '/' + fn, { headers });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  }
};
window.IC = IC;
