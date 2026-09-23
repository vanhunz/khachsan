// Placeholder CRUD service for future Supabase-backed booking storage.
import { supabaseClient } from './supabaseClient';

export async function createBooking(payload) {
  void supabaseClient;
  void payload;
  return { success: false, message: 'Supabase is not configured yet.' };
}

export async function updateBooking(id, payload) {
  void supabaseClient;
  void id;
  void payload;
  return { success: false, message: 'Supabase is not configured yet.' };
}

export async function getBookingById(id) {
  void supabaseClient;
  void id;
  return null;
}

export async function deleteBooking(id) {
  void supabaseClient;
  void id;
  return { success: false, message: 'Supabase is not configured yet.' };
}
