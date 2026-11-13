"use client";
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

export default function AlertesAndroidCompte() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    let present = true;
    async function reprendre() {
      const module = await import('@/lib/android-push');
      if (present) await module.reprendreAndroid().catch(() => {});
    }
    void reprendre();
    const { data } = supabase.auth.onAuthStateChange(event => {
      setTimeout(() => {
        if (!present) return;
        if (event === 'SIGNED_OUT') void import('@/lib/android-push').then(m => m.desactiverAndroid()).catch(() => {});
        else void reprendre();
      }, 0);
    });
    return () => { present = false; data.subscription.unsubscribe(); };
  }, []);
  return null;
}
