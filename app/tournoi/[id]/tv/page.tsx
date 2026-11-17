import EcranTV from '@/components/EcranTV';
export default async function Page({searchParams}:{searchParams:Promise<{ecran?:string}>}){
 const {ecran}=await searchParams;
 return <EcranTV ecran={ecran==='1'}/>;
}
