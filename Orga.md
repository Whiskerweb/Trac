# Orga.md — Architecture Organisations Traaaction

> Document vivant. Mis a jour a chaque iteration.
> Objectif : definir une architecture finale fonctionnelle pour le systeme d'organisations.

---

## 1. VISION

Un **seller** peut creer une **organisation** (= equipe d'affilies).
Le **leader** de l'organisation negocie des deals avec les startups, gere ses membres, et touche un pourcentage sur chaque vente.

**Principe cle** : Contrairement aux ventes classiques ou la plateforme facture 15% EN PLUS de la commission, dans le cadre d'une organisation, les **15% Traaaction sont INCLUS dans le deal negocie**.

La startup configure une mission d'organisation exactement comme une mission marketplace (choix de la structure : %, flat, lead, recurring). La seule difference est le calcul des fees.

---

## 2. MODELE DE COMMISSION ORGANISATION

### 2.1 Vente classique (hors org) — pour comparaison

```
Startup configure mission : reward = 30%
Client achete 100€ HT

→ Seller recoit :  30% de 100€ = 30€
→ Traaaction prend : 15% de 100€ = 15€ (facture a la startup EN PLUS)
→ Startup paye au total : 30€ + 15€ = 45€
```

La startup paye la commission seller + la platform fee separement.

### 2.2 Vente organisation — COMMISSION EN POURCENTAGE

```
Startup negocie avec le leader : deal = 40% (TOUT COMPRIS)

Decomposition du 40% :
├── 15% → Traaaction (15 points de % sur le HT, non-negociable)
└── 25% → Organisation
    ├── 5% → Leader (decide par le leader a l'acceptation)
    └── 20% → Membre (ce que chaque seller voit et gagne)

Client achete 100€ HT via le lien d'un membre :

→ Membre recoit :    20€ (20% de 100€ HT)
→ Leader recoit :     5€ (5% de 100€ HT)
→ Traaaction recoit : 15€ (15% de 100€ HT)
→ Total startup paye : 40€ (exactement le deal negocie)
```

**Calcul platform fee (%)** : Traaaction prend 15% du montant HT de la vente.

### 2.3 Vente organisation — COMMISSION FLAT

```
Startup configure mission : reward = 10€ flat par vente

Decomposition du 10€ :
├── 1.50€ → Traaaction (15% de 10€)
└── 8.50€ → Organisation
    ├── 1.50€ → Leader (decide par le leader)
    └── 7.00€ → Membre (ce que chaque seller voit)

Client achete via le lien d'un membre :

→ Membre recoit :    7.00€
→ Leader recoit :    1.50€
→ Traaaction recoit : 1.50€
→ Total startup paye : 10€ (exactement le reward configure)
```

**Calcul platform fee (flat)** : Traaaction prend 15% du montant flat du reward.

### 2.4 Regles

| Regle | Detail |
|-------|--------|
| **Platform fee (%)** | 15 points de % du HT, preleves dans le deal total |
| **Platform fee (flat)** | 15% du montant flat, preleve dans le reward |
| **Deal minimum (%)** | > 15% (sinon rien pour l'org) |
| **Deal minimum (flat)** | > 0€ (le 15% est toujours prelevable) |
| **Leader cut** | Decide par le leader a l'acceptation, immutable ensuite |
| **Member reward** | Auto-calcule : deal - platform_fee - leader_cut |
| **Startup paye** | Exactement le deal negocie (pas un centime de plus) |
| **Affichage member** | Le seller voit uniquement son reward net |
| **Hold period** | 30 jours (SALE/RECURRING), 3 jours (LEAD) |
| **Immutabilite** | Deal accepte = verrouille. Pas de modification apres. |

### 2.5 Exemples — Pourcentage

**Exemple 1 — Deal genereux (50%)**
```
Deal total : 50%
Traaaction : 15%
Reste org  : 35%
Leader cut : 10%
Member     : 25%  ← ce que le seller voit
```

**Exemple 2 — Deal serre (20%)**
```
Deal total : 20%
Traaaction : 15%
Reste org  : 5%
Leader cut : 2%
Member     : 3%  ← ce que le seller voit
```

**Exemple 3 — Leader altruiste (40%, 0% leader)**
```
Deal total : 40%
Traaaction : 15%
Reste org  : 25%
Leader cut : 0%
Member     : 25%  ← le leader ne prend rien
```

### 2.6 Exemples — Flat

**Exemple 4 — Lead flat (5€)**
```
Deal total : 5€ par lead
Traaaction : 0.75€ (15% de 5€)
Reste org  : 4.25€
Leader cut : 0.75€
Member     : 3.50€  ← ce que le seller voit
```

**Exemple 5 — Sale flat (50€)**
```
Deal total : 50€ par vente
Traaaction : 7.50€ (15% de 50€)
Reste org  : 42.50€
Leader cut : 10€
Member     : 32.50€  ← ce que le seller voit
```

---

## 3. DECISIONS VALIDEES

| # | Question | Decision | Raison |
|---|----------|----------|--------|
| 1 | Support FLAT + % ? | **OUI, les deux** | La startup configure sa mission comme d'habitude (%, flat, lead, recurring). La structure est heritee. |
| 2 | Leader peut modifier son cut apres acceptation ? | **NON, immutable** | Simplicite, confiance. Les missions peuvent avoir une duree limitee. |
| 3 | Startup peut modifier le deal apres proposition ? | **NON** | Deal fait = deal fait. La startup peut **annuler** l'arrangement, mais doit d'abord regler toutes les ventes en cours. |
| 4 | Afficher les 15% au startup ? | **OUI, explicitement** | "15% platform fee included" — visuel, sobre, explicite. La startup doit comprendre. |
| 5 | Recurring : meme deal tous les mois ? | **OUI** | Meme split pour tous les mois. Depend de la config mission (duree, etc.). |

---

## 4. NOTIFICATIONS

### 4.1 Notifications a implementer

| Evenement | Destinataires | Message |
|-----------|--------------|---------|
| Org accepte une mission | Tous les membres ACTIVE | "Nouvelle mission disponible : {titre}. Commission : {memberReward}." |
| Startup annule un arrangement | Tous les membres ACTIVE + leader | "La mission {titre} a ete annulee par la startup." |
| Membre rejoint l'org | Leader | "{sellerName} a rejoint votre organisation." |
| Membre quitte l'org | Leader | "{sellerName} a quitte votre organisation." |
| Org approuvee par admin | Leader | "Votre organisation {name} a ete approuvee." (deja fait) |
| Org rejetee par admin | Leader | "Votre demande pour {name} a ete refusee." (deja fait) |

### 4.2 Annulation de mission par la startup

**Flux :**
```
1. Startup clique "Annuler l'arrangement" dans /dashboard/sellers/groups/[orgId]
2. Guard : verifier s'il y a des commissions PENDING ou PROCEED non payees
   → Si oui : "Vous devez d'abord regler les commissions en cours (X€)"
   → Si non : proceder
3. OrganizationMission.status → CANCELLED (nouveau status)
4. Notification a tous les membres + leader
5. Les MissionEnrollment org restent (historique) mais ShortLinks desactives
6. Les commissions deja COMPLETE sont preservees
```

> **Nouveau status necessaire** : `CANCELLED` dans OrgMissionStatus

---

## 5. ETAT ACTUEL DU CODE (audit Fevrier 2026)

### 5.1 Schema Prisma (ce qui existe)

```prisma
model Organization {
  id, name, description, logo_url
  leader_id          → Seller
  status             OrganizationStatus (PENDING | ACTIVE | SUSPENDED | REJECTED)
  visibility         OrganizationVisibility (PUBLIC | PRIVATE | INVITE_ONLY)
  slug               String? @unique
  invite_code        String? @unique
  motivation, estimated_audience
  Members            OrganizationMember[]
  Missions           OrganizationMission[]
}

model OrganizationMember {
  organization_id, seller_id
  status    OrgMemberStatus (PENDING | ACTIVE | REMOVED)
  invited_by  String?
  @@unique([organization_id, seller_id])
}

model OrganizationMission {
  organization_id, mission_id
  total_reward          String       // "40%" ou "10€"
  leader_reward         String       // "5%" ou "1.50€"  ← A RENDRE NULLABLE
  member_reward         String       // "20%" ou "7€"    ← A RENDRE NULLABLE
  leader_reward_structure  RewardStructure  ← A SUPPRIMER (herite de la mission)
  member_reward_structure  RewardStructure  ← A SUPPRIMER (herite de la mission)
  status      OrgMissionStatus (PROPOSED | ACCEPTED | REJECTED)  ← AJOUTER CANCELLED
  proposed_by String
  accepted_at DateTime?
  @@unique([organization_id, mission_id])
}

// Champs org sur Commission :
org_parent_commission_id  String?
organization_mission_id   String?

// Champ org sur MissionEnrollment :
organization_mission_id   String?
```

### 5.2 Commission Engine actuel (ce qui DOIT CHANGER)

**Probleme** : Le code actuel calcule la platform_fee EN PLUS du member_reward.

```typescript
// ACTUEL dans createOrgCommissions() :
// Member commission :
//   commission_amount = memberReward% de HT (ex: 25% = 25€)
//   platform_fee = 15% de HT (ex: 15€)  ← FACTURE EN PLUS
// Leader commission :
//   commission_amount = leaderReward% de HT (ex: 5€)
//   platform_fee = 0
// Total startup paye = 25 + 15 + 5 = 45€ sur 100€ HT ← TROP
```

**Ce qu'on veut** : La platform_fee est DANS le deal.

```typescript
// CIBLE POURCENTAGE :
// Deal total = 40% de HT = 40€
// Platform fee = 15% de HT = 15€ (prelevee sur le deal, pas en plus)
// Member commission = 20% de HT = 20€
// Leader commission = 5% de HT = 5€
// Total = 20 + 5 + 15 = 40€ ← exactement le deal

// CIBLE FLAT :
// Deal total = 10€
// Platform fee = 15% de 10€ = 1.50€
// Member commission = 7€
// Leader commission = 1.50€
// Total = 7 + 1.50 + 1.50 = 10€ ← exactement le deal
```

### 5.3 Server Actions (37 fonctions)

| Categorie | Fonctions | Etat |
|-----------|-----------|------|
| **Lifecycle org** | applyToCreateOrg, getMyOrganizations, getOrganizationDetail | OK |
| **Gestion membres** | inviteMemberToOrg, applyToJoinOrg, approveOrgMember, removeOrgMember, leaveOrganization | OK |
| **Propositions startup** | proposeOrgMission, getOrgMissionProposals, getActiveOrganizationsForStartup | A modifier (1 champ au lieu de 3) |
| **Accept/Reject leader** | acceptOrgMission, rejectOrgMission, getOrgMissionProposalsForLeader | A modifier (leader choisit son cut) |
| **Browse seller** | getActiveOrganizations, getOrganizationBySlug, joinOrgByInviteCode | OK |
| **Settings/Stats** | updateOrganizationSettings, getOrganizationStats, getOrganizationCommissions | OK |
| **Public** | getPublicOrganization, getOrgByInviteCode | OK |
| **Auto-enrollment** | enrollMembersInOrgMission, enrollSingleMemberInMission | OK |
| **NOUVEAU** | cancelOrgMission (startup annule) | A creer |

### 5.4 Webhook (ce qui marche)

| Event | Gestion org | Etat |
|-------|-------------|------|
| checkout.session.completed | Detecte org enrollment → createOrgCommissions | Calcul fees a changer |
| invoice.paid | Recurring mois 2+ → createOrgCommissions | Calcul fees a changer |
| charge.refunded | Cascade clawback (member + leader) | OK |
| customer.subscription.deleted | Delete PENDING commissions | OK |

### 5.5 UI Pages (ce qui existe)

**Seller side (10 pages) :**
```
/seller/organizations              → Browse orgs
/seller/organizations/[slug]       → Detail org + join
/seller/organizations/my           → Mes orgs
/seller/organizations/apply        → Creer une org
/seller/manage/[orgId]             → Overview (leader/member)
/seller/manage/[orgId]/members     → Gestion membres
/seller/manage/[orgId]/missions    → Propositions + missions actives
/seller/manage/[orgId]/commissions → Commissions (leader only)
/seller/manage/[orgId]/settings    → Parametres (leader only)
```

**Startup side (2 pages) :**
```
/dashboard/sellers/groups          → Liste des orgs actives
/dashboard/sellers/groups/[orgId]  → Detail org + propose mission
```

**Admin side (2 pages) :**
```
/admin/organizations               → Approve/reject/suspend
/admin/organizations/[orgId]       → Detail complet
```

**Public (2 pages) :**
```
/org/[slug]                        → Page publique
/org/join/[code]                   → Lien invite
```

---

## 6. FLUX COMPLETS

### 6.1 Creation d'organisation

```
Seller (APPROVED) → /seller/organizations/apply
  → Remplit : nom, description, motivation, audience estimee
  → Status : PENDING

Admin → /admin/organizations
  → Review motivation + profil leader
  → Approuve → ACTIVE
  → 📩 Leader notifie "Organisation approuvee"

Leader → /seller/manage/[orgId]
  → Dashboard actif, peut inviter des membres
```

### 6.2 Gestion des membres

```
Leader invite seller@email.com
  → OrganizationMember (PENDING, invited_by = leader.id)
  → Seller voit l'invitation

Seller postule org PUBLIC → Auto-approve + auto-enrollment
Seller postule org PRIVATE → PENDING → Leader approve → ACTIVE + auto-enrollment
Seller invite link /org/join/[code] → Auto-approve + auto-enrollment (bypass visibilite)

📩 Leader notifie a chaque nouveau membre
```

### 6.3 Proposition et acceptation de mission

```
Startup → /dashboard/sellers/groups/[orgId]
  → Choisit une mission existante (deja configuree : %, flat, lead, recurring)
  → La mission a un reward (ex: "40%" ou "10€")
  → Ce reward DEVIENT le deal total de l'org mission
  → UI affiche clairement : "15% platform fee included"
  → OrganizationMission (status=PROPOSED, total_reward="40%")

Leader → /seller/manage/[orgId]/missions
  → Voit la proposition :
    ┌────────────────────────────────────────────┐
    │ Mission X — Deal propose : 40%             │
    │ 15% Traaaction (inclus)                    │
    │ 25% disponible pour l'organisation         │
    │                                            │
    │ Votre part : [____5%____] (slider/input)   │
    │                                            │
    │ → Vos membres gagnent : 20%                │
    │                                            │
    │ [Accepter]  [Refuser]                      │
    └────────────────────────────────────────────┘
  → Definit son cut : 5%
  → member_reward auto = 25% - 5% = 20%
  → Accepte → VERROUILLE

  → Auto-enrollment tous les membres ACTIVE :
    - ShortLink cree
    - Redis entry
    - MissionEnrollment (organization_mission_id set)

  📩 Tous les membres notifies "Nouvelle mission : {titre} — {memberReward} commission"
```

### 6.4 Vente et commissions (pourcentage)

```
Client clique lien membre → achete 100€ HT

Webhook checkout.session.completed :
  1. Attribution : lien → membre
  2. Detection org : enrollment.organization_mission_id → non-null
  3. Config : dealTotal=40%, leaderCut=5%
  4. Calcul :
     dealAmount    = 100€ * 40% = 40€
     platformFee   = 100€ * 15% = 15€
     leaderAmount  = 100€ * 5%  = 5€
     memberAmount  = 40 - 15 - 5 = 20€
  5. Commission membre : amount=20€, platform_fee=15€, sale_id="cs_xxx"
  6. Commission leader : amount=5€, platform_fee=0, sale_id="cs_xxx:orgcut"
  7. Update SellerBalance x2
```

### 6.5 Vente et commissions (flat)

```
Mission : 10€ flat par vente
Client achete via lien membre

Webhook :
  dealAmount    = 10€
  platformFee   = 10€ * 15% = 1.50€
  leaderAmount  = 1.50€ (decide par leader)
  memberAmount  = 10 - 1.50 - 1.50 = 7€

  Commission membre : amount=7€, platform_fee=1.50€
  Commission leader : amount=1.50€, platform_fee=0
```

### 6.6 Recurring (abonnements)

```
Mois 1 : checkout.session.completed (subscription detectee)
  → Meme logique que 6.4/6.5 avec commissionSource = RECURRING

Mois 2+ : invoice.paid
  → countRecurringCommissions(subscriptionId) [exclut :orgcut]
  → Si < recurringMax → createOrgCommissions (meme split)
  → recurringMonth = existingCount + 1
  → Meme deal pour tous les mois

Annulation : customer.subscription.deleted
  → Supprime PENDING du subscription_id

Refund : charge.refunded
  → Cascade : supprime member + leader commission
  → Si COMPLETE : solde negatif aux deux
```

### 6.7 Annulation de mission par la startup

```
Startup → /dashboard/sellers/groups/[orgId]
  → Clique "Annuler l'arrangement" sur une mission ACCEPTED

Guard :
  → Commissions PROCEED + UNPAID ? → "Reglez d'abord les X€ en attente"
  → Si rien a regler (ou tout paye) → proceder

Actions :
  1. OrganizationMission.status → CANCELLED
  2. Desactiver les ShortLinks lies (ou les laisser mais ne plus creer de commission)
  3. 📩 Notifier leader + tous membres ACTIVE : "Mission {titre} annulee"
  4. Les commissions COMPLETE sont preservees (deja payees)
  5. Les commissions PENDING sont supprimees + SellerBalance recalcule
```

### 6.8 Paiement startup → plateforme

```
HORS ORG :
  Startup paye : commission_amount + platform_fee (fees en plus)

ORG :
  Startup paye : commission_amount + platform_fee
  MAIS la somme = exactement le deal total (fees DANS le deal)
  → Transparent pour la startup, meme flow de paiement
```

---

## 7. CE QUI DOIT CHANGER

### 7.1Schema Prisma

```prisma
// OrganizationMission — modifications :
model OrganizationMission {
  total_reward    String         // Propose par startup (ex: "40%" ou "10€")
  leader_reward   String?        // Defini par leader a l'acceptation (ex: "5%" ou "1.50€")
  member_reward   String?        // Auto-calcule a l'acceptation (ex: "20%" ou "7€")
  // SUPPRIMER : leader_reward_structure, member_reward_structure
  // RAISON : la structure (% ou flat) est heritee de la mission elle-meme
  status          OrgMissionStatus  // AJOUTER : CANCELLED
}

// Enum :
enum OrgMissionStatus {
  PROPOSED
  ACCEPTED
  REJECTED
  CANCELLED    // ← NOUVEAU
}
```

### 7.2Commission Engine — `createOrgCommissions()`

**Logique actuelle** : platform_fee facturee EN PLUS du deal
**Logique cible** : platform_fee prelevee DANS le deal

```typescript
// POURCENTAGE :
const dealPct = parsePct(dealTotal)          // 40
const platformFeePct = 15                     // fixe
const leaderPct = parsePct(leaderCut)        // 5
const memberPct = dealPct - platformFeePct - leaderPct  // 20

const memberAmount = htAmount * (memberPct / 100)
const leaderAmount = htAmount * (leaderPct / 100)
const platformFee = htAmount * (platformFeePct / 100)

// FLAT :
const dealFlat = parseFlat(dealTotal)        // 1000 (centimes, 10€)
const platformFee = Math.round(dealFlat * 0.15)  // 150 (1.50€)
const leaderAmount = parseFlat(leaderCut)    // 150 (1.50€)
const memberAmount = dealFlat - platformFee - leaderAmount  // 700 (7€)
```

### 7.3Server Actions

| Action | Modification |
|--------|-------------|
| `proposeOrgMission()` | Accepter seulement `totalReward` (herite de mission.reward) |
| `acceptOrgMission()` | Accepter `leaderCut`, calculer `memberReward`, verrouiller |
| `cancelOrgMission()` | **NOUVEAU** : startup annule, guards, notifications |
| `getOrgMissionConfig()` | Retourner dealTotal + leaderCut (member calcule a la volee) |

### 7.4UI Startup — Proposition

```
AVANT : 3 champs (total, leader, member) — confus
APRES : La mission a deja son reward configure.
        La startup selectionne une mission → le deal = mission.reward
        Affichage clair : "40% total — 15% platform fee included — 25% for the org"
        + Bouton "Annuler l'arrangement" sur les missions ACCEPTED
```

### 7.5UI Leader — Acceptation

```
AVANT : Accept/Reject sans choix du cut
APRES : Modal/section avec :
  - Deal total affiche (ex: 40% ou 10€)
  - Breakdown : -15% Traaaction = 25% pour l'org
  - Input/slider : "Votre part" (leader cut)
  - Preview temps reel : "Vos membres gagnent : X%"
  - Guard : leader_cut ne peut pas depasser org_share
  - Accept = verrouille definitif
```

### 7.6Webhook

Le webhook appelle `createOrgCommissions()`. La seule modification est dans le calcul interne (platform_fee DANS le deal au lieu de EN PLUS). Le code webhook lui-meme ne change pas de structure.

---

## 8. PLAN D'IMPLEMENTATION

### Phase 1 — Schema + Backend

1. **Schema Prisma** :
   - `leader_reward` et `member_reward` → nullable (String?)
   - Supprimer `leader_reward_structure` et `member_reward_structure`
   - Ajouter `CANCELLED` dans OrgMissionStatus
   - `npm run db:push && npm run db:generate`

2. **Commission engine** (`lib/commission/engine.ts`) :
   - Refactor `createOrgCommissions()` : platform_fee DANS le deal
   - Supporter % et flat
   - Validations : deal > fees, member > 0

3. **Server actions** (`app/actions/organization-actions.ts`) :
   - `proposeOrgMission()` : 1 seul param `totalReward`
   - `acceptOrgMission(orgMissionId, leaderCut)` : calcule member, verrouille
   - `cancelOrgMission(orgMissionId)` : **nouveau**, guards + notifications
   - Validations server-side partout

4. **getOrgMissionConfig()** : retourne deal + leader_cut + structure (% ou flat)

### Phase 2 — UI Startup

5. **Proposition** (`/dashboard/sellers/groups/[orgId]`) :
   - Mission selector → deal = mission.reward
   - Affichage breakdown 15% fee explicite
   - Preview "Organization receives X%"

6. **Annulation** : bouton "Cancel arrangement" sur missions ACCEPTED
   - Guard si commissions impayees
   - Confirmation dialog

### Phase 3 — UI Leader

7. **Acceptation** (`/seller/manage/[orgId]/missions`) :
   - Breakdown visuel du deal
   - Input leader cut avec preview membre en temps reel
   - Guard : cut <= org_share

8. **Dashboard** : afficher breakdown correct dans les stats

### Phase 4 — Notifications + Polish

9. Notifications pour : accept mission, cancel mission, nouveau membre
10. Badge "org" sur les commissions dans wallet/payouts
11. Affichage correct des member rewards partout

### Phase 5 — Tests

12. Adapter les 146 tests existants si necessaire
13. Tester : % deals, flat deals, recurring, clawback, cancel

---

## 9. FICHIERS CONCERNES

```
prisma/schema.prisma                               → OrgMission nullable fields + CANCELLED enum
lib/commission/engine.ts                            → createOrgCommissions, getOrgMissionConfig
app/api/webhooks/[endpointId]/route.ts              → Appels org dans checkout + invoice
app/actions/organization-actions.ts                 → proposeOrgMission, acceptOrgMission, cancelOrgMission (new)
app/dashboard/sellers/groups/[orgId]/page.tsx        → UI startup propose + cancel
app/seller/manage/[orgId]/missions/page.tsx          → UI leader accept avec cut + member view
app/seller/manage/[orgId]/page.tsx                   → Member dashboard (affiche reward)
app/seller/manage/[orgId]/commissions/page.tsx       → Leader commissions view
messages/{en,fr,es}.json                             → Traductions notifications + UI
```

---

## 10. VALIDATION CHECKLIST

Avant de considerer l'implementation comme terminee :

- [x] Schema migre (nullable fields, CANCELLED enum) — **FAIT Phase 1**
- [x] `createOrgCommissions()` : fees DANS le deal (% + flat) — **FAIT Phase 1**
- [x] `proposeOrgMission()` : 1 seul param — **FAIT Phase 1**
- [x] `acceptOrgMission()` : leader choisit son cut, member auto-calcule — **FAIT Phase 1**
- [x] `cancelOrgMission()` : guards + cleanup + notifications — **FAIT Phase 1** (notifications = TODO Phase 4)
- [x] UI Startup : proposition simplifiee, breakdown 15% visible, bouton cancel — **FAIT Phase 2**
- [x] UI Leader : acceptation avec cut input + preview — **FAIT Phase 3**
- [x] UI Membres : reward correct affiche — **FAIT Phase 3**
- [x] Notifications : accept mission, cancel mission, nouveau membre, member left, member removed — Phase 4
- [ ] Webhook : calcul correct sur ventes reelles — Backend OK, a tester en prod
- [ ] Recurring : meme split chaque mois — Backend OK (meme createOrgCommissions)
- [ ] Clawback : cascade OK (member + leader) — Inchange, deja fonctionnel
- [ ] Tests passent — Phase 5

---

## 11. CHANGELOG

### Phase 1 — Schema + Backend (Fevrier 2026)

**Schema Prisma** :
- `OrganizationMission.leader_reward` : `String` → `String?` (null quand PROPOSED)
- `OrganizationMission.member_reward` : `String` → `String?` (null quand PROPOSED, auto-calcule a l'acceptation)
- Supprime : `leader_reward_structure`, `member_reward_structure`
- Ajoute : `CANCELLED` dans `OrgMissionStatus`

**Commission Engine** (`lib/commission/engine.ts`) :
- `getOrgMissionConfig()` retourne `totalReward` + `leaderReward` (plus `memberReward`)
- `createOrgCommissions()` reecrit : platform fee DANS le deal
  - Pourcentage : `memberPct = dealPct - 15 - leaderPct`
  - Flat : `memberFlat = dealFlat - 15% dealFlat - leaderFlat`
  - Ne delegue plus a `createCommission()` (evite double platform fee)
  - Recurring limit enforcement integre

**Webhook** (`app/api/webhooks/[endpointId]/route.ts`) :
- 3 call sites mis a jour : `memberReward` → `totalReward`

**Server Actions** (`app/actions/organization-actions.ts`) :
- `proposeOrgMission({ orgId, missionId, totalReward })` — 1 seul param reward
- `acceptOrgMission(orgMissionId, leaderCut)` — leader definit son cut, member auto-calcule
- `cancelOrgMission(orgMissionId)` — NOUVEAU : annulation par startup avec guards

**UI (minimal pour compilation)** :
- Startup `/dashboard/sellers/groups/[orgId]` : formulaire 1 champ + "15% included"
- Seller `/seller/manage/[orgId]/missions` : input leaderCut + breakdown deal
- Types nullable fixes : `marketplace.ts`, `seller/page.tsx`, admin page

**Build** : `npm run build` OK sans erreur.

### Phase 2 — UI Startup (Fevrier 2026)

**Data** (`app/actions/organization-actions.ts`) :
- `getActiveOrganizationsForStartup()` : inclut maintenant `total_reward`, `leader_reward`, `member_reward`, `accepted_at`, `Mission.title`, `Mission.reward`, `Mission.gain_type`

**Page org detail** (`app/dashboard/sellers/groups/[orgId]/page.tsx`) — reecrite :
- Mission selector : utilise `getWorkspaceMissions()` (server action), auto-filtre missions deja proposees
- Auto-fill `totalReward` depuis `mission.reward` quand on selectionne une mission
- Deal breakdown en temps reel dans le modal : total → -15% platform → org receives
- Validation : deal > 15% pour pourcentage, preview "org receives X%"
- Info box violet : "15% platform fee is included in the deal"
- Error handling : `proposeError` affiche
- Missions groupees par status : ACCEPTED (avec cancel), PROPOSED (en attente), REJECTED/CANCELLED (historique)
- Bouton "Cancel arrangement" sur missions ACCEPTED : confirmation inline avec texte explicatif
- `cancelOrgMission()` appele avec loading state + error handling
- Design : cards rounded-2xl, badges status colores, gradient avatar placeholder

**Build** : `npm run build` OK sans erreur.

### Phase 3 — UI Leader (Fevrier 2026)

**Missions page** (`app/seller/manage/[orgId]/missions/page.tsx`) — reecrite :
- Separee en 3 composants : `MemberMissionsView`, `LeaderMissionsView`, main export
- **Leader — Proposals** : card complete avec :
  - Deal breakdown visuel (total → -15% Traaaction → org share)
  - Input leader cut dans section grise separee
  - Preview temps reel "Members will earn X%" en vert/rouge
  - Guard : cut > org share → message erreur + bouton disabled
  - "Accept & Lock Deal" + "Decline" (texte clair sur l'immutabilite)
  - Info text : "Once accepted, the deal is locked"
- **Leader — Active** : cards avec breakdown compact (Deal | Platform | You | Members)
- **Leader — Past** : CANCELLED + REJECTED en opacity reduite
- **Member — Active** : banner emerald proeminente "Your commission: X%"
- **Member — Cancelled** : section grisee avec explication

**Overview page** (`app/seller/manage/[orgId]/page.tsx`) :
- Member dashboard : missions actives avec banner emerald "Your commission: X%" (plus lisible)

**Build** : `npm run build` OK sans erreur.

### Phase 4 — Notifications (Fevrier 2026)

**Nouveau fichier** : `lib/org-notifications.ts` — module partage de notifications :
- Extraction des helpers depuis `admin-org-actions.ts` : `sendSupportMessage()`, `getSellerLocale()`, `getOrCreateSupportWorkspace()`
- Templates i18n existants : `ORG_MESSAGES` (approved, rejected, suspended, reactivated)
- Nouveaux templates i18n : `ORG_MISSION_MESSAGES` (mission_accepted, mission_cancelled)
- Nouveaux templates i18n : `ORG_MEMBER_MESSAGES` (member_joined, member_left, member_removed)
- Fonctions haut-niveau exportees :
  - `notifyMembersOfMissionAccepted(orgId, orgName, missionTitle, memberReward)` — notifie tous les membres actifs
  - `notifyOfMissionCancelled(orgId, leaderId, orgName, missionTitle)` — notifie leader + tous les membres
  - `notifyLeaderOfNewMember(leaderId, orgName, sellerName)` — notifie le leader
  - `notifyLeaderOfMemberLeft(leaderId, orgName, sellerName)` — notifie le leader
  - `notifyMemberRemoved(sellerId, orgName)` — notifie le membre retire
  - `notifyOrgLeader(org, action)` — notifications admin (approved/rejected/etc.)

**`admin-org-actions.ts`** — refactorise :
- Suppression des helpers prives (170 lignes), import depuis `lib/org-notifications.ts`

**`organization-actions.ts`** — notifications branchees :
- `acceptOrgMission()` → `notifyMembersOfMissionAccepted()` (non-bloquant)
- `cancelOrgMission()` → `notifyOfMissionCancelled()` (non-bloquant)
- `applyToJoinOrg()` (auto-approve PUBLIC) → `notifyLeaderOfNewMember()` (non-bloquant)
- `joinOrgByInviteCode()` → `notifyLeaderOfNewMember()` (non-bloquant)
- `leaveOrganization()` → `notifyLeaderOfMemberLeft()` (non-bloquant)
- `removeOrgMember()` → `notifyMemberRemoved()` (non-bloquant)
- Toutes les notifications sont fire-and-forget (`.catch(() => {})`)

**Build** : `npm run build` OK sans erreur.

---

> **Prochaine etape** : Phase 5 (Tests — adapter les 146 tests existants, tester deals %, flat, recurring, clawback, cancel).
