/* V2 only: cache app resources and visited page shells, never API/auth responses. */
const CACHE='tourneo-v2-shell-20261113-1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline-v2.html','/tourneo-icon.png','/tourneo-officiel.png'])));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tourneo-v2-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{if(response.ok){const copie=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,copie)));}return response;}).catch(async()=>await caches.match(request)||await caches.match('/offline-v2.html')));return;
  }
  if(url.pathname.startsWith('/_next/static/')||['/tourneo-icon.png','/tourneo-logo.png','/tourneo-officiel.png'].includes(url.pathname)){
    event.respondWith(caches.match(request).then(cache=>cache||fetch(request).then(response=>{if(response.ok){const copie=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,copie)));}return response;})));
  }
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  let url;
  try {
    url=new URL(event.notification.data?.url,self.location.origin);
    if(!lienAlerte(url))return;
  } catch { return; }
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
    const ouvert=windows.find(client=>new URL(client.url).pathname===url.pathname);
    if(ouvert){await ouvert.navigate(url.href);return ouvert.focus();}
    return self.clients.openWindow(url.href);
  }));
});

self.addEventListener('message',event=>{
  if(event.data?.type!=='CACHE_VISITED_PAGE'||!Array.isArray(event.data.urls))return;
  const urls=event.data.urls.slice(0,200).filter(value=>{try{const u=new URL(value);return u.origin===self.location.origin&&!u.pathname.startsWith('/api/')&&!u.pathname.startsWith('/auth/');}catch{return false;}});
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(urls.map(url=>fetch(url,{credentials:'same-origin'}).then(response=>{if(response.ok)return cache.put(url,response);})))));
});

function lienAlerte(u){return u.origin===self.location.origin&&!u.search&&((u.pathname==='/activite'&&!u.hash)||(/^\/partage\/[^/]+$/.test(u.pathname)&&/^#match-\d+$/.test(u.hash)));}
self.addEventListener('push',event=>{let p;try{p=event.data.json();}catch{return;}let u;try{u=new URL(p.url,self.location.origin);}catch{return;}if(!lienAlerte(u))return;event.waitUntil(self.registration.showNotification('Tourneo',{body:typeof p.body==='string'?p.body.slice(0,240):'Tourneo',icon:'/tourneo-icon.png',tag:typeof p.tag==='string'?p.tag.slice(0,64):'tourneo',data:{url:u.pathname+u.hash}}));});
