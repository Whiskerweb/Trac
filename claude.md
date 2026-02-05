# TRAAACTION - Product Requirements Document (PRD)

> **IMPORTANT POUR CLAUDE** : Ce document sert de contexte permanent et doit etre mis a jour automatiquement apres chaque modification significative du projet.
>
> **Quand mettre a jour ce fichier :**
> - Apres avoir ajoute/supprime/renomme des routes, fichiers ou composants importants
> - Apres avoir modifie la structure de la base de donnees (modeles Prisma)
> - Apres avoir change des regles metier critiques
> - Apres avoir modifie l'architecture technique (nouvelles libs, services)
> - Apres une migration majeure (comme Partner → Seller)
> - Apres avoir ajoute/modifie des API routes importantes
>
> **Comment mettre a jour :**
> - Mettre a jour les sections concernees immediatement apres les changements
> - Verifier la coherence de tout le document
> - S'assurer que les exemples de code refletent le code actuel

---

## 1. VISION & DESCRIPTION DU PROJET

**Traaaction** est une plateforme SaaS de **Seller Marketing / Affiliation** qui met en relation des **Startups** (entreprises) et des **Sellers** (affilies/commerciaux).

### Modele economique
- Les Startups creent des **missions** (programmes d'affiliation)
- Les Sellers s'inscrivent aux missions et partagent des **liens traces**
- Quand un client clique, s'inscrit ou achete via un lien trace, le Seller gagne une **commission**
- **La plateforme prend 15% de frais fixes** sur chaque transaction (calcule sur le net apres frais Stripe + taxes)
- Les Sellers sont payes via Stripe Connect, ou recoivent l'argent sur leur **wallet Traaaction** (utilisable uniquement pour des cartes cadeaux)

### Les 3 modes de remuneration (configures par mission)
| Mode | Declencheur | Configuration |
|------|------------|---------------|
| **Vente (SALE)** | Achat client via Stripe | Flat (ex: 5EUR par vente) ou % du montant net |
| **Lead (LEAD)** | Inscription/action du client | Flat (ex: 3EUR par lead) |
| **Recurring** | Abonnement mensuel | Commission sur chaque renouvellement |

### Les 3 interfaces
1. **Landing Page** (`/`) - Vitrine publique, presentation de la plateforme
2. **Dashboard Startup** (`/dashboard/*`) - Gestion des missions, sellers, commissions, payouts, analytics
3. **Dashboard Seller** (`/seller/*`) - Marketplace, programmes rejoints, wallet, payouts, profil

---

## 2. ARCHITECTURE TECHNIQUE

### Stack technique
| Technologie | Version | Usage |
|-------------|---------|-------|
| **Next.js** | 16.0.10 | Framework (App Router) |
| **React** | 19.2.1 | UI |
| **TypeScript** | Strict | Langage |
| **Supabase** | 2.89.0 | Auth + PostgreSQL |
| **Prisma** | 7.1.0 | ORM (avec PostgreSQL adapter) |
| **Stripe** | 20.1.0 | Paiements + Connect |
| **Tinybird** | API REST | Analytics temps reel |
| **Upstash Redis** | 1.35.8 | Cache, rate limiting, attribution |
| **Tailwind CSS** | 4 | Styling |
| **Framer Motion** | 12.29.0 | Animations |
| **Recharts** | 3.6.0 | Graphiques analytics |
| **next-intl** | 4.8.2 | Internationalisation (FR/EN/ES) |
| **Vercel** | - | Deploiement |

### Variables d'environnement cles
```
# Auth (Supabase)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# Database
DATABASE_URL (pooled), DIRECT_URL (direct)

# Redis (Upstash)
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

# Analytics (Tinybird)
TINYBIRD_ADMIN_TOKEN, NEXT_PUBLIC_TINYBIRD_HOST, NEXT_PUBLIC_TINYBIRD_TOKEN

# Paiements (Stripe)
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_STARTUP_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Autres
TRAC_CLIENT_TOKEN, CRON_SECRET
```

---

## 3. STRUCTURE DU PROJET

```
/Traaaction
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Layout racine (Geist fonts)
│   ├── page.tsx                  # Landing page
│   ├── globals.css               # Styles globaux (Tailwind v4)
│   │
│   ├── login/page.tsx            # Page de login/signup
│   ├── auth/                     # Callbacks OAuth, choix de role
│   ├── onboarding/               # Creation de workspace startup
│   ├── merci/page.tsx            # Page de remerciement post-conversion
│   ├── terms/page.tsx            # Conditions d'utilisation (design editorial)
│   ├── privacy/page.tsx          # Politique de confidentialite (RGPD)
│   │
│   ├── dashboard/                # === DASHBOARD STARTUP ===
│   │   ├── layout.tsx            # Layout avec sidebar
│   │   ├── page.tsx              # KPIs, analytics, graphiques
│   │   ├── missions/             # CRUD missions (create, [missionId])
│   │   ├── sellers/              # Gestion sellers (applications, requests, groups)
│   │   ├── commissions/page.tsx  # Suivi des commissions
│   │   ├── payouts/page.tsx      # Gestion des payouts
│   │   ├── customers/            # Leads et clients ([customerId])
│   │   ├── links/page.tsx        # Gestion des short links
│   │   ├── domains/page.tsx      # Configuration domaines custom (CNAME)
│   │   ├── messages/page.tsx     # Messagerie startup <-> seller
│   │   ├── settings/page.tsx     # Parametres workspace
│   │   ├── integration/page.tsx  # Documentation API/SDK
│   │   ├── marketplace/page.tsx  # Marketplace sellers
│   │   ├── campaigns/page.tsx    # Campagnes
│   │   ├── bounties/page.tsx     # Bounties
│   │   └── fraud/page.tsx        # Detection fraude
│   │
│   ├── seller/                  # === DASHBOARD SELLER ===
│   │   ├── layout.tsx            # Layout dual-nav (rail + sidebar contextuelle)
│   │   ├── page.tsx              # Programmes rejoints
│   │   ├── marketplace/          # Browse missions ([missionId])
│   │   ├── payouts/page.tsx      # Historique gains
│   │   ├── wallet/page.tsx       # Solde, gift cards, Stripe Connect
│   │   ├── profile/page.tsx      # Profil seller
│   │   ├── members/page.tsx      # Membres equipe
│   │   ├── account/page.tsx      # Parametres compte
│   │   ├── messages/page.tsx     # Messagerie
│   │   ├── notifications/page.tsx# Notifications
│   │   ├── analytics/page.tsx    # Analytics earnings
│   │   ├── invitations/page.tsx  # Invitations programmes
│   │   └── onboarding/page.tsx   # Onboarding seller (4 etapes + Stripe Connect)
│   │
│   ├── marketplace/              # Marketplace publique
│   ├── s/[slug]/page.tsx         # Redirect short links
│   │
│   ├── actions/                  # === SERVER ACTIONS ===
│   │   ├── commissions.ts        # Stats, liste, gift cards (416 lignes)
│   │   ├── sellers.ts           # CRUD sellers, profils, claims (522 lignes)
│   │   ├── payouts.ts            # Unpaid commissions, payment sessions (461 lignes)
│   │   ├── missions.ts           # CRUD missions, wizard, contents (621 lignes)
│   │   ├── marketplace.ts        # Browse, join, stats Tinybird (624 lignes)
│   │   ├── marketplace-actions.ts# Actions marketplace supplementaires
│   │   ├── seller-onboarding.ts # Onboarding 4 etapes + Stripe Connect (275 lignes)
│   │   ├── messaging.ts          # Conversations, messages (377 lignes)
│   │   ├── dashboard.ts          # Feed d'evenements (157 lignes)
│   │   ├── links.ts              # Creation/gestion short links
│   │   ├── domains.ts            # Gestion domaines custom
│   │   ├── settings.ts           # Parametres workspace
│   │   ├── workspace.ts          # Operations workspace
│   │   ├── admin.ts              # Operations admin
│   │   ├── webhooks.ts           # Gestion webhooks
│   │   ├── mission-stats.ts      # Statistiques missions
│   │   ├── locale.ts             # Server actions i18n (set/get locale cookie)
│   │   └── get-user-roles.ts     # Verification roles
│   │
│   └── api/                      # === API ROUTES ===
│       ├── auth/                 # me, user-roles, verify, workspace-check
│       ├── track/                # click, lead (tracking events)
│       ├── conversions/          # lead, sale (conversion webhooks)
│       ├── stats/                # kpi, breakdown, activity, platform
│       ├── seller/              # analytics, connect, wallet, withdraw, payout-method, redeem-gift-card
│       ├── webhooks/
│       │   ├── [endpointId]/route.ts     # Webhook Stripe multi-tenant
│       │   └── startup-payments/route.ts # Webhook paiement startup
│       ├── cron/                 # commissions, mature-commissions, payouts
│       ├── links/short/          # Creation short links
│       ├── domains/lookup/       # Verification domaines
│       ├── admin/                # debug, domains, api-keys
│       ├── script/route.ts       # Serve tracking SDK (trac.js)
│       ├── trac-id/route.ts      # Generation tracking IDs
│       └── events/route.ts       # Event logging
│
├── components/                   # === COMPOSANTS REACT ===
│   ├── landing/                  # Navbar, Hero, Features, B2BFeatures, FAQ, Footer, Logos, MissionSelector, AdvancedFeatures
│   ├── dashboard/                # Sidebar, AnalyticsChart, GlobeVisualization, DateRangePicker, ActivityFeed, etc.
│   │   └── CommissionDetailModal.tsx # Modal detail commissions seller (agrege)
│   ├── seller/                  # WalletButton, etc.
│   ├── ui/                       # GlobeVisualization, EuropeMap, charts, visuals
│   ├── LanguageSelector.tsx      # Selecteur de langue (FR/EN/ES), variants 'default' et 'minimal'
│   ├── CreateLinkModal.tsx       # Modal creation lien affilie (20KB)
│   ├── ProjectCreateModal.tsx    # Modal creation mission
│   ├── WebhookManager.tsx        # Gestion webhooks (19KB)
│   └── ActivityLog.tsx           # Timeline activite recente
│
├── lib/                          # === LOGIQUE METIER ===
│   ├── db.ts                     # Client Prisma (singleton)
│   ├── auth.ts                   # getCurrentUser() via Supabase
│   ├── redis.ts                  # Client Upstash + utilitaires cache
│   ├── utils.ts                  # Utilitaires generaux
│   ├── click-id.ts               # Generation/validation click IDs
│   ├── stripe-connect.ts         # Setup Stripe Connect Express
│   ├── payout-service.ts         # Orchestration payouts multi-methode (388 lignes)
│   ├── api-keys.ts               # Generation/validation API keys
│   ├── api-middleware.ts          # Middleware auth API (scopes)
│   ├── sql-sanitize.ts            # Sanitization SQL pour Tinybird (protection injection)
│   ├── workspace-context.ts      # Gestion contexte workspace (300 lignes)
│   ├── stats.ts                  # Calculs statistiques
│   ├── commission/
│   │   ├── engine.ts             # Moteur de commissions (519 lignes) - CRITIQUE
│   │   ├── payout.ts             # Batch payouts Stripe
│   │   └── worker.ts             # Cron maturation commissions
│   ├── analytics/
│   │   ├── tinybird.ts           # API Tinybird (ingestion events)
│   │   ├── seller-rls.ts        # Row-level security seller
│   │   └── seller-token.ts      # Tokens analytics seller
│   ├── hooks/
│   │   ├── useSellerAnalytics.ts
│   │   └── useTracAnalytics.ts
│   ├── config/constants.ts       # Constantes globales
│   └── mock/data.ts              # Donnees mock dev
│
├── prisma/
│   ├── schema.prisma             # Schema complet (24 modeles)
│   ├── seed.ts                   # Script de seed
│   └── migrations/               # Historique migrations
│
├── public/
│   ├── trac.js                   # SDK tracking (41KB)
│   ├── pixel.js                  # Pixel leger (9KB)
│   ├── europe.json               # Donnees geographiques
│   ├── Logotrac/                 # Logos et images landing
│   └── partn/                    # Logos sellers
│
├── i18n/                         # === INTERNATIONALISATION ===
│   ├── config.ts                 # Config locales (en, fr, es), default: en
│   └── request.ts                # NextIntl request config (cookie NEXT_LOCALE)
│
├── messages/                     # === TRADUCTIONS ===
│   ├── en.json                   # Anglais (1155 lignes)
│   ├── fr.json                   # Francais (1155 lignes)
│   └── es.json                   # Espagnol (1155 lignes)
│
├── middleware.ts                  # Edge middleware (900+ lignes) - CRITIQUE
├── next.config.ts                # Config (rewrites anti-adblock, proxy Tinybird, next-intl plugin)
├── tailwind.config.ts            # Tailwind v4
├── tsconfig.json                 # TypeScript strict
└── package.json                  # Dependencies
```

---

## 4. MODELE DE DONNEES (PRISMA)

### 4.1 Modeles principaux et relations

```
User ─────────────── WorkspaceMember ─────── Workspace
  │                                             │
  │                                             ├── Mission ──── MissionEnrollment
  │                                             │      │              │
  │                                             │      ├── MissionContent
  │                                             │      └── ProgramRequest
  │                                             │
  ├── Seller ──── SellerProfile               ├── ShortLink
  │     │                                       ├── Domain
  │     ├── SellerBalance                      ├── Customer ──── LeadEvent
  │     ├── Commission                          ├── Commission
  │     └── GiftCardRedemption                  ├── StartupPayment
  │                                             ├── WebhookEndpoint
  │                                             ├── ApiKey
  │                                             ├── Discount
  │                                             └── Conversation ──── Message
  │
  └── MissionEnrollment
```

### 4.2 Modeles detailles

#### Authentification & Workspace
| Modele | Champs cles | Role |
|--------|-------------|------|
| **User** | id, email, password_hash, name, role (STARTUP/AFFILIATE) | Utilisateur authentifie |
| **Workspace** | id, name, slug (unique), owner_id | Tenant (1 par startup) |
| **WorkspaceMember** | workspace_id, user_id, role (OWNER/MEMBER) | Acces multi-utilisateur |
| **ApiKey** | workspace_id, public_key (pk_*), secret_hash, scopes[] | Auth API |

#### Missions & Programmes
| Modele | Champs cles | Role |
|--------|-------------|------|
| **Mission** | workspace_id, title, target_url, reward_type (SALE/LEAD), reward_structure (FLAT/PERCENTAGE), commission_structure (ONE_OFF/RECURRING), reward_amount, status (DRAFT/ACTIVE/ARCHIVED), visibility (PUBLIC/PRIVATE/INVITE_ONLY) | Programme d'affiliation |
| **MissionEnrollment** | mission_id, user_id, status (PENDING/APPROVED/REJECTED), link_id | Inscription seller a une mission |
| **MissionContent** | mission_id, type (YOUTUBE/PDF/LINK/TEXT), url, title | Contenu pedagogique |
| **ProgramRequest** | seller_id, mission_id, status, message | Demande acces mission privee |

#### Sellers & Affilies
| Modele | Champs cles | Role |
|--------|-------------|------|
| **Seller** | user_id, program_id (nullable=global), email, name, stripe_connect_id, status (PENDING/APPROVED/BANNED), payout_method (STRIPE_CONNECT/PAYPAL/IBAN/PLATFORM), onboarding_step (0-4) | Affilie |
| **SellerProfile** | bio, social URLs, profile_score (0-100) | Profil enrichi |
| **SellerBalance** | balance, pending, due, paid_total | Soldes agreges |

#### Tracking & Attribution
| Modele | Champs cles | Role |
|--------|-------------|------|
| **ShortLink** | slug (unique), original_url, workspace_id, affiliate_id, clicks | Lien trace |
| **Domain** | name (unique), workspace_id, verified | Domaine custom CNAME |
| **Customer** | workspace_id, external_id, click_id, link_id, affiliate_id, email | Client attribue |
| **LeadEvent** | customer_id, event_name, event_value, metadata | Evenement de conversion (unique par customer+event) |

#### Commissions & Paiements
| Modele | Champs cles | Role |
|--------|-------------|------|
| **Commission** | seller_id, program_id, sale_id, gross_amount, net_amount, commission_amount, platform_fee, status (PENDING/PROCEED/COMPLETE), startup_payment_status (UNPAID/PAID), hold_days, subscription_id, recurring_month | Commission calculee |
| **StartupPayment** | workspace_id, total_amount, seller_total, platform_total, commission_count, stripe_payment_id, status (PENDING/PAID) | Paiement batch startup |
| **GiftCardRedemption** | seller_id, amount, card_type (amazon/itunes/steam/paypal_gift), status (PENDING/PROCESSING/DELIVERED/FAILED) | Echange gift card |
| **Discount** | workspace_id, code, amount, type (PERCENTAGE/FIXED), max_duration | Code promo |

#### Communication & Securite
| Modele | Champs cles | Role |
|--------|-------------|------|
| **Conversation** | workspace_id, seller_id, last_message, unread_startup, unread_seller | Thread de conversation |
| **Message** | conversation_id, sender_type (STARTUP/SELLER), content, is_invitation | Message individuel |
| **WebhookEndpoint** | workspace_id, description, secret | Endpoint webhook Stripe |
| **ProcessedEvent** | event_id (unique), event_type, workspace_id, amount_cents | Idempotence webhooks |
| **RateLimitHit** | workspace_id, ip_address, path, hit_type | Tracking DDoS |

### 4.3 Enums critiques
```
CommissionStatus:  PENDING → PROCEED → COMPLETE
SellerStatus:     PENDING, APPROVED, BANNED
MissionStatus:     DRAFT, ACTIVE, ARCHIVED
MissionVisibility: PUBLIC, PRIVATE, INVITE_ONLY
PayoutMethod:      STRIPE_CONNECT, PAYPAL, IBAN, PLATFORM
CommissionType:    FIXED, PERCENTAGE
RewardStructure:   FLAT, PERCENTAGE
CommissionStructure: ONE_OFF, RECURRING
RewardType:        SALE, LEAD
```

---

## 5. SYSTEME D'AUTHENTIFICATION

### 5.1 Architecture
- **Supabase Auth** : email/password, session JWT
- **Roles** : definis dans `user_metadata` lors du signup
  - `STARTUP` : cree un Workspace, gere missions et sellers
  - `AFFILIATE` : rejoint missions, gagne des commissions

### 5.2 Flux d'authentification
```
SIGNUP STARTUP:
  Email/Password → Supabase Auth → Create User (role=STARTUP)
  → Onboarding → Create Workspace + WorkspaceMember (OWNER) + ApiKey
  → Redirect /dashboard

SIGNUP SELLER:
  Email/Password → Supabase Auth → Create User (role=AFFILIATE)
  → Auto-create global Seller (program_id=null)
  → Redirect /seller/onboarding (4 etapes + Stripe Connect)

LOGIN:
  Email/Password → Supabase session → Cookie → Workspace context
```

### 5.3 Multi-tenant & Workspace
- Chaque startup possede un **Workspace** identifie par un `slug` unique
- Cookie `trac_active_ws` stocke le workspace actif
- Fichier cle : `lib/workspace-context.ts` (300 lignes)
  - `getActiveWorkspaceForUser()` : valide l'acces et cree si necessaire
  - `createWorkspace()` : workspace + membership + API key initiale

### 5.4 API Keys (double systeme)
- **Public Key** (`pk_*`) : cote client, tracking, stockee en clair
- **Secret Key** (`trac_live_*`, `trac_ws_*`) : cote serveur, hashee SHA-256
- **Scopes** : `analytics:read`, `links:write`, `conversions:write`, `admin:*`
- Fichier : `lib/api-keys.ts`

---

## 6. SYSTEME DE TRACKING & ATTRIBUTION

### 6.1 Chaine d'attribution complete
```
1. Seller partage un short link : https://trac.sh/s/{slug}
2. Middleware intercepte → lookup Redis (shortlink:{domain}:{slug})
3. Genere un Click ID : clk_{timestamp}_{16hex}
4. Set cookie 90 jours : trac_click_id
5. Log click dans Tinybird (fire-and-forget)
6. Redirect vers target_url de la mission

7. Client arrive sur le site startup
8. SDK trac.js envoie le click_id avec chaque evenement
9. Lead/Sale → attribution via click_id → link_id → Seller
```

### 6.2 Short Links
- Route : `/s/[slug]`
- Cache Redis : `shortlink:{domain}:{slug}` → `{ url, linkId, workspaceId, affiliateId }`
- Fallback : query Prisma si Redis miss
- Clicks incrementes en base

### 6.3 Click ID
- Format : `clk_{timestamp}_{16hex}` (ex: `clk_1704067200_a1b2c3d4e5f67890`)
- Legacy : `clk_{12alphanum}`
- Stocke dans Redis : `click:{clickId}` → `{ linkId, affiliateId, workspaceId }` (TTL 90 jours)
- Fichier : `lib/click-id.ts`

### 6.4 First-Party Tracking (CNAME Cloaking)
- Startup configure un domaine custom (ex: `track.monstartup.com`)
- CNAME vers `cname.traaaction.com`
- Le middleware sert `trac.js` depuis le domaine custom
- Proxy `/_trac/api/*` → `/api/*` (bypass adblocks)
- Config dans `next.config.ts` (rewrites)

### 6.5 Tinybird (Analytics temps reel)
- **Events inges** : clicks, leads, sales, sale_items
- **Queries** : KPIs, breakdown par pays/device, activity feed
- **Seller RLS** : tokens scopes par seller pour isolation
- Fichier : `lib/analytics/tinybird.ts`

### 6.6 Attribution multi-niveaux (webhook)
```
Priorite lors du traitement d'une vente :
1. clickId depuis session.metadata.tracClickId
2. clickId depuis session.client_reference_id
3. Fallback : lookup Customer par external_id/email → recuperer click_id existant

Resolution click → seller :
1. Redis : click:{clickId} → linkId, affiliateId
2. Tinybird : SQL query sur table clicks
3. ShortLink → MissionEnrollment → user_id → Seller

Regle : first-click attribution (une fois set sur Customer, jamais ecrase)
```

---

## 7. MOTEUR DE COMMISSIONS

### 7.1 Vue d'ensemble
**Fichier critique** : `lib/commission/engine.ts` (519 lignes)

### 7.2 Calcul de commission
```
parseReward("10%") → { type: PERCENTAGE, value: 10 }
parseReward("5EUR")  → { type: FIXED, value: 500 } (en centimes)

Pour PERCENTAGE :
  commission = netAmount * (value / 100)
  Ex: netAmount=10000 cents, reward="10%" → commission=1000 cents (10EUR)

Pour FIXED :
  commission = value (en centimes)
  Ex: reward="5EUR" → commission=500 cents (5EUR)

Platform fee (TOUJOURS) :
  platformFee = netAmount * 0.15
  Ex: netAmount=10000 → platformFee=1500 cents (15EUR)
```

### 7.3 Lifecycle des commissions
```
                    hold_days                Batch payout
    PENDING ──────────────────→ PROCEED ──────────────→ COMPLETE
       │                           │
       │ (refund)                  │ (refund)
       ↓                           ↓
    DELETE                     DELETE + negative balance
```

**Periodes de maturation par type :**
| Type | hold_days | Raison |
|------|-----------|--------|
| **LEAD** | 3 jours | Pas de risque de remboursement |
| **SALE** | 30 jours | Protection contre remboursements/chargebacks |
| **RECURRING** | 30 jours | Protection contre annulations |

| Etat | Signification | Action |
|------|---------------|--------|
| **PENDING** | Commission creee, en attente de maturation | Hold selon type (3j LEAD, 30j SALE/RECURRING) |
| **PROCEED** | Maturee, prete pour payout | Visible dans "due" du seller |
| **COMPLETE** | Payee au seller | Ajoutee au `paid_total` |

### 7.4 Champs Commission
```
commission_amount  : montant pour le seller
platform_fee       : 15% du net pour Traaaction
gross_amount       : montant brut du client
net_amount         : montant net (gross - stripe_fee - tax)
stripe_fee         : frais Stripe
tax_amount         : taxes
hold_days          : jours avant maturation (3 pour LEAD, 30 pour SALE/RECURRING)
subscription_id    : pour recurring
recurring_month    : numero du mois de renouvellement
startup_payment_status : UNPAID | PAID (la startup a-t-elle paye?)
```

### 7.5 Clawback (remboursements)
```
handleClawback({ saleId, reason }):
  Si PENDING ou PROCEED → DELETE la commission
  Si COMPLETE → CREATE entree balance negative + DELETE
  Toujours : recalcul SellerBalance
```

### 7.6 Maturation (Cron)
- **Fichier** : `lib/commission/worker.ts`
- **Endpoint** : `GET /api/cron/mature-commissions`
- **Frequence** : quotidien
- **Logique** : PENDING avec created_at > 30 jours (ou hold_days depasse) → PROCEED

---

## 8. SYSTEME DE PAIEMENT (DOUBLE FLUX)

### 8.1 Flux 1 : Client → Startup (vente normale)
```
Client achete sur le site startup via Stripe Checkout
    ↓
Stripe envoie checkout.session.completed
    ↓
Webhook /api/webhooks/[endpointId] (multi-tenant, secret par workspace)
    ↓
1. Calcul revenue net : gross - stripe_fee - tax
2. Attribution : clickId → Redis/Tinybird → linkId → Seller
3. Ingestion Tinybird (sale + sale_items)
4. Creation Commission (PENDING, hold 30j)
5. Idempotence via ProcessedEvent
```

**Events Stripe geres** :
- `checkout.session.completed` → nouvelle vente
- `invoice.paid` → renouvellement abonnement (recurring)
- `charge.refunded` → clawback

### 8.2 Flux 2 : Startup → Plateforme (paiement commissions)
```
Startup consulte ses commissions impayees (PROCEED + UNPAID)
    ↓
Selectionne les commissions a payer
    ↓
createPaymentSession(commissionIds) :
  - Calcule sellerTotal + platformTotal (15%)
  - Cree StartupPayment (PENDING)
  - Cree Stripe Checkout Session :
    Line Item 1: "Seller Commissions (N ventes)" = sellerTotal
    Line Item 2: "Frais Traaaction (15%)" = platformTotal
    ↓
Startup paye via Stripe
    ↓
Webhook /api/webhooks/startup-payments :
  - confirmStartupPayment()
  - StartupPayment → PAID
  - Commissions → startup_payment_status = PAID
```

### 8.3 Methodes de payout Seller
| Methode | Minimum | Status | Implementation |
|---------|---------|--------|----------------|
| **Stripe Connect** | 10EUR | Production | `stripe.transfers.create()` vers connected account |
| **PayPal** | 10EUR | MVP (manuel) | Payout request logged, admin execute |
| **IBAN/SEPA** | 25EUR | MVP (manuel) | Payout request logged, admin execute |
| **Platform Balance** | 0EUR | Production | Argent reste sur le wallet Traaaction |

**Fichier** : `lib/payout-service.ts` (388 lignes)

### 8.4 Wallet & Gift Cards
- Sellers sans Stripe Connect recoivent sur leur **wallet Traaaction**
- Le wallet ne permet **que l'achat de cartes cadeaux** :
  - Amazon (min 10EUR), iTunes (min 15EUR), Steam (min 20EUR), PayPal Gift (min 10EUR)
- Flow : Seller demande → GiftCardRedemption (PENDING) → Admin fulfills (DELIVERED)
- Fichier : `lib/payout-service.ts` (fonction `requestGiftCard`)
- **Stripe Connect depuis Wallet** : Les sellers peuvent connecter Stripe directement depuis `/seller/wallet`
  - Modal disclaimer : le solde actuel reste sur le wallet (gift cards uniquement)
  - Seuls les gains futurs iront vers Stripe
  - API : `POST /api/seller/connect`

### 8.5 Stripe Connect Setup
- Type : **Express** (onboarding simplifie)
- Fichier : `lib/stripe-connect.ts`
- Flow onboarding seller :
  1. `createConnectAccount()` → cree compte Express + lien onboarding
  2. Seller complete KYC sur Stripe
  3. `checkPayoutsEnabled()` → verifie `payouts_enabled === true`
  4. Seller marque APPROVED, `payouts_enabled_at` set

### 8.6 Batch Payouts (Cron)
- **Fichier** : `lib/commission/payout.ts`
- **Endpoint** : `GET /api/cron/payouts`
- **Frequence** : hebdomadaire (lundi 6h)
- **Logique** :
  1. Agregation PROCEED commissions par seller
  2. Seuil minimum (10EUR Stripe Connect)
  3. `stripe.transfers.create()` pour chaque seller
  4. Commissions → COMPLETE, balance reset

---

## 9. MIDDLEWARE EDGE (CRITIQUE)

**Fichier** : `middleware.ts` (900+ lignes, runtime Edge)

### Responsabilites
1. **Rate Limiting** : Upstash Redis sliding window
   - Links : 100 req/10s par IP
   - API : 1000 req/5min par IP
   - Fail-open (si Redis down, laisse passer)

2. **Routing host-based** : `sellers.traaaction.com` → `/seller/*`

3. **Short Link Redirect** (`/s/*`) :
   - Lookup Redis (fast path)
   - Genere Click ID + cookie 90j
   - Log Tinybird (fire-and-forget)
   - Redirect vers target

4. **First-Party Tracking** :
   - Sert `/trac.js` depuis domaine custom
   - Proxy `/_trac/*` API calls

5. **Domain Verification** :
   - Verifie propriete CNAME
   - Cache Redis (1h TTL)
   - Bloque routes auth sur domaines custom

6. **Session Management** :
   - Refresh Supabase sessions
   - Workspace existence checks
   - Isolation startup vs seller

### Flow de requete
```
Request → Host check → Rate limit → Domain security
  → First-party tracking → Short link redirect
  → Session refresh → Dashboard protection
  → Workspace validation → Seller access control
  → Next.js routing
```

---

## 10. CRON JOBS

| Job | Endpoint | Frequence | Logique |
|-----|----------|-----------|---------|
| **Maturation commissions** | `/api/cron/mature-commissions` | Quotidien | PENDING > 30j → PROCEED |
| **Batch payouts** | `/api/cron/payouts` | Hebdomadaire | PROCEED → Stripe Transfer → COMPLETE |
| **Commission worker** | `/api/cron/commissions` | Variable | Calcul commissions en attente |

Securise par header `CRON_SECRET`.

---

## 11. API ROUTES (REFERENCE)

### Tracking
| Route | Methode | Description |
|-------|---------|-------------|
| `/api/track/click` | POST | Log click affilie (genere click ID, set cookie) |
| `/api/track/lead` | POST | Log lead (attribution, dedup, customer upsert) |

### Conversions
| Route | Methode | Description |
|-------|---------|-------------|
| `/api/conversions/lead` | POST | Conversion lead (API externe) |
| `/api/conversions/sale` | POST | Conversion vente (API externe) |

### Analytics
| Route | Methode | Description |
|-------|---------|-------------|
| `/api/stats/kpi` | GET | KPIs (clicks, leads, sales, revenue) |
| `/api/stats/breakdown` | GET | Breakdown pays/device/browser |
| `/api/stats/activity` | GET | Timeline activite avec enrichissement seller (nom, avatar) - 3 etapes: click_id → link_id → affiliate_id → seller |
| `/api/stats/platform` | GET | Stats plateforme globales |
| `/api/stats/check-installation` | GET | Verif installation SDK |

### Seller
| Route | Methode | Description |
|-------|---------|-------------|
| `/api/seller/analytics` | GET | Analytics earnings seller |
| `/api/seller/connect` | POST | Setup Stripe Connect |
| `/api/seller/wallet` | GET | Solde wallet |
| `/api/seller/withdraw` | POST | Demande retrait |
| `/api/seller/payout-method` | POST | Update methode payout |
| `/api/seller/redeem-gift-card` | POST | Demande gift card |

### Webhooks
| Route | Methode | Description |
|-------|---------|-------------|
| `/api/webhooks/[endpointId]` | POST | Webhook Stripe multi-tenant (ventes, recurring, refunds) |
| `/api/webhooks/startup-payments` | POST | Webhook paiement startup (commissions batch) |

### Cron
| Route | Methode | Description |
|-------|---------|-------------|
| `/api/cron/commissions` | GET | Worker calcul commissions |
| `/api/cron/mature-commissions` | GET | Maturation PENDING → PROCEED |
| `/api/cron/payouts` | GET | Batch payouts hebdomadaires |

### Admin & Autres
| Route | Methode | Description |
|-------|---------|-------------|
| `/api/auth/me` | GET | User courant |
| `/api/auth/verify` | GET | Verifier acces workspace |
| `/api/links/short` | POST | Creer short link |
| `/api/domains/lookup` | GET | Verifier domaine custom |
| `/api/script` | GET | Servir SDK trac.js |
| `/api/admin/api-keys` | GET/POST | Gestion API keys |

---

## 12. SERVER ACTIONS (REFERENCE)

| Fichier | Fonctions principales |
|---------|----------------------|
| **commissions.ts** | `getWorkspaceCommissionStats()`, `getWorkspaceCommissions()`, `getPendingGiftCardRequests()`, `fulfillGiftCard()` |
| **sellers.ts** | `getMySellers()`, `getAllPlatformSellers()`, `getSellerProfile()`, `createGlobalSeller()`, `claimSellers()`, `getSellerDashboard()` |
| **payouts.ts** | `getUnpaidCommissions()`, `createPaymentSession()`, `confirmStartupPayment()`, `getPayoutHistory()`, `checkPaymentStatus()` |
| **missions.ts** | `createMissionFromWizard()`, `createMission()`, `getWorkspaceMissions()`, `updateMissionStatus()`, `deleteMission()`, `getMissionDetails()`, `addMissionContent()` |
| **marketplace.ts** | `getAffiliateStatsFromTinybird()`, `getAllMissions()`, `joinMission()`, `getMyEnrollments()` |
| **seller-onboarding.ts** | `saveOnboardingStep1()`, `saveOnboardingStep2()`, `createStripeConnectAccount()`, `completeOnboarding()`, `getOnboardingStatus()` |
| **messaging.ts** | `getConversations()`, `getMessages()`, `sendMessage()`, `initializeConversation()`, `markAsRead()`, `createInvitationMessage()` |
| **dashboard.ts** | `getLastEvents()` (mix clicks Tinybird + enrollments + commissions) |
| **links.ts** | `createShortLink()`, `getWorkspaceLinks()` |
| **locale.ts** | `setLocale()`, `getLocale()` |
| **workspace.ts** | Operations CRUD workspace |

---

## 13. REGLES METIER CRITIQUES

| Regle | Detail |
|-------|--------|
| **Platform fee** | 15% du net (apres Stripe fees + taxes), sur CHAQUE vente |
| **Hold period LEAD** | 3 jours avant maturation (pas de risque remboursement) |
| **Hold period SALE/RECURRING** | 30 jours avant maturation (protection chargebacks) |
| **Maturation** | PENDING → PROCEED apres hold_days (3j LEAD, 30j SALE/RECURRING) |
| **First-click attribution** | Une fois set sur Customer, jamais ecrase par clicks ulterieurs |
| **Refund PENDING/PROCEED** | Commission supprimee |
| **Refund COMPLETE** | Balance negative creee + commission supprimee |
| **Minimum payout Stripe** | 10EUR |
| **Minimum payout IBAN** | 25EUR |
| **Minimum platform** | 0EUR (pas de minimum) |
| **Wallet sans Stripe** | Argent sur wallet = uniquement gift cards |
| **Wallet → Stripe** | Solde existant NON transferable vers Stripe, seuls les gains futurs |
| **Cookie tracking** | 90 jours de duree |
| **Idempotence webhooks** | Table ProcessedEvent (event_id unique) |
| **Multi-tenant webhooks** | Secret Stripe par workspace (pas en env var) |
| **Seller approval** | Seuls les sellers APPROVED recoivent des commissions |
| **Commission types** | FIXED (flat EUR) ou PERCENTAGE (% du net) |
| **Recurring** | Commission sur chaque renouvellement abonnement |
| **Batch payouts** | Hebdomadaire, agrega par seller |

---

## 14. DESIGN SYSTEM & UI

### Dashboard Startup
- **Layout** : Sidebar fixe (desktop) / drawer mobile avec backdrop blur
- **Composant** : `components/dashboard/Sidebar.tsx`
- **Responsive** : Sidebar cachee sur mobile (`hidden md:block`), drawer anime (`animate-in slide-in-from-left`)
- **Collapse toggle** : Etat persiste dans localStorage

### Dashboard Seller (Design strict Traaaction)
- **Layout** : Sidebar collapsible avec drawer mobile
- **Responsive** : Meme pattern que startup dashboard (drawer + backdrop)
- **Constantes** :
  - Sidebar expanded : `w-[260px]`
  - Sidebar collapsed : `w-[68px]`
  - Mobile drawer : `w-64 bg-white shadow-xl`

### Constantes design
```tsx
const DS = {
  sidebar: { expanded: 'w-[260px]', collapsed: 'w-[68px]', bg: 'bg-white' },
  content: { bg: 'bg-[#FAFAFA]' },
  mobile: { drawer: 'w-64 bg-white shadow-xl' }
}
```

### Animations & Effects
- Glassmorphic navigation (`.glass-nav`)
- Shimmer loading (`.animate-shimmer`)
- Smooth scrolling global
- Framer Motion pour transitions

### Profile Completion Bar (Seller Settings)
Design moderne glass-morphic avec :
- Ambient glow gradient (violet → fuchsia → amber)
- Circular SVG progress ring avec stroke gradient
- Expandable task cards avec états visuels
- 6 champs requis : Country, Social media, Description, Industry interests, Activity type, How you work
- CV et Portfolio sont optionnels

---

## 15. ETAT ACTUEL DU DEVELOPPEMENT

### ✅ Migration Partner → Seller COMPLETEE (100%)

**Date de completion** : Janvier 2025

La migration du naming "Partner" vers "Seller" a ete completee a 100%. Cette migration incluait :

#### Fichiers critiques modifies
1. **Navigation & Layouts**
   - `app/seller/layout.tsx` - Tous les liens de navigation (rail + sidebar contextuelle)
   - `app/marketplace/layout.tsx` - Lien retour seller

2. **Pages Seller**
   - `app/seller/page.tsx` - Liens vers details mission
   - `app/seller/wallet/page.tsx` - Lien retour dashboard
   - `app/seller/onboarding/page.tsx` - Redirect apres onboarding → `/seller`
   - `app/seller/marketplace/page.tsx` - Lien "View Resources"
   - `app/seller/marketplace/[missionId]/page.tsx` - Liens retour marketplace

3. **Auth & Callbacks**
   - `app/auth/callback/route.ts` - Redirect seller apres confirmation email → `/seller`
   - `app/auth/choice/page.tsx` - Page choix startup/seller

4. **Integrations externes**
   - `lib/stripe-connect.ts` - URLs Stripe Connect (refresh_url, return_url) → `/seller/payouts`

5. **Server Actions**
   - `app/actions/messaging.ts` - revalidatePath → `/seller/messages`
   - `app/actions/marketplace.ts` - revalidatePath → `/seller` et `/seller/marketplace`

6. **Configuration**
   - `next.config.ts` - Rewrites white-label domains → `/seller/*`
   - `middleware.ts` - Reserved slugs (ajout de `'sellers'`), exception pour `/seller/onboarding`
   - `app/actions/seller-onboarding.ts` - Fix bug `'current-user'` dans `getOnboardingStatus()`

#### Flux d'authentification seller maintenant fonctionnel
```
SIGNUP SELLER:
  Email/Password → Supabase Auth → Create User (role=AFFILIATE)
  → Auto-create global Seller (program_id=null)
  → Email confirmation → Callback → /seller/onboarding
  → Complete 4 steps + Stripe Connect
  → Redirect /seller (dashboard seller)

NAVIGATION SELLER:
  Tous les liens fonctionnent correctement :
  - Rail nav: Programs (/seller), Payouts, Members, Messages
  - Sidebar Programs: Programs, Marketplace, Invitations
  - Sidebar Profile: Profile, Members, Account, Notifications
```

#### Routes seller principales
| Route | Description | Status |
|-------|-------------|--------|
| `/seller` | Dashboard seller (programmes rejoints) | ✅ Fonctionnel |
| `/seller/marketplace` | Browse missions disponibles | ✅ Fonctionnel |
| `/seller/marketplace/[id]` | Details mission + resources | ✅ Fonctionnel |
| `/seller/payouts` | Historique gains et withdrawals | ✅ Fonctionnel |
| `/seller/wallet` | Solde, gift cards, Stripe Connect | ✅ Fonctionnel |
| `/seller/messages` | Messagerie avec startups | ✅ Fonctionnel |
| `/seller/profile` | Profil seller public | ✅ Fonctionnel |
| `/seller/members` | Gestion equipe seller | ✅ Fonctionnel |
| `/seller/account` | Parametres compte | ✅ Fonctionnel |
| `/seller/onboarding` | Onboarding 4 etapes | ✅ Fonctionnel |

### ✅ Traduction Seller Dashboard en Anglais (100%)

**Date de completion** : Février 2026

Toutes les pages du dashboard seller ont été traduites du français vers l'anglais :

#### Pages traduites
- `app/seller/onboarding/page.tsx` - Onboarding 4 étapes
- `app/seller/payouts/page.tsx` - Historique des paiements
- `app/seller/marketplace/page.tsx` - Browse missions
- `app/seller/marketplace/[missionId]/page.tsx` - Détails mission
- `app/seller/wallet/page.tsx` - Wallet et gift cards
- `app/seller/gift-cards/page.tsx` - Catalogue gift cards
- `app/seller/page.tsx` - Dashboard principal
- `app/seller/programs/[missionId]/page.tsx` - Détails programme rejoint
- `app/seller/settings/page.tsx` - Paramètres profil

### ✅ Redesign Profile Completion Bar (100%)

**Date de completion** : Février 2026

Refonte complète de la barre de complétion de profil dans `app/seller/settings/page.tsx` :

#### Nouveau design
- **Ambient glow effect** : Halo gradient violet → fuchsia → amber qui s'intensifie au hover
- **Glass-morphic dark card** : Background slate gradient avec bordure white/10
- **Top accent gradient line** : Ligne 2px en haut (violet → fuchsia → amber)
- **Circular SVG progress ring** : Indicateur de progression avec stroke gradient et pourcentage
- **Dynamic messaging** : "Almost there!" avec nombre exact d'étapes restantes
- **Expandable task cards** : Chaque tâche a sa propre carte avec état emerald pour les complétées
- **Helper text** : Rappel que CV et Portfolio sont optionnels

#### Champs requis (6 total)
```typescript
const PROFILE_TASKS = [
    { id: 'country', label: 'Country' },
    { id: 'social_media', label: 'At least one social media' },
    { id: 'description', label: 'Profile description' },
    { id: 'industry_interests', label: 'Industry interests' },
    { id: 'activity_type', label: 'Activity type' },
    { id: 'how_you_work', label: 'How you work' },
]
```

**Note** : CV et Portfolio ne sont PAS obligatoires pour la validation du profil.

### ✅ Stripe Connect depuis Wallet (100%)

**Date de completion** : Février 2026

Ajout de la possibilité de connecter Stripe directement depuis la page Wallet :

#### Fonctionnalités
- **Carte "Connect Stripe"** : Carte sombre visible en bas de page (quand pas connecté)
- **Modal disclaimer** : S'affiche au clic avec avertissement important
- **Avertissement funds** : Le solde actuel du wallet ne peut pas être transféré vers Stripe
- **Explication** : Seuls les gains futurs iront vers Stripe
- **Avantages listés** : Paiements auto, virement direct, pas de minimum
- **Flow** : Clic → Modal → Confirmation → Redirect vers Stripe Onboarding

#### Fichiers modifiés
- `app/seller/wallet/page.tsx` : Ajout modal + bouton Connect Stripe
- `app/seller/layout.tsx` : Suppression du WalletButton dans le header payouts

### ✅ Activity Feed avec Attribution Seller COMPLETE (100%)

**Date de completion** : Janvier 2026

Implementation d'un feed d'activite en temps reel affichant les clicks, leads et sales avec attribution correcte des sellers.

#### Composant ActivityFeed
**Fichier** : `components/dashboard/ActivityFeed.tsx`

- **Design compact** : Avatars 32px, texte xs/10px, hauteur max 450px (~8 events visibles)
- **Auto-refresh** : Rechargement automatique toutes les 30 secondes
- **Enrichissement seller** : Affiche nom et avatar du seller pour chaque event
- **Real-time** : Events tries par timestamp DESC (plus recents en premier)
- **Types d'events** :
  - Click (violet) : "triggered a click"
  - Lead (blue) : "generated a lead" avec eventName si disponible
  - Sale (green) : "made a sale" avec montant en EUR

#### Integration Dashboard
**Fichier** : `app/dashboard/page.tsx`

- **Layout 50/50** : Globe geographique + Activity feed en grille
- Globe reduit a moitie de page (au lieu de pleine largeur)
- Activity feed sur la droite, meme hauteur que le globe

#### API Activity Enrichie
**Fichier** : `app/api/stats/activity/route.ts`

Enrichissement en 3 etapes avec gestion correcte des sellers :

**Etape 0** : Fetch events depuis Tinybird
- Clicks : colonnes incluent `affiliate_id` (critique)
- Leads : via table `leads`
- Sales : via table `sales`
- Gestion Tinybird NULL : traite `\N` comme null

**Etape 1** : Enrichissement link_id
- Leads/Sales : lookup click_id pour obtenir link_id
- Map click_id → link_id via Tinybird

**Etape 2** : Enrichissement affiliate_id
- Lookup ShortLink par link_id pour obtenir affiliate_id
- Map link_id → affiliate_id via Prisma

**Etape 3** : Enrichissement seller info
- Query Seller par user_id (affiliate_id)
- Query SellerProfile pour avatars
- **Fix critique** : Relation Prisma `Seller` (majuscule) au lieu de `seller`
- Fallback : email sans domaine si pas de nom

#### Bugs Fixes
1. **Prisma relation case sensitivity** : `seller` → `Seller` dans SellerProfile query
2. **Tinybird NULL handling** : Detection de `\N` comme valeur NULL
3. **React keys** : Cles composites `${type}-${timestamp}-${index}` pour unicite
4. **Avatar fallback** : Initiale du nom avec gradient violet/purple

#### Resultats
- Affichage correct des noms de sellers (ex: "Lucas roncey")
- Avatars affiches quand disponibles
- Events enrichis avec metadata (montant vente, nom event lead)
- Performance optimale avec cache Redis/Tinybird

### ✅ Internationalisation i18n (FR/EN/ES) COMPLETE (100%)

**Date de completion** : Fevrier 2026

Support complet de 3 langues sur toute la plateforme.

#### Implementation technique
- **Librairie** : `next-intl` v4.8.2
- **Config** : `i18n/config.ts` (locales: en, fr, es, default: en)
- **Request handler** : `i18n/request.ts` (lecture cookie `NEXT_LOCALE`)
- **Plugin** : `next.config.ts` integre `withNextIntl`
- **Layout racine** : `app/layout.tsx` wrappe avec `NextIntlClientProvider`
- **Persistence** : Cookie `NEXT_LOCALE` avec max-age 1 an

#### Fichiers de traduction
- `messages/en.json` - Anglais (~2100 lignes, 1527 clés)
- `messages/fr.json` - Francais (~2100 lignes, 1527 clés)
- `messages/es.json` - Espagnol (~2100 lignes, 1527 clés)

#### Namespaces de traduction (18 total)
```
common (53), nav (11), auth (43), landing (95), onboarding (33),
dashboard (542), seller (110), messages (15), notifications (9), errors (9),
about (43), sellerTerms (16), startupTerms (18), startupTermsPage (149),
reportAbuse (48), sellerTermsPage (168), privacyPage (164), termsPage (197)
```

#### Composant LanguageSelector
- **Fichier** : `components/LanguageSelector.tsx`
- **Variants** : `'default'` (dropdown standard) et `'minimal'` (compact)
- **Integration** : Footer avec `openDirection="up"` pour eviter coupure
- **Server action** : `app/actions/locale.ts` (setLocale / getLocale)

#### Pages traduites
- Toutes les pages landing (Hero, Features, B2BFeatures, FAQ, Footer, Navbar)
- Toutes les pages dashboard startup
- Toutes les pages dashboard seller
- Page integration
- Page login (`/login`) - selection user type, formulaire login/signup, confirmation email
- Pages legales : `/terms`, `/privacy`, `/seller-terms`, `/startup-terms`
- Pages statiques : `/about`, `/report-abuse`

### ✅ Responsive Design Dashboard COMPLETE (100%)

**Date de completion** : Fevrier 2026

Toutes les pages dashboard (startup + seller) sont entierement responsives.

#### Patterns implementes
- **Mobile drawer** : Menu lateral anime avec backdrop blur
- **Escape key** : Ferme le menu mobile
- **Body scroll prevention** : Quand menu ouvert
- **Desktop sidebar** : `hidden md:block` sur mobile
- **Animation** : `animate-in slide-in-from-left`
- **Collapse toggle** : Etat persiste dans localStorage
- **Grilles responsives** : `md:` breakpoints partout
- **Padding adaptatif** : `px-4 md:px-6`
- **Texte adaptatif** : `text-sm md:text-base`

#### Fichiers modifies
- `app/dashboard/layout.tsx` - Layout responsive startup
- `app/seller/layout.tsx` - Layout responsive seller
- Toutes les pages dashboard (commissions, sellers, payouts, messages, etc.)
- Tous les composants landing

### ✅ Redesign Messages Startup avec Avatars Seller (100%)

**Date de completion** : Fevrier 2026

Refonte de la page messages du dashboard startup.

#### Fonctionnalites
- **Avatars seller** : Affichage dans la liste de conversations (champ `partner_avatar`)
- **Conversation routing** : Via `useSearchParams()` pour navigation directe
- **Suspense boundary** : Loading fallback pour UX fluide
- **Read/unread tracking** : Compteur de messages non lus
- **Auto-scroll** : Vers le dernier message
- **Invitation messages** : Support des messages d'invitation
- **Avatar fallback** : Initiale avec gradient pour sellers sans photo

### ✅ Pages Legales i18n COMPLETE (100%)

**Date de completion** : Fevrier 2026

6 pages legales/statiques avec design editorial, toutes entierement traduites (FR/EN/ES).

#### Terms of Service (`/terms`) - 197 clés
- **Namespace** : `termsPage`
- **Design** : Editorial avec sidebar navigation a gauche
- **Structure** : 16 sections principales (acceptance, description, accounts, fees, commissions, etc.)
- **Features** : Scroll progress bar, section active highlighting, tables dynamiques via traductions

#### Privacy Policy (`/privacy`) - 164 clés
- **Namespace** : `privacyPage`
- **Design** : Editorial light theme avec gradient violet
- **Structure** : 14 sections RGPD (data controller, collection, cookies, rights, etc.)
- **Features** : Tables de cookies, service providers, durees de retention

#### Seller Terms (`/seller-terms`) - 168 clés
- **Namespace** : `sellerTermsPage`
- **Design** : Theme emerald
- **Structure** : 9 sections (eligibility, obligations, commissions, hold periods, prohibited, etc.)
- **Features** : Table des methodes de payout, periodes de maturation

#### Startup Terms (`/startup-terms`) - 149 clés
- **Namespace** : `startupTermsPage`
- **Design** : Theme bleu
- **Structure** : 11 sections (eligibility, obligations, programs, fees, tracking, etc.)
- **Features** : Table des frais, etapes du processus de paiement

#### About (`/about`) - 43 clés
- **Namespace** : `about`
- **Design** : Theme amber
- **Structure** : Mission, How it Works (3 etapes), Values (4 valeurs), Team (3 cofounders)
- **Features** : Icons dynamiques, rich text avec highlights

#### Report Abuse (`/report-abuse`) - 48 clés
- **Namespace** : `reportAbuse`
- **Design** : Theme rouge
- **Structure** : Types d'abus (10 categories), formulaire de signalement
- **Features** : Dropdown traduit, mailto dynamique, success state

### ✅ Login Page i18n COMPLETE (100%)

**Date de completion** : Fevrier 2026

Page de login/signup entierement traduite avec namespace `auth` (43 clés).

#### Sections traduites
- **User type selection** : Welcome message, Startup/Seller cards avec descriptions
- **Login form** : Titre, sous-titre dynamique, labels (Email, Password, Full name)
- **Signup form** : Titre, sous-titre, indication caracteres minimum
- **Google sign-in** : Bouton "Continue with Google"
- **Email confirmation** : Titre, instructions, bouton resend, helper text
- **Legal footer** : Rich text avec liens Terms/Privacy via `t.rich()`
- **Navigation** : Back, Home
- **Error messages** : 11 messages d'erreur traduits (linkExpired, emailConflict, etc.)

#### Implementation technique
- `useTranslations('auth')` dans `/app/login/page.tsx`
- Rich text pour le legal footer : `<terms>...</terms>` et `<privacy>...</privacy>`
- Messages d'erreur mappes depuis les URL params vers les clés de traduction
- Type dynamique dans les sous-titres : `{type}` remplace par Startup/Seller

### ✅ Landing Page Enhancements COMPLETE (100%)

**Date de completion** : Fevrier 2026

#### Nouveaux composants landing
- `MissionSelector.tsx` - Selecteur interactif de type de mission
- `AdvancedFeatures.tsx` - Showcase fonctionnalites avec tabs

#### Composition de la landing (`app/page.tsx`)
```
<Navbar /> → <Hero /> → <Logos /> → <MissionSelector /> → <B2BFeatures /> → <Features /> → <FAQ />
```

#### Calendly Integration
- CTA "Book a Demo" dans Hero et FAQ
- Lien : `https://calendly.com/contact-traaaction/30min`
- Ouverture dans nouvel onglet

### ✅ Integration Page Redesign (100%)

**Date de completion** : Fevrier 2026

Refonte de `/dashboard/integration` avec design Apple-inspired minimaliste.

#### Nouveau design
- Layout en sections numerotees (01, 02, 03...)
- Sections expandable/collapsible avec icones
- Code blocks avec boutons copy sur fond dark (`bg-neutral-950`)
- Responsive typography pour mobile
- Integration WebhookManager component

### Fichiers recemment modifies (commites)
- `app/login/page.tsx` - **UPDATED** Full i18n avec useTranslations('auth')
- `app/terms/page.tsx` - **UPDATED** i18n avec useTranslations('termsPage')
- `app/privacy/page.tsx` - **UPDATED** i18n avec useTranslations('privacyPage')
- `app/seller-terms/page.tsx` - **UPDATED** i18n avec useTranslations('sellerTermsPage')
- `app/startup-terms/page.tsx` - **UPDATED** i18n avec useTranslations('startupTermsPage')
- `app/about/page.tsx` - **UPDATED** Fix hardcoded strings (headerLabel, footer.allRightsReserved)
- `app/report-abuse/page.tsx` - **UPDATED** Fix hardcoded strings (headerLabel, footer.*)
- `messages/en.json` - **UPDATED** +762 nouvelles clés (legal pages + auth errors)
- `messages/fr.json` - **UPDATED** +762 nouvelles clés
- `messages/es.json` - **UPDATED** +762 nouvelles clés

### Focus actuel
Le developpement est concentre sur :

1. **Systeme de paiement startup → seller** :
   - Comment la startup paye les commissions des sellers
   - Integration du flux de paiement batch via Stripe Checkout
   - Webhook de confirmation des paiements startup
   - Distinction startup_payment_status (UNPAID/PAID) sur chaque commission

### ✅ Securite SQL Injection Fix (100%)

**Date de completion** : Février 2026

Correction des vulnerabilites d'injection SQL dans les requetes Tinybird.

#### Probleme
Les requetes Tinybird utilisaient l'interpolation directe de variables utilisateur :
```javascript
// AVANT (vulnerable)
WHERE click_id = '${clickId}'  // clickId vient du body HTTP
```

#### Solution
Creation d'une bibliotheque de sanitization `lib/sql-sanitize.ts` :
- `sanitizeClickId()` : Valide format `clk_{timestamp}_{hex}` ou `clk_{alphanum}`
- `sanitizeUUID()` : Valide format UUID standard
- `sanitizeLinkId()` : Valide UUID, CUID, NanoID
- `sanitizeExternalId()` : Valide ou echappe les IDs externes

#### Fichiers corriges
- `app/api/track/lead/route.ts` - clickId du body
- `app/api/webhooks/[endpointId]/route.ts` - clickId et workspaceId
- `app/actions/customers.ts` - tous les IDs dans les requetes Tinybird
- `app/api/stats/check-installation/route.ts` - workspaceId

#### Comportement
- IDs valides : passent sans modification
- IDs invalides : rejetes avec log warning, requete Tinybird ignoree
- Tracking continue de fonctionner normalement

### ✅ Hold Days Commissions Update (100%)

**Date de completion** : Février 2026

Mise a jour des periodes de maturation des commissions :

| Type | Avant | Apres | Raison |
|------|-------|-------|--------|
| LEAD | 3 jours | 3 jours | Inchange (pas de remboursement) |
| SALE | 7 jours | 30 jours | Protection chargebacks Stripe |
| RECURRING | 7 jours | 30 jours | Protection annulations |

#### Fichiers modifies
- `lib/commission/engine.ts` - Default holdDays: 7 → 30
- `app/api/webhooks/[endpointId]/route.ts` - SALE et RECURRING: 7 → 30

### Notes importantes post-migration
- **Dashboard startup** : Le dossier `/dashboard/sellers/*` gere les sellers du point de vue startup
- **Dashboard seller** : Le dossier `/seller/*` est le dashboard des sellers eux-memes
- **Middleware** :
  - Le slug `'sellers'` est maintenant dans `reservedSlugs` (ligne 769)
  - Exception pour `/seller/onboarding` : pas de verification de role (la page gere elle-meme)
  - Correction redirect `/onboarding/choice` → `/auth/choice` (ligne 827)
  - Toutes les references `hasPartner` remplacees par `hasSeller`
- **Naming** : Utiliser systematiquement "Seller" (pas "Partner" ou "Affiliate")
- **Routes obsoletes** : Toutes les references a `/partner/*` ont ete remplacees par `/seller/*`
- **Bug fixes** :
  - `getOnboardingStatus('current-user')` fonctionne maintenant correctement
  - Signup seller redirige correctement vers `/seller/onboarding` sans boucle de redirection

---

## 16. SCRIPTS & COMMANDES

```bash
# Developpement
npm run dev           # Serveur dev

# Build
npm run build         # Build production
npm run start         # Serveur production

# Base de donnees
npm run db:push       # Push schema vers DB
npm run db:migrate    # Creer migration
npm run db:generate   # Generer types Prisma
npm run db:seed       # Seed data

# Lint
npm run lint          # ESLint
```

---

## 17. SECURITE

| Aspect | Implementation |
|--------|---------------|
| **Auth** | Supabase JWT, cookie HttpOnly, refresh middleware |
| **RBAC** | Startup vs Seller, isolation via middleware |
| **Rate Limiting** | Upstash Redis, sliding window, per-IP |
| **Webhook** | Signature Stripe HMAC, secret par workspace |
| **Idempotence** | ProcessedEvent table, upsert on sale_id |
| **API Keys** | Secret hashe SHA-256, scopes granulaires |
| **CSRF** | Protection native Server Actions Next.js |
| **Domain** | Verification DNS, cache 1h, blocage routes auth |
| **Multi-tenant** | Workspace isolation sur toutes les queries |
| **SQL Injection** | Sanitization des inputs Tinybird via `lib/sql-sanitize.ts` |

---

> **RAPPEL IMPORTANT POUR CLAUDE** : Ce document doit etre systematiquement mis a jour apres chaque modification significative du projet.
>
> **Ne jamais oublier de mettre a jour ce fichier quand tu :**
> - Crees, supprimes ou renommes des fichiers/routes importants
> - Modifies le schema Prisma ou la structure de donnees
> - Changes des regles metier, des enums, ou des constantes critiques
> - Ajoutes de nouvelles fonctionnalites majeures
> - Modifies l'architecture ou la stack technique
> - Effectues des migrations importantes (comme Partner → Seller)
>
> **Action requise** : Toujours proposer la mise a jour de claude.md a la fin d'une tache importante, ou la faire automatiquement si pertinent.
