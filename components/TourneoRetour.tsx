import Link from 'next/link';
type Props = { children: React.ReactNode } & ({ href: string; onClick?: never } | { href?: never; onClick: () => void });
export default function TourneoRetour({ href, onClick, children }: Props) {
  const contenu = <><span className="tourneo-back-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6"/></svg></span><span>{children}</span></>;
  return href !== undefined ? <Link href={href} className="tourneo-back-link">{contenu}</Link> : <button type="button" onClick={onClick} className="tourneo-back-link">{contenu}</button>;
}
