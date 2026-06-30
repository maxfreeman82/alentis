# TERANGA ALIGN - RÈGLES OBLIGATOIRES

## SOURCE DE VÉRITÉ

Le document `AMELIORATION_V3_1.md` est la seule source de vérité.

Aucune décision ne peut contredire ce document.

En cas de doute :
- arrêter le développement
- demander une clarification

Ne jamais inventer.

---

# RÈGLE N°1

Ne jamais modifier l'architecture.

Ne jamais simplifier un workflow.

Ne jamais supprimer une fonctionnalité.

Ne jamais remplacer une page par un modal.

Ne jamais fusionner plusieurs rôles.

---

# PARCOURS OBLIGATOIRES

L'application doit toujours respecter ce parcours.

Accueil

↓

Choix du profil

↓

Inscription

↓

Connexion

↓

Vérification Email

↓

Onboarding

↓

Dashboard correspondant

Il est interdit d'ouvrir directement un dashboard.

---

# LES 4 ESPACES SONT SÉPARÉS

1. Talent

2. Entreprise

3. Fondateur

4. Super Admin

Chaque espace possède :

- son onboarding
- son dashboard
- ses routes
- ses permissions
- son menu

Aucun mélange.

---

# AUTHENTIFICATION

Obligatoire :

✓ Landing Page

✓ Choix du profil

✓ Inscription

✓ Connexion

✓ Mot de passe oublié

✓ Vérification email

✓ Déconnexion

✓ Protection des routes

Sans connexion :

Aucun dashboard ne doit être accessible.

---

# DÉCONNEXION

Chaque dashboard possède obligatoirement :

- Profil
- Paramètres
- Déconnexion

Le bouton Déconnexion ne doit jamais disparaître.

---

# AVANT D'ÉCRIRE DU CODE

Toujours :

1. Lire AMELIORATION_V3_1.md

2. Comparer avec le projet

3. Identifier les différences

4. Corriger uniquement les différences

Ne jamais réécrire tout le projet.

---

# SI UNE PAGE EST DÉCRITE

Elle doit exister.

Si un bouton est décrit :

il doit exister.

Si un formulaire est décrit :

il doit exister.

Si une route est décrite :

elle doit exister.

---

# INTERDICTION

Ne jamais inventer :

- API
- Routes
- Tables
- Permissions
- Écrans
- Boutons
- Comportements

---

# EN CAS D'INCERTITUDE

Écrire :

"Je ne peux pas vérifier avec le code actuel."

Ne jamais deviner.

---

# AUDIT AVANT TOUTE MODIFICATION

Toujours produire :

- Pages manquantes

- Routes manquantes

- Boutons manquants

- Formulaires manquants

- Workflows cassés

- Permissions manquantes

Puis attendre la validation.

---

# DÉFINITION D'UNE FONCTIONNALITÉ TERMINÉE

Une fonctionnalité est terminée uniquement si :

✓ le parcours complet fonctionne

✓ les boutons fonctionnent

✓ la navigation fonctionne

✓ les permissions sont respectées

✓ aucun utilisateur n'accède à une page interdite

✓ le document est respecté

Sinon la fonctionnalité est considérée comme NON TERMINÉE.

---

# OBJECTIF

Le but n'est pas de produire du code rapidement.

Le but est de reproduire fidèlement AMELIORATION_V3_1.md.

La conformité au document est prioritaire sur toute optimisation, refactorisation ou amélioration UX.
