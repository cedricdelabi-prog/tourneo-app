import AccueilTournoiPublic from '@/components/AccueilTournoiPublic';
export const metadata={title:'Votre tournoi · Tourneo'};
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <AccueilTournoiPublic id={id}/>;}
