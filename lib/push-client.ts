export function clePush(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64 + '='.repeat((4 - base64.length % 4) % 4)), c => c.charCodeAt(0)).buffer;
}

export async function couperPushLocal() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  } catch { /* The browser may not support subscriptions. */ }
}

export async function deconnecterTourneo() {
  const { supabase } = await import('@/lib/supabase');
  const { estAndroid, desactiverAndroid } = await import('@/lib/android-push');
  if (estAndroid()) await desactiverAndroid().catch(() => {});
  try {
    const registration = await navigator.serviceWorker?.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      const result = await supabase.from('tourneo_push_abonnements').delete().eq('endpoint', subscription.endpoint);
      if (result.error) throw result.error;
      await subscription.unsubscribe();
    }
  } catch { await couperPushLocal(); }
  return supabase.auth.signOut();
}
