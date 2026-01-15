# Architecture Techniques & Diagrammes - Dub.co vs Traaaction.com

## 1. ARCHITECTURE GLOBALE : CLICK-TO-COMMISSION FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AFFILIATE ATTRIBUTION SYSTEM                        │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 1: CLICK REGISTRATION
═══════════════════════════════════════════════════════════════════════════════

 Partner Site                     Dub Redirect Layer              Startup Site
 (yourcompany.link)               (Middleware)                   (startup.com)
 
    ┌──────────────┐               ┌──────────────┐              ┌──────────┐
    │  User Click  │               │  Extract:    │              │  Store   │
    │              │               │  - via param │              │  dub_id  │
    │ yourcompany  │──────────────▶│  - utm_*     │─────────────▶│  Cookie  │
    │ .link/promo  │               │              │              │          │
    │              │               │  Generate:   │              │  Create: │
    └──────────────┘               │  - clickId   │              │  Session │
                                   │  - timestamp │              │ context  │
                                   │              │              └──────────┘
                                   │  Store:      │
                                   │  - clicks DB │
                                   │  - Redis     │
                                   └──────────────┘
```

---

## 2. COOKIE LIFECYCLE & SESSION MANAGEMENT

```
TIME AXIS (Days)
┌─────────────────────────────────────────────────────────────────────┐
│ 0          15          30          60          90         100        │
└─────────────────────────────────────────────────────────────────────┘

SCENARIO 1: Single Session (Same Day)
════════════════════════════════════════════════════════════════════════

T0: User clicks partner link
   ├─ Set cookie: dub_id=click_abc123xyz
   │  expires: T0 + 90 days
   │  domain: .startup.com
   │  sameSite: Lax
   └─ Cookie active: ✓

T0+1h: User converts
   ├─ Read cookie: dub_id (still exists)
   ├─ Send conversion with clickId
   └─ Attribution: ✓ MATCHED


SCENARIO 2: Interrupted Session (Multi-Day)
════════════════════════════════════════════════════════════════════════

T0: Click → Set cookie
   └─ Cookie active: ✓

T0+7d: User closes browser, comes back
   ├─ Cookie persists (domain=.startup.com)
   ├─ sessionStorage cleared (different tab/window)
   └─ Cookie active: ✓

T0+7d+2h: Convert on different page
   ├─ Read cookie: dub_id (STILL VALID!)
   ├─ Send conversion
   └─ Attribution: ✓ MATCHED (last-click)


SCENARIO 3: Cross-Domain (Partner → Startup)
════════════════════════════════════════════════════════════════════════

T0: yourcompany.link/promo
   ├─ Dub middleware generates: clickId=click_abc123
   ├─ Set cookie on: yourcompany.link domain
   │  └─ dub_id=click_abc123xyz
   └─ Redirect to: startup.com?dub_id=click_abc123xyz

T0+1s: startup.com loaded
   ├─ Script detects: ?dub_id=click_abc123xyz in URL
   ├─ Set cookie on: startup.com domain (different domain!)
   │  └─ dub_id=click_abc123xyz (SAME VALUE)
   ├─ Store: sessionStorage['via']='john_partner'
   └─ Browser cookies:
      ├─ yourcompany.link: dub_id=click_abc123xyz (from partner)
      └─ startup.com: dub_id=click_abc123xyz (from handshake)

T0+1h: Convert
   ├─ Read startup.com cookie: dub_id=click_abc123xyz
   ├─ Send to server with clickId
   └─ Attribution: ✓ MATCHED
```

---

## 3. DATA ATTRIBUTE RESOLUTION

```
Scenario: How does Dub know which workspace this is?

Method 1: data-domains contains workspace markers
  ├─ data-domains='{"refer": "acme.link"}'
  │  └─ Dub recognizes: "acme.link" ← unique per customer
  │     └─ Lookup in database: workspace_id = ws_acme123
  │        └─ Load workspace config (domains, rate limits, etc.)
  │
Method 2: data-publishable-key (optional, recommended)
  ├─ data-publishable-key="dub_pk_acme_xxx"
  │  └─ Dub validates key + domain combination
  │     └─ Decode key to find workspace_id
  │        └─ Verify domain is in allowed list
  │
Method 3: data-workspace-id (explicit)
  ├─ data-workspace-id="ws_acme123"
  │  └─ Direct lookup, no reverse resolution needed
  │     └─ MOST EFFICIENT (Dub recommends this)

Security Model:
  Dub Backend checks:
    ├─ Is this publishableKey valid? (JWT verification)
    ├─ Is the origin domain (e.g., acmeapp.com) in workspace.allowedDomains?
    ├─ Is the request from known IP/user-agent? (optional)
    └─ Is rate limit not exceeded?

  If all checks pass:
    └─ Accept conversion tracking event
       └─ Charge towards workspace quota
          └─ Return 200 OK
```

---

## 4. REVERSE PROXY ARCHITECTURE

```
SCENARIO A: Direct to 3rd-party API (BLOCKED)
═════════════════════════════════════════════════════════════════════════

@dub/analytics on startup.com
  │
  ├─ POST https://api.dub.co/track/lead
  │  ├─ Browser sends: Origin: startup.com
  │  │  └─ API: api.dub.co ✗ (3rd-party)
  │
  ├─ AdBlock scans request
  │  └─ Detects: api.dub.co is a known tracking domain
  │     └─ Blocks request ✗
  │
  └─ Result: Tracking fails


SCENARIO B: Reverse Proxy via Next.js (SUCCESS)
═════════════════════════════════════════════════════════════════════════

Browser: POST /api/dub/track/click ✅ (first-party, allowed)
Server: Rewrite to → https://api.dub.co/track/click
Response: Returned to browser as if from yourcompany.com

Result:
  ├─ Browser sees: ONLY yourcompany.com requests ✓
  ├─ AdBlocker cannot detect Dub API calls ✓
  ├─ Tracking succeeds even with aggressive blockers ✓
  └─ Conversion data reaches Dub backend ✓
```

---

## 5. ATTRIBUTION MODEL COMPARISON

```
SCENARIO: User journey with multiple touchpoints

Day 1: User sees ad for Partner A, clicks
  └─ Event: Click (via=partner_a)
     └─ dub_id=click_aaa111
        └─ Stored in database as: click_1

Day 3: User returns, clicks Partner B's link
  └─ Event: Click (via=partner_b)
     └─ dub_id=click_bbb222 (overwrites in browser)
        └─ Stored in database as: click_2

Day 5: User converts (signs up + makes purchase)
  └─ Event: Conversion
     └─ amount=9999 (cents)
        └─ dub_id=click_bbb222 (current cookie value)


LAST-CLICK ATTRIBUTION (Dub Default)
═════════════════════════════════════════════════════════════════════════

Logic:
  ├─ Read current cookie: dub_id=click_bbb222
  ├─ Look up click_2 in database
  ├─ Find: via='partner_b'
  └─ Award 100% commission to Partner B

Distribution:
  ├─ Partner A: $0 (no credit)
  ├─ Partner B: $2999 (100% × $99.99 × 30% commission rate)
  └─ Total distributed: $2999


FIRST-CLICK ATTRIBUTION
═════════════════════════════════════════════════════════════════════════

Logic:
  ├─ Find FIRST click in session (click_1)
  ├─ Read: via='partner_a'
  └─ Award 100% commission to Partner A

Distribution:
  ├─ Partner A: $2999 (100% × credit)
  ├─ Partner B: $0 (no credit)
  └─ Total distributed: $2999


LINEAR ATTRIBUTION
═════════════════════════════════════════════════════════════════════════

Logic:
  ├─ Find all clicks in session: [click_1, click_2]
  ├─ Split credit equally: 50% each
  └─ Calculate commissions

Distribution:
  ├─ Partner A: $1499.50 (50% × credit)
  ├─ Partner B: $1499.50 (50% × credit)
  └─ Total distributed: $2999
```

---

## 6. PARTNER ATTRIBUTION MATCHING

```
PARTNER SETUP (Admin Panel)

Partner Management Table:
┌────────────────────────────────────────────────────────────────────────┐
│ Partner          │ Email              │ Via Identifier  │ Commission    │
├────────────────────────────────────────────────────────────────────────┤
│ John Smith       │ john@acmeprtns.com │ john_partner    │ 30%           │
│ Jane Marketing   │ jane@mktg.co       │ jane_seo        │ 25%           │
│ Tech Influencer  │ tech@infl.io       │ tech_review     │ 15%           │
│ Direct Sales     │ sales@direct.com   │ direct_sales    │ 40%           │
└────────────────────────────────────────────────────────────────────────┘


URL GENERATION
═════════════════════════════════════════════════════════════════════════

Partner John logs in:
  ├─ Clicks "Create Referral Link"
  ├─ System generates: acme.link/pro?via=john_partner
  └─ Link metadata stored in DB with partner_id reference


CLICK TRACKING & CONVERSION
═════════════════════════════════════════════════════════════════════════

User clicks: acme.link/pro?via=john_partner
  │
  ├─ Dub Redirect Middleware intercepts
  │  ├─ Extract: via = "john_partner"
  │  ├─ Database lookup: partner with via='john_partner'
  │  │  └─ Result: partner_id = partner_john123
  │  │
  │  ├─ Generate click record:
  │  │  {
  │  │    id: "click_abc123xyz",
  │  │    via: "john_partner",
  │  │    partner_id: "partner_john123",
  │  │    timestamp: ...
  │  │  }
  │  └─ Set cookie: dub_id=click_abc123xyz
  │
  ├─ User converts (signs up)
  │  └─ trackLead({ clickId: "click_abc123xyz", ... })
  │
  ├─ Backend Processing:
  │  ├─ Lookup click by clickId
  │  ├─ Find: via="john_partner", partner_id="partner_john123"
  │  ├─ Create commission record
  │  │  {
  │  │    partner_id: "partner_john123",
  │  │    click_id: "click_abc123xyz",
  │  │    amount: (configurable for leads)
  │  │  }
  │  └─ Partner sees update in real-time dashboard
  │
  └─ RESULT: John gets credited ✓
```

---

## 7. DATABASE SCHEMA OVERVIEW

```
TABLES REQUIRED FOR FULL AFFILIATE TRACKING

workspaces
  ├─ id (PK)
  ├─ name, slug
  ├─ short_domain (e.g., acme.link)
  ├─ allowed_domains (JSON)
  └─ publishable_key (unique)

partners
  ├─ id (PK)
  ├─ workspace_id (FK)
  ├─ name, email
  ├─ via_identifier (unique per workspace)
  ├─ commission_rate (decimal)
  └─ status (active/inactive)

links
  ├─ id (PK)
  ├─ workspace_id, partner_id (FK)
  ├─ domain, key (compound unique)
  ├─ target_url
  ├─ via (derived from partner)
  └─ created_at

clicks
  ├─ id (PK) - clickId
  ├─ workspace_id, link_id, partner_id (FK)
  ├─ via, ip_address, user_agent
  ├─ country, city, device, browser
  ├─ converted (boolean, set after conversion)
  └─ timestamp

conversions
  ├─ id (PK)
  ├─ workspace_id, click_id (FK)
  ├─ event_name, customer_id, amount_cents
  ├─ currency, status
  └─ timestamp

commissions
  ├─ id (PK)
  ├─ workspace_id, partner_id, click_id, conversion_id (FK)
  ├─ amount_cents
  ├─ status (pending/approved/paid)
  ├─ payout_date
  └─ created_at

RELATIONSHIPS:
  workspace 1 ──→ ∞ partners, links, clicks, conversions, commissions
  partner 1 ──→ ∞ links, clicks, commissions
  link 1 ──→ ∞ clicks
  click 1 ──→ 1 conversion (nullable)
  conversion 1 ──→ ∞ commissions
```

---

**Version:** 1.0
**Created:** January 13, 2026
