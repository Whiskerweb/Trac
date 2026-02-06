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
| **SALE** | Achat client | Flat ou % du net |
| **LEAD** | Inscription/action | Flat uniquement |
| **RECURRING** | Abonnement mensuel | Commission par renouvellement |

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
├── dashboard/          # Startup: missions, sellers, commissions, payouts, messages, settings
├── seller/             # Seller: marketplace, wallet, payouts, profile, settings, onboarding
├── admin/              # Admin: feedback, treasury, gift-cards, sellers, payouts
├── api/
│   ├── auth/           # me, verify, user-roles
│   ├── track/          # click, lead
│   ├── feedback/       # POST (submit), GET (list), PATCH (update status)
│   ├── webhooks/       # [endpointId] (Stripe), startup-payments
│   ├── cron/           # commissions, mature-commissions, payouts
│   └── seller/         # connect, wallet, withdraw, payout-method
├── actions/            # Server Actions (commissions, sellers, payouts, missions, messaging, etc.)
└── [pages legales]     # terms, privacy, seller-terms, startup-terms, about, report-abuse

components/
├── FeedbackWidget.tsx  # Widget feedback flottant (MVP)
├── dashboard/          # Sidebar, ActivityFeed, charts
├── landing/            # Navbar, Hero, Features, FAQ
└── seller/             # ProfileCompletionBanner

lib/
├── commission/engine.ts  # Moteur commissions (CRITIQUE)
├── stripe-connect.ts     # Setup Stripe Connect
├── payout-service.ts     # Orchestration payouts
├── admin.ts              # Admin email whitelist
├── sql-sanitize.ts       # Protection injection SQL
└── analytics/tinybird.ts # API Tinybird
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
Feedback (standalone) → user feedback avec attachments
```

### Modeles cles
| Modele | Role |
|--------|------|
| **Workspace** | Tenant startup (1 par startup) |
| **Mission** | Programme d'affiliation avec rewards |
| **Seller** | Affilie avec stripe_connect_id, payout_method |
| **Commission** | Ledger: gross/net/commission/platform_fee, status, hold_days |
| **Customer** | Attribution first-click permanente |
| **Feedback** | Feedback utilisateur MVP (message, attachments, voice, status) |

### Enums critiques
```
CommissionStatus: PENDING → PROCEED → COMPLETE
SellerStatus: PENDING, APPROVED, BANNED
MissionVisibility: PUBLIC, PRIVATE, INVITE_ONLY
PayoutMethod: STRIPE_CONNECT, PAYPAL, IBAN, PLATFORM
FeedbackStatus: NEW, REVIEWED, RESOLVED, ARCHIVED
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
- Une fois set sur Customer, jamais ecrase

---

## 7. COMMISSIONS

### Calcul
```
PERCENTAGE: commission = netAmount * (value / 100)
FIXED: commission = value (en centimes)
Platform fee: TOUJOURS 15% du net
```

### Lifecycle
```
PENDING (hold) → PROCEED (mature) → COMPLETE (paid)
     ↓ refund        ↓ refund
   DELETE      DELETE + negative balance
```

### Hold periods
| Type | Hold | Raison |
|------|------|--------|
| LEAD | 3j | Pas de remboursement |
| SALE | 30j | Protection chargebacks |
| RECURRING | 30j | Protection annulations |

---

## 8. PAIEMENTS

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

## 9. MIDDLEWARE (CRITIQUE)

**Fichier**: `middleware.ts` (~900 lignes, Edge runtime)

Responsabilites:
1. Rate limiting (Redis sliding window)
2. Short link redirect + Click ID
3. First-party tracking (CNAME cloaking)
4. Session refresh Supabase
5. Workspace/Seller isolation

---

## 10. FONCTIONNALITES COMPLETEES

### Core
- [x] Migration Partner → Seller (100%)
- [x] Dashboard Startup complet
- [x] Dashboard Seller complet
- [x] Onboarding Seller 4 etapes + Stripe Connect
- [x] Stripe Connect depuis Wallet
- [x] Activity Feed avec attribution seller
- [x] Messagerie startup ↔ seller

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

### Securite
- [x] SQL injection fix (lib/sql-sanitize.ts)
- [x] Hold days: SALE/RECURRING 7→30 jours

### MVP Features
- [x] **Feedback System** (Fevrier 2026)
  - Widget flottant sur dashboards (`components/FeedbackWidget.tsx`)
  - Text, file attachments, voice recording
  - Admin page `/admin/feedback` (theme dark)
  - API: POST/GET `/api/feedback`, PATCH `/api/feedback/[id]`
  - Status: NEW → REVIEWED → RESOLVED → ARCHIVED
  - Protection admin via email whitelist

---

## 11. REGLES METIER CRITIQUES

| Regle | Detail |
|-------|--------|
| Platform fee | 15% du net sur CHAQUE vente |
| Hold LEAD/SALE/RECURRING | 3j / 30j / 30j |
| First-click attribution | Jamais ecrase une fois set |
| Wallet sans Stripe | Gift cards uniquement |
| Wallet → Stripe | Solde NON transferable, gains futurs only |
| Cookie tracking | 90 jours |
| Admin access | Email whitelist (`lib/admin.ts`) |

---

## 12. COMMANDES

```bash
npm run dev              # Dev server
npm run build            # Production build
npm run db:push          # Push schema
npm run db:generate      # Generate Prisma client
npm run lint             # ESLint
```

---

## 13. SECURITE

| Aspect | Implementation |
|--------|---------------|
| Auth | Supabase JWT, cookie HttpOnly |
| RBAC | Startup vs Seller vs Admin |
| Rate Limiting | Upstash Redis |
| Webhooks | Signature Stripe HMAC par workspace |
| SQL Injection | Sanitization Tinybird (`lib/sql-sanitize.ts`) |
| Admin | Email whitelist |

---

> **RAPPEL** : Mettre a jour ce fichier apres chaque modification significative.
