# TRAAACTION - Documentation Technique

> **IMPORTANT** : Mettre a jour ce fichier apres chaque modification significative (routes, schema Prisma, regles metier, architecture).

---

## 1. VISION DU PROJET

**Traaaction** = Plateforme SaaS d'affiliation connectant **Startups** et **Sellers** (affilies).

### Modele economique
- Startups creent des **missions** (programmes d'affiliation)
- Sellers partagent des **liens traces** et gagnent des **commissions**
- **Plateforme prend 15%** sur chaque transaction (calcule sur net apres Stripe fees + taxes)
- Paiements via **Stripe Connect** ou **wallet Traaaction** (gift cards uniquement)

### Modes de remuneration
| Mode | Declencheur | Configuration |
|------|------------|---------------|
| **SALE** | Achat client (one-time) | Flat ou % du net |
| **LEAD** | Inscription/action | Flat uniquement |
| **RECURRING** | Abonnement mensuel (renouvellements) | Flat ou % du net, limite en mois |

### Interfaces
- **Landing** (`/`) - Vitrine publique
- **Dashboard Startup** (`/dashboard/*`) - Gestion missions, sellers, commissions
- **Dashboard Seller** (`/seller/*`) - Marketplace, wallet, profil
- **Admin** (`/admin/*`) - Gestion plateforme, feedback

---

## 2. STACK TECHNIQUE

| Tech | Usage |
|------|-------|
| Next.js 16 + React 19 | Framework (App Router) |
| TypeScript strict | Langage |
| Supabase | Auth + PostgreSQL |
| Prisma 7.1 | ORM |
| Stripe | Paiements + Connect |
| Tinybird | Analytics temps reel |
| Upstash Redis | Cache, rate limiting |
| Tailwind v4 + Framer Motion | Styling + Animations |
| next-intl | i18n (FR/EN/ES) |

### Env vars cles
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
DATABASE_URL, DIRECT_URL
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
TINYBIRD_ADMIN_TOKEN, NEXT_PUBLIC_TINYBIRD_HOST
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
CRON_SECRET
```

---

## 3. STRUCTURE SIMPLIFIEE

```
app/
├── dashboard/          # Startup: missions, sellers, commissions, payouts, messages, settings, organizations
├── seller/             # Seller: marketplace, wallet, payouts, profile, settings, onboarding, organizations
├── admin/              # Admin: feedback, treasury, gift-cards, sellers, payouts, organizations
├── api/
│   ├── auth/           # me, verify, user-roles
│   ├── track/          # click, lead
│   ├── feedback/       # POST (submit), GET (list), PATCH (update status)
│   ├── webhooks/       # [endpointId] (Stripe), startup-payments
│   ├── cron/           # commissions, mature-commissions, payouts
│   └── seller/         # connect, wallet, withdraw, payout-method
├── actions/            # Server Actions (commissions, sellers, payouts, missions, messaging, customers, organizations, admin-org, marketing-campaigns, marketing-folders, portal, portal-settings)
├── join/               # Hosted affiliate portal: [workspaceSlug], [workspaceSlug]/[missionId]
└── [pages legales]     # terms, privacy, seller-terms, startup-terms, about, report-abuse

components/
├── FeedbackWidget.tsx    # Widget feedback flottant (MVP)
├── WebhookManager.tsx    # Guide configuration webhook Stripe (4 events)
├── dashboard/            # Sidebar, ActivityFeed, charts
├── landing/              # Navbar, Hero, Features, FAQ
├── marketing/            # CampaignSelect, FolderSelect, FolderSidebar, BulkActionBar, CampaignManager, CreateLinkModal
└── seller/               # ProfileCompletionBanner

lib/
├── commission/engine.ts  # Moteur commissions (CRITIQUE — voir section 7)
├── notifications/        # Email notification system (index, categories, preferences, sender, locale, templates/)
├── stripe-connect.ts     # Setup Stripe Connect
├── payout-service.ts     # Orchestration payouts + getSellerWallet()
├── admin.ts              # Admin email whitelist
├── sql-sanitize.ts       # Protection injection SQL
└── analytics/tinybird.ts # API Tinybird

scripts/
├── test-recurring.ts       # 30 tests — scenarios core recurring
├── test-recurring-edge.ts  # 47 tests — edge cases (limites, concurrence, devises)
├── test-recurring-ui.ts    # 69 tests — integrite donnees UI (dashboards, wallet, payouts)
├── test-referral.ts        # 31 tests (83 assertions) — referral/parrainage system
├── test-referral-ui.ts     # 24 tests (100 assertions) — referral UI data integrity
├── test-group-commissions.ts # 34 tests — group equal split, clawback, constraints
└── [autres]                # migrations, diagnostics, infra tests
```

---

## 4. MODELE DE DONNEES

### Relations principales
```
User → WorkspaceMember → Workspace → Mission → MissionEnrollment
                              ├── ShortLink, Domain, Customer, LeadEvent
                              ├── Commission, StartupPayment
                              └── Conversation → Message

Seller → SellerProfile, SellerBalance, Commission, GiftCardRedemption
       → Organization (as Leader), OrganizationMember (as Member)
       → SellerGroup (as Creator), SellerGroupMember (1:1, un seul groupe)
Organization → OrganizationMember[], OrganizationMission[]
SellerGroup → SellerGroupMember[], GroupMission[]
Feedback (standalone) → user feedback avec attachments
NotificationPreference → user_id + category (email notification opt-in/out)
NotificationLog → audit trail of all sent/skipped/failed notification emails
Workspace → MarketingCampaign[], MarketingFolder[]
MarketingCampaign → ShortLink[] (campaign_id FK, onDelete: SetNull)
MarketingFolder → ShortLink[] (folder_id FK, onDelete: SetNull), Children[] (self-relation)
```

### Modeles cles
| Modele | Role |
|--------|------|
| **Workspace** | Tenant startup (1 par startup) |
| **Mission** | Programme d'affiliation avec rewards (sale, lead, recurring) |
| **Seller** | Affilie avec stripe_connect_id, payout_method, tenant_id, email |
| **Commission** | Ledger: gross/net/commission/platform_fee, status, hold_days |
| **SellerBalance** | Solde agrege: balance, pending, due, paid_total |
| **Customer** | Attribution first-click permanente (external_id = Stripe customer ID) |
| **Organization** | Groupe de sellers avec leader, status admin-validated |
| **OrganizationMember** | Liaison seller ↔ org (PENDING/ACTIVE/REMOVED) |
| **OrganizationMission** | Contrat startup ↔ org : total_reward, leader_reward, member_reward |
| **Feedback** | Feedback utilisateur MVP (message, attachments, voice, status) |
| **SellerGroup** | Pool egalitaire de sellers (max 10, un seul groupe par seller) |
| **SellerGroupMember** | Liaison seller ↔ group (ACTIVE/REMOVED, seller_id @unique) |
| **GroupMission** | Inscription groupe dans mission (@@unique group_id+mission_id) |
| **MarketingCampaign** | Campagne marketing first-class (name, color, status, dates) — @@unique(workspace_id, name) |
| **MarketingFolder** | Dossier organisation liens (self-relation max 2 niveaux, position ordering) — @@unique(workspace_id, name, parent_id) |
| **PortalReferral** | Referral tracking per-workspace (referrer→referred, @@unique workspace_id+referred_seller_id) |

### Champs Commission (recurring + org)
```
sale_id                   String @unique   — checkout session ID ou invoice ID
subscription_id           String?          — Stripe subscription ID (index)
recurring_month           Int?             — numero du mois (1, 2, 3...)
recurring_max             Int?             — limite max de mois (null = lifetime)
commission_source         CommissionSource — LEAD | SALE | RECURRING
hold_days                 Int @default(30) — jours avant maturation
matured_at                DateTime?        — date de passage PROCEED
startup_payment_status    String?          — UNPAID | PAID
org_parent_commission_id  String?          — lie leader commission → member commission
organization_mission_id   String?          — lie au contrat OrganizationMission
group_id                  String?          — SellerGroup.id (revenu va au createur)
portal_referral           Boolean @default(false) — true si referral portal (paye par startup)
```

### Champs Message (rich messages)
```
message_type              MessageType      @default(TEXT) — type de carte
metadata                  Json?            — donnees structurees (deal info, mission details)
action_status             MessageActionStatus? — etat de l'action (null pour TEXT)
```

### Enums critiques
```
CommissionStatus: PENDING → PROCEED → COMPLETE
CommissionSource: LEAD, SALE, RECURRING
SellerStatus: PENDING, APPROVED, BANNED
EnrollmentStatus: PENDING, APPROVED, REJECTED
MissionVisibility: PUBLIC, PRIVATE, INVITE_ONLY
PayoutMethod: STRIPE_CONNECT, PAYPAL, IBAN, PLATFORM
FeedbackStatus: NEW, REVIEWED, RESOLVED, ARCHIVED
OrganizationStatus: PENDING, ACTIVE, SUSPENDED
OrgMemberStatus: PENDING, ACTIVE, REMOVED
OrgMissionStatus: PROPOSED, ACCEPTED, REJECTED
SellerGroupStatus: ACTIVE, ARCHIVED
GroupMemberStatus: ACTIVE, REMOVED
MessageType: TEXT, ORG_DEAL_PROPOSAL, MISSION_INVITE, ENROLLMENT_REQUEST
MessageActionStatus: PENDING, ACCEPTED, REJECTED, CANCELLED
CampaignStatus: ACTIVE, PAUSED, COMPLETED, ARCHIVED
```

---

## 5. AUTHENTIFICATION

- **Supabase Auth** : email/password, session JWT
- **Roles** : `STARTUP` (cree Workspace) ou `AFFILIATE` (devient Seller)
- **Multi-tenant** : Cookie `trac_active_ws`, fichier `lib/workspace-context.ts`
- **Admin** : Email whitelist dans `lib/admin.ts` (`lucas@traaaction.com`, etc.)

### Flux
```
STARTUP: Signup → Onboarding → Create Workspace → /dashboard
SELLER: Signup → Auto-create Seller → /seller/onboarding (4 etapes) → /seller
```

---

## 6. TRACKING & ATTRIBUTION

### Chaine complete
```
1. Seller partage short link: /s/{slug}
2. Middleware: lookup Redis → genere Click ID (clk_{timestamp}_{hex})
3. Cookie 90 jours: trac_click_id
4. Log Tinybird (fire-and-forget) → redirect target
5. SDK trac.js envoie click_id avec events
6. Lead/Sale → attribution via click_id → Seller
```

### Attribution (first-click)
- Priorite webhook: `session.metadata.tracClickId` → `client_reference_id` → Customer lookup
- Pour renewals (invoice.paid): attribution via Customer table (link_id, affiliate_id)
- Une fois set sur Customer, jamais ecrase

---

## 7. COMMISSIONS

### Moteur — `lib/commission/engine.ts`

| Fonction | Role |
|----------|------|
| `parseReward()` | Parse "5€" ou "10%" en structure {type, value} |
| `calculateCommission()` | Calcule montant commission (% ou flat) |
| `createCommission()` | Cree commission PENDING avec support recurring + safety net |
| `countRecurringCommissions()` | Compte commissions par subscription_id (enforcement limite) |
| `handleClawback()` | Supprime commission sur refund, applique solde negatif si COMPLETE |
| `updateSellerBalance()` | Recalcule SellerBalance depuis aggregats Commission par status |
| `findSellerForSale()` | Trouve seller par attribution click (link_id ou sellerId) |
| `matureCommissions()` | Mature PENDING → PROCEED apres expiration hold_days |
| `getMissionCommissionConfig()` | Config multi-commission (Lead, Sale, Recurring) |
| `createPortalReferralCommissions()` | Referral commissions per-workspace (startup-configured, independent from Traaaction) |

### Calcul
```
PERCENTAGE: commission = netAmount * (value / 100)
FIXED: commission = value (en centimes)
Platform fee: TOUJOURS 15% du net
Guard: grossAmount <= 0 → skip (trials, credits, ajustements)
```

### Lifecycle
```
PENDING (hold) → PROCEED (mature) → COMPLETE (paid)
     ↓ refund        ↓ refund            ↓ refund
   DELETE           DELETE          DELETE + negative balance
```

### Hold periods
| Type | Hold | Raison |
|------|------|--------|
| LEAD | 3j | Pas de remboursement |
| SALE | 30j | Protection chargebacks |
| RECURRING | 30j | Protection annulations |

### Mode RECURRING — Flux complet
```
1. checkout.session.completed (session.subscription present)
   → Commission RECURRING mois 1 (recurringReward, pas saleReward)
   → subscription_id tracke, recurring_max = mission config

2. invoice.paid (renouvellement mois 2, 3... N)
   → Verifie subscription_id traque (existingCount > 0)
   → Verifie limite: existingCount < recurringMax
   → recurring_month = existingCount + 1 (DB-based, pas parse du numero facture)
   → Attribution via Customer table (pas besoin du clickId)

3. customer.subscription.deleted (annulation)
   → Supprime toutes les commissions PENDING du subscription_id
   → Recalcule SellerBalance
   → Les commissions PROCEED/COMPLETE sont preservees

4. charge.refunded (remboursement)
   → Strategie 1: lookup via checkout session (one-time + mois 1)
   → Strategie 2: fallback via charge.invoice (renouvellements)
   → PENDING/PROCEED → delete
   → COMPLETE → delete + negative balance
```

### Clawback — Ordre d'operations
```
1. Sauvegarder clawbackAmount (si COMPLETE)
2. Supprimer la commission
3. updateSellerBalance() — recalcule depuis aggregats
4. Si COMPLETE: decrement balance (applique le negatif APRES recalcul)
```
> **CRITIQUE** : Le decrement doit etre APRES updateSellerBalance(), sinon le recalcul ecrase le solde negatif.

---

## 8. WEBHOOK STRIPE — `app/api/webhooks/[endpointId]/route.ts`

### Events traites (4 requis)
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Attribution + commission SALE ou RECURRING mois 1 |
| `invoice.paid` | Commission RECURRING mois 2+ (renouvellements) |
| `charge.refunded` | Clawback (dual strategy: session + invoice) |
| `customer.subscription.deleted` | Suppression PENDING + recalcul balance |

### Configuration startup
La startup doit configurer dans son dashboard Stripe :
- Endpoint URL: fourni par Traaaction
- Events: les 4 ci-dessus
- Metadata obligatoire: `tracClickId` dans session metadata
- Mode: `payment` (one-time) ou `subscription` (abonnement)

### Guards
- `grossAmount <= 0` → skip (trials, credits, ajustements)
- `subscriptionId` absent sur invoice → skip recurring
- `existingCount === 0` sur invoice → abonnement non traque → skip
- `existingCount >= recurringMax` → limite atteinte → skip
- Idempotence via `sale_id` unique (upsert)

---

## 9. PAIEMENTS

### Flux 1: Client → Startup
```
Stripe Checkout → Webhook /api/webhooks/[endpointId]
→ Attribution → Commission (PENDING, hold 30j)
```

### Flux 2: Startup → Plateforme
```
Startup selectionne commissions PROCEED+UNPAID
→ createPaymentSession() → Stripe Checkout
→ Webhook /api/webhooks/startup-payments → PAID
```

### Methodes payout Seller
| Methode | Min | Status |
|---------|-----|--------|
| Stripe Connect | 10EUR | Production |
| PayPal/IBAN | 10-25EUR | MVP manuel |
| Platform (wallet) | 0EUR | Gift cards only |

---

## 10. MIDDLEWARE (CRITIQUE)

**Fichier**: `middleware.ts` (~940 lignes, Edge runtime)

Responsabilites:
1. Rate limiting (Redis sliding window)
2. Short link redirect + Click ID
3. First-party tracking (CNAME cloaking)
4. Session refresh Supabase
5. Workspace/Seller isolation
6. Vercel preview domains autorises

---

## 11. FONCTIONNALITES COMPLETEES

### Core
- [x] Migration Partner → Seller (100%)
- [x] Dashboard Startup complet
- [x] Dashboard Seller complet
- [x] Onboarding Seller 4 etapes + Stripe Connect
- [x] Stripe Connect depuis Wallet
- [x] Activity Feed avec attribution seller
- [x] Messagerie startup ↔ seller

### Commissions
- [x] Mode SALE (one-time) — flat + percentage
- [x] Mode LEAD — flat uniquement
- [x] Mode RECURRING — abonnements avec limite en mois ou lifetime
- [x] Multi-commission par mission (Sale + Recurring configurables independamment)
- [x] UI creation mission avec toggle recurring dans la carte Sale
- [x] Clawback dual strategy (session + invoice)
- [x] Negative balance sur refund COMPLETE
- [x] Guard grossAmount <= 0 (trials, credits)
- [x] Annulation abonnement → suppression PENDING
- [x] 201 tests automatises (core + edge + UI + referral)

### Integration page
- [x] Guide Stripe metadata (mode payment + subscription)
- [x] WebhookManager avec 4 events requis
- [x] Export markdown AI avec documentation complete

### i18n (FR/EN/ES)
- [x] Toutes pages landing, dashboard, seller
- [x] Pages legales: terms, privacy, seller-terms, startup-terms
- [x] Pages: about, report-abuse, login
- [x] ~2100 lignes par fichier de traduction

### Design
- [x] Responsive design complet (mobile drawer)
- [x] Seller settings redesign (Apple-like)
- [x] Profile completion bar (glass-morphic)
- [x] Integration page redesign
- [x] Customer detail page avec infos abonnement

### Securite
- [x] SQL injection fix (lib/sql-sanitize.ts)
- [x] Hold days: SALE/RECURRING 30 jours, LEAD 3 jours
- [x] Idempotence webhook via sale_id unique

### MVP Features
- [x] **Feedback System** (Fevrier 2026)
  - Widget flottant sur dashboards (`components/FeedbackWidget.tsx`)
  - Text, file attachments, voice recording
  - Admin page `/admin/feedback` (theme dark)
  - API: POST/GET `/api/feedback`, PATCH `/api/feedback/[id]`
  - Status: NEW → REVIEWED → RESOLVED → ARCHIVED
  - Protection admin via email whitelist

### Organizations (Fevrier 2026)
- [x] **Schema** : Organization, OrganizationMember, OrganizationMission + champs org sur Commission/MissionEnrollment
- [x] **Dual commission** : membre + leader par vente org (`createOrgCommissions`)
- [x] **Commission engine** : `getOrgMissionConfig()`, `createOrgCommissions()`, cascade clawback leader
- [x] **countRecurringCommissions** : filtre `org_parent_commission_id: null` (exclut leader cuts)
- [x] **Webhook** : branch org dans checkout.session.completed + invoice.paid
- [x] **Actions** : `organization-actions.ts` (CRUD org, membres, missions) + `admin-org-actions.ts`
- [x] **UI Startup** : `/dashboard/sellers/groups` (liste orgs) + `[orgId]` (detail + propose mission)
- [x] **UI Seller** : `/seller/organizations` (mes orgs) + `/create` + `[orgId]` (detail leader/membre)
- [x] **UI Admin** : `/admin/organizations` (approve/suspend) + `[orgId]` (detail)
- [x] **Auto-enrollment** : acceptation mission → tous les membres inscrits (ShortLink + Redis + MissionEnrollment)
- [x] **I18n** : `organizations` ajoute dans sidebar (FR/EN/ES)

### Groups — Petites Agences (Fevrier 2026)
- [x] **Schema** : SellerGroup, SellerGroupMember, GroupMission + champ `group_id` sur Commission
- [x] **All-to-creator** : toute la commission va au createur du groupe (pas de split, moins de transferts)
- [x] **Commission engine** : `getGroupConfig()` (retourne `creatorId`), `createGroupCommissions()` (1 seule commission)
- [x] **Webhook** : branch group (priorite sur org) dans checkout.session.completed + invoice.paid
- [x] **Actions** : `group-actions.ts` (createGroup, joinGroup, leaveGroup, enrollGroupInMission, etc.)
- [x] **UI Seller** : `/seller/groups` (mon groupe) + `/create` + `[id]` (detail) + `/join/[code]` (invitation)
- [x] **Marketplace** : Toggle "solo/groupe" sur page mission detail
- [x] **Auto-enrollment** : nouveau membre auto-inscrit dans toutes les GroupMissions existantes
- [x] **Contraintes** : 1 seul groupe par seller (`seller_id @unique`), max 10 membres, createur quitte → archive
- [x] **I18n** : `groups` ajoute dans sidebar + traductions (FR/EN/ES)
- [x] **Tests** : 35 tests (`test-group-commissions.ts`)

### Rich Messages — Deals, Invitations & Actions dans le Chat (Fevrier 2026)
- [x] **Schema** : `MessageType` (TEXT, ORG_DEAL_PROPOSAL, MISSION_INVITE, ENROLLMENT_REQUEST), `MessageActionStatus` (PENDING, ACCEPTED, REJECTED, CANCELLED) + champs `message_type`, `metadata` (Json), `action_status` sur Message
- [x] **Server Actions** : `sendRichMessage()`, `syncMessageCardStatus()`, `respondToOrgDeal()`, `sendMissionInviteCard()`, `respondToMissionInvite()`, `respondToEnrollmentRequest()` dans `messaging.ts`
- [x] **Cartes UI** : `components/messages/MessageCard.tsx` (dispatcher), `OrgDealCard.tsx`, `MissionInviteCard.tsx`, `EnrollmentRequestCard.tsx` — design sobre, framer-motion
- [x] **Integration pages** : dashboard + seller messages pages rendent les cartes centrees pour les rich messages, bulles classiques pour TEXT
- [x] **Org Deal auto-send** : `proposeOrgMission()` envoie automatiquement une carte ORG_DEAL_PROPOSAL au leader
- [x] **Org Deal sync** : `acceptOrgMission()` / `rejectOrgMission()` synchronisent le statut de la carte via `syncMessageCardStatus()`
- [x] **Enrollment Request auto-send** : `joinMission()` (branche PRIVATE) envoie automatiquement une carte ENROLLMENT_REQUEST a la startup
- [x] **Enrollment Request sync** : `approveProgramRequest()` / `rejectProgramRequest()` synchronisent le statut
- [x] **Bouton "+"** : cote startup, popover avec "Propose org deal" + "Invite to mission" avec modales de selection
- [x] **Backward compat** : anciens messages texte + `is_invitation: true` s'affichent normalement

### Marketing Campaigns, Folders & Bulk Operations (Fevrier 2026)
- [x] **Schema** : `MarketingCampaign` (name, description, color, status, dates) + `MarketingFolder` (self-relation max 2 niveaux, position) + `campaign_id`/`folder_id` FK sur ShortLink (onDelete: SetNull)
- [x] **Campaigns CRUD** : `marketing-campaigns.ts` — create, update (cascade rename sur ShortLink.campaign), delete (unlink tous liens), list (avec _count + totalClicks), get
- [x] **Folders CRUD** : `marketing-folders.ts` — create (validation max 2 niveaux), update, delete (cascade children + unlink liens), getTree
- [x] **Bulk operations** : `bulkDeleteLinks`, `bulkMoveToFolder`, `bulkSetCampaign`, `bulkAddTags`, `bulkRemoveTags` dans `marketing-links.ts`
- [x] **Links editables** : `updateMarketingLink()` supporte campaign_id, folder_id, channel
- [x] **UI FolderSidebar** : panneau 220px avec arbre dossiers, inline create/rename, context menu
- [x] **UI CampaignManager** : popover gestion campagnes (create, edit, status toggle, delete)
- [x] **UI BulkActionBar** : barre sticky en bas avec actions bulk (move, campaign, tags, delete)
- [x] **UI CampaignSelect/FolderSelect** : dropdowns reutilisables
- [x] **Page marketing** : layout 2 colonnes (sidebar + contenu), checkboxes multi-select, campaign pills filtre
- [x] **Page campagnes** : `/dashboard/marketing/campaigns` — grille cards avec stats, create/edit/archive/delete
- [x] **Link detail editable** : section "Properties" (campaign, folder, channel) avec edit inline
- [x] **CreateLinkModal** : CampaignSelect + FolderSelect remplacent input texte libre
- [x] **Denormalisation** : champ `campaign` string garde en sync avec `campaign_id` (backward compat)
- [x] **Migration** : `scripts/migrate-campaigns.ts` — convertit strings campaign existants en entites MarketingCampaign
- [x] **I18n** : ~40 cles (campaigns, folders, bulk) dans FR/EN/ES

### Hosted Affiliate Portal (Fevrier 2026)
- [x] **Schema** : `portal_enabled` (Boolean) + `portal_welcome_text` (String?) sur Workspace
- [x] **Server Actions** : `portal.ts` (getPortalData, getPortalMission, portalJoinMission, getPortalDashboard, getPortalUserStatus) + `portal-settings.ts` (getPortalSettings, togglePortal, updatePortalWelcomeText)
- [x] **Page portail** : `/join/[workspaceSlug]` — 3 etats (visiteur signup, seller join, enrolled dashboard) — design soigne avec hero, mission cards, auth inline
- [x] **Page mission** : `/join/[workspaceSlug]/[missionId]` — page focalisee sur une seule mission avec rewards detailles et resources
- [x] **Dashboard startup** : `/dashboard/portal` — toggle ON/OFF, URL portail, code iframe, message accueil, liens par mission
- [x] **Middleware** : `/join/*` autorise sur custom domains, auth flow portal (`next=/join/*`), headers iframe (`frame-ancestors *`)
- [x] **Sidebar** : lien "Portal" ajoute dans section configuration (seller + marketing modes)
- [x] **Auth flow** : signup email/password inline → confirmation email → redirect `/join/{slug}` → auto-create seller → join mission
- [x] **Iframe embed** : snippet `<iframe>` copiable, CSP `frame-ancestors *` pour integration site tiers
- [x] **I18n** : ~50 cles (portal, settings) dans FR/EN/ES

### Portal Referral Program (Fevrier 2026)
- [x] **Schema** : `PortalReferral` model (workspace_id + referrer/referred sellers), `portal_referral_*` fields on Workspace, `portal_referral` Boolean on Commission
- [x] **Commission engine** : `createPortalReferralCommissions()` — walks PortalReferral chain, rates from workspace config (basis points), `platform_fee: 0`, `startup_payment_status: UNPAID`
- [x] **Branching** : called after `createReferralCommissions()` in `createCommission()`, `createOrgCommissions()`, `createGroupCommissions()`
- [x] **Cookie tracking** : `trac_portal_ref` cookie set alongside `trac_ref` on portal landing page
- [x] **Seller creation** : `createGlobalSeller()` creates `PortalReferral` record if `trac_portal_ref` cookie + workspace has referral enabled
- [x] **Settings** : `getPortalReferralSettings()` + `updatePortalReferralSettings()` in portal-settings.ts
- [x] **Portal actions** : `getPortalFullDashboard()` returns `referralConfig`, `getPortalReferrals()` + `getPortalSubTree()` use PortalReferral table
- [x] **Conditional tabs** : PortalHeader hides Referrals/Network tabs when `referralEnabled=false`
- [x] **Dynamic rates** : referrals + network pages use workspace config rates instead of hardcoded 5%/3%/2%
- [x] **Startup settings** : `/dashboard/portal` has Referral Program section (toggle, 1-3 generations, rate per gen)
- [x] **Independent** : fully separate from Traaaction's global referral system (`Seller.referred_by`, `REFERRAL_RATES`)
- [x] **Clawback** : automatic via existing `referral_source_commission_id` cascade
- [x] **I18n** : ~5 new keys (referralProgram, referralDescription, etc.) in FR/EN/ES

### Email Notifications System (Fevrier 2026)
- [x] **Schema** : `NotificationPreference` (user_id + category, @@unique), `NotificationLog` (audit trail), `unsubscribe_token` on Seller
- [x] **Architecture** : `lib/notifications/` — `index.ts` (notify/notifyAsync), `categories.ts`, `preferences.ts`, `sender.ts`, `locale.ts`
- [x] **Templates** : 9 email templates (commission-earned, commission-matured, payout-processed, enrollment-status, new-message, clawback, new-enrollment, enrollment-request, commissions-ready) — HTML inline styles, i18n FR/EN/ES, base layout with Traaaction branding
- [x] **Integration** : `notifyAsync()` fire-and-forget in commission engine (createCommission, createOrgCommissions, createGroupCommissions, matureCommissions), messaging (sendMessage replaces TODO), marketplace (joinMission, approveProgramRequest, rejectProgramRequest), payouts (confirmStartupPayment), webhook (charge.refunded clawback)
- [x] **Preferences UI** : Seller settings (new section with toggles), Startup settings (new "Notifications" tab)
- [x] **Unsubscribe** : `/api/notifications/unsubscribe?token=xxx&category=yyy` — 1-click from email, `List-Unsubscribe` header
- [x] **Anti-spam** : 5-min dedup for new_message, aggregated emails for commission_matured (1 per seller) and commissions_ready (1 per workspace)
- [x] **RGPD** : `consented_at` timestamp, `exportNotificationData()`, `deleteNotificationData()`, transactional emails (no consent needed)
- [x] **I18n** : `notifications` tab + description keys in FR/EN/ES

---

## 12. REGLES METIER CRITIQUES

| Regle | Detail |
|-------|--------|
| Platform fee | 15% du net sur CHAQUE vente |
| Hold LEAD/SALE/RECURRING | 3j / 30j / 30j |
| First-click attribution | Jamais ecrase une fois set |
| Wallet sans Stripe | Gift cards uniquement |
| Wallet → Stripe | Solde NON transferable, gains futurs only |
| Cookie tracking | 90 jours |
| Admin access | Email whitelist (`lib/admin.ts`) |
| Recurring mois 1 | Commission RECURRING (pas SALE) si subscription |
| Recurring limite | DB-based (count), pas parse du numero facture |
| Recurring lifetime | `recurringMax = null` → pas de limite |
| One-time + subscription | Un produit one-time = SALE, un abonnement = RECURRING |
| Annulation abo | Supprime PENDING, preserve PROCEED/COMPLETE |
| Refund COMPLETE | Supprime commission + applique solde negatif |
| grossAmount <= 0 | Skip commission (trials, credits, ajustements) |
| Org creation | Seller APPROVED fait demande → admin valide (PENDING→ACTIVE) |
| Org mission visibility | Seules les missions INVITE_ONLY peuvent etre proposees aux organisations |
| Org commission split | Membre = memberReward + platform_fee 15%, Leader = leaderReward + platform_fee 0 |
| Leader sale_id | `{original}:orgcut` pour unicite (ne compte pas dans recurring count) |
| Org enrollment | Leader accepte mission → tous membres ACTIVE auto-inscrits |
| Org multi-membre | Un seller peut etre dans plusieurs orgs |
| Org clawback | Refund supprime les 2 commissions (membre + leader via cascade) |
| Group creation | Seller cree librement (pas d'approbation admin) |
| Group commission | Toute la commission va au createur du groupe (pas de split) |
| Group enrollment | Tout membre ACTIVE peut inscrire le groupe dans une mission |
| Group mono-membre | Un seller ne peut etre que dans 1 seul groupe (`seller_id @unique`) |
| Group max taille | 10 membres par defaut |
| Group createur quitte | Groupe ARCHIVED, commissions existantes continuent lifecycle |
| Group clawback | Standard (1 seule commission a supprimer) |
| Group referral | Base sur HT total, creditee au referrer du createur |
| Group priorite webhook | Check group avant org (group prend priorite) |
| Portal activation | `portal_enabled` toggle sur Workspace, gratuit (0€) |
| Portal visibility | Affiche uniquement missions PUBLIC + PRIVATE (pas INVITE_ONLY, pas org-exclusive) |
| Portal auth | Email/password inline, confirmation email, auto-create seller via `createGlobalSeller()` |
| Portal iframe | Headers `frame-ancestors *`, recommander custom domain CNAME pour cookies tiers |
| Portal custom domain | `/join/*` autorise sur custom domains, auth flow aussi si `next=/join/*` |
| Portal referral | Configurable par workspace, independant du systeme Traaaction |
| Portal referral rates | Basis points (500 = 5%), 1-3 generations, gen2 requires gen1, gen3 requires gen2 |
| Portal referral chain | Via `PortalReferral` table (pas `Seller.referred_by`), scope workspace |
| Portal referral payment | `startup_payment_status: UNPAID`, `platform_fee: 0` — paye par startup, pas Traaaction |
| Portal referral sale_id | `{original}:pref:gen{N}:{referrerId}` — distinct de `:ref:` (Traaaction) |
| Portal referral clawback | Automatique via `referral_source_commission_id` existant |

---

## 13. COMMANDES

```bash
npm run dev              # Dev server
npm run build            # Production build
npm run db:push          # Push schema
npm run db:generate      # Generate Prisma client
npm run lint             # ESLint
```

### Tests
```bash
npx tsx scripts/test-recurring.ts       # 30 tests core
npx tsx scripts/test-recurring-edge.ts  # 47 tests edge cases
npx tsx scripts/test-recurring-ui.ts    # 69 tests UI data integrity
npx tsx scripts/test-referral.ts        # 31 tests referral system
npx tsx scripts/test-referral-ui.ts     # 24 tests referral UI data integrity
npx tsx scripts/test-group-commissions.ts  # 35 tests group all-to-creator
```

---

## 14. SECURITE

| Aspect | Implementation |
|--------|---------------|
| Auth | Supabase JWT, cookie HttpOnly |
| RBAC | Startup vs Seller vs Admin |
| Rate Limiting | Upstash Redis |
| Webhooks | Signature Stripe HMAC par workspace |
| SQL Injection | Sanitization Tinybird (`lib/sql-sanitize.ts`) |
| Admin | Email whitelist |
| Idempotence | sale_id unique sur Commission (upsert) |
| Recurring safety | countRecurringCommissions() + guard dans createCommission() |

---

> **RAPPEL** : Mettre a jour ce fichier apres chaque modification significative.
