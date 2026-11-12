"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useState } from 'react';
export default function OfflineV2() {
    useLangue();
    const [horsLigne, setHorsLigne] = useState(false);
    useEffect(() => {
        const etat = () => setHorsLigne(!navigator.onLine);
        etat();
        window.addEventListener('online', etat);
        window.addEventListener('offline', etat);
        if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production')
            navigator.serviceWorker.register('/sw-v2.js', { scope: '/' }).then(() => navigator.serviceWorker.ready).then(registration => {
                const ressources = performance.getEntriesByType('resource').map(r => r.name).filter(url => { const u = new URL(url); return u.origin === location.origin && u.pathname.startsWith('/_next/static/'); });
                registration.active?.postMessage({ type: 'CACHE_VISITED_PAGE', urls: [...new Set([location.href, ...ressources])] });
            }).catch(() => { });
        return () => { window.removeEventListener('online', etat); window.removeEventListener('offline', etat); };
    }, []);
    return horsLigne ? <div role="status" className="v2-offline">{tr("Hors connexion \u00B7 les r\u00E9sultats sont enregistr\u00E9s sur cet appareil. Gardez cet onglet ouvert jusqu\u2019\u00E0 la synchronisation.")}</div> : null;
}
