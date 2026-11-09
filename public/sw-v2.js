/* V2 only: cache app resources and visited page shells, never API/auth responses. */
const CACHE='tourneo-v2-shell-20261109-1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline-v2.html','/tourneo-icon.png'])));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tourneo-v2-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{if(response.ok){const copie=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,copie)));}return response;}).catch(async()=>await caches.match(request)||await caches.match('/offline-v2.html')));return;
  }
  if(url.pathname.startsWith('/_next/static/')||['/tourneo-icon.png','/tourneo-logo.png'].includes(url.pathname)){
    event.respondWith(caches.match(request).then(cache=>cache||fetch(request).then(response=>{if(response.ok){const copie=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,copie)));}return response;})));
  }
});
