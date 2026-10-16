// Adresse de retour des liens de réinitialisation envoyés par e-mail.
// Construite depuis le site courant : le lien ramène là où la demande a été
// faite, quel que soit le « Site URL » configuré dans Supabase (à condition que
// l'adresse figure dans ses Redirect URLs).
export function recoveryRedirectUrl(): string {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent('/nouveau-mot-de-passe')}`;
}
