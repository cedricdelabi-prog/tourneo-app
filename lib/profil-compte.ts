import type{User}from'@supabase/supabase-js';
import{supabase}from'@/lib/supabase';
// Initialize only this signed-in person's public display profile; never overwrite an existing profile.
export async function assurerProfilCompte(user:User){
 const r=await supabase.from('profiles').select('id,display_name').eq('id',user.id).maybeSingle();if(r.error)throw new Error('Votre profil n’a pas pu être préparé. Réessayez.');if(r.data)return r.data;
 const nom=String(user.user_metadata?.display_name||user.user_metadata?.full_name||'Spectateur').trim().slice(0,100)||'Spectateur';
 const c=await supabase.from('profiles').upsert({id:user.id,display_name:nom},{onConflict:'id',ignoreDuplicates:true});if(c.error)throw new Error('Votre profil n’a pas pu être préparé. Réessayez.');return{id:user.id,display_name:nom};
}
