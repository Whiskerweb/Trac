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
├── actions/            # Server Actions (commissions, sellers, payouts, missions, messaging, customers, organizations, admin-org)
└── [pages legales]     # terms, privacy, seller-terms, startup-terms, about, report-abuse

components/
├── FeedbackWidget.tsx    # Widget feedback flottant (MVP)
├── WebhookManager.tsx    # Guide configuration webhook Stripe (4 events)
├── dashboard/            # Sidebar, ActivityFeed, charts
├── landing/              # Navbar, Hero, Features, FAQ
└── seller/               # ProfileCompletionBanner

lib/
├── commission/engine.ts  # Moteur commissions (CRITIQUE — voir section 7)
├── stripe-connect.ts     # Setup Stripe Connect
├── payout-service.ts     # Orchestration payouts + getSellerWallet()
├── admin.ts              # Admin email whitelist
├── sql-sanitize.ts       # Protection injection SQL
└── analytics/tinybird.ts # API Tinybird

scripts/
├── test-recurring.ts       # 30 tests — scenarios core recurring
├── test-recurring-edge.ts  # 47 tests — edge cases (limites, concurrence, devises)
├── test-recurring-ui.ts    # 69 tests — integrite donnees UI (dashboards, wallet, payouts)
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
Organization → OrganizationMember[], OrganizationMission[]
Feedback (standalone) → user feedback avec attachments
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
- [x] 146 tests automatises (core + edge + UI)

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
| Org commission split | Membre = memberReward + platform_fee 15%, Leader = leaderReward + platform_fee 0 |
| Leader sale_id | `{original}:orgcut` pour unicite (ne compte pas dans recurring count) |
| Org enrollment | Leader accepte mission → tous membres ACTIVE auto-inscrits |
| Org multi-membre | Un seller peut etre dans plusieurs orgs |
| Org clawback | Refund supprime les 2 commissions (membre + leader via cascade) |

---

## 13. COMMANDES

```bash
npm run dev              # Dev server
npm run build            # Production build
npm run db:push          # Push schema
npm run db:generate      # Generate Prisma client
npm run lint             # ESLint
```

### Tests recurring
```bash
npx tsx scripts/test-recurring.ts       # 30 tests core
npx tsx scripts/test-recurring-edge.ts  # 47 tests edge cases
npx tsx scripts/test-recurring-ui.ts    # 69 tests UI data integrity
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
