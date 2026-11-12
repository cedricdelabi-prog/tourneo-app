"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { supabase } from "@/lib/supabase";
import { urlPhotoPrivee } from "@/lib/media-prive";
export default function PhotoPrivee({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
}) {
    useLangue();
    const [photo, setPhoto] = useState({ reference: "", url: "" });
    useEffect(() => {
        let actif = true;
        const charger = async () => {
            const url = await urlPhotoPrivee(src);
            if (actif)
                setPhoto({ reference: src, url });
        };
        void charger();
        const timer = setInterval(() => void charger(), 50 * 60 * 1000);
        const { data } = supabase.auth.onAuthStateChange(() => {
            setPhoto({ reference: "", url: "" });
            // Defer the storage request outside the auth callback lock.
            setTimeout(() => { if (actif)
                void charger(); }, 0);
        });
        return () => { actif = false; clearInterval(timer); data.subscription.unsubscribe(); };
    }, [src]);
    if (photo.reference !== src || !photo.url)
        return <span role="img" aria-label={alt || tr("Photo privée")} style={props.style}>👤</span>;
    return <img {...props} src={photo.url} alt={alt || ""}/>;
}
