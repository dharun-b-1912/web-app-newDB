---
name: pricing-strategy
description: Recommends what to charge from rival pricing pages and price searches, setting value metric, tiers, price points and annual discount. Also designs offers and guarantees, prices by country and plans price increase or sunset notices. Use when asked what to charge, how to tier or how to raise prices.
---

# Pricing Strategy

A pricing plan built from what the market actually charges and how buyers actually search, not from a template. Every market finding comes from a page this skill reads or a call it runs, and every recommendation names the rule and the numbers behind it.

Pricing has three parts, and most teams only argue about the third:
1. **Packaging:** what each plan includes (features, limits, support, controls).
2. **Pricing metric:** the unit you charge for (seat, location, usage band, contacts, transactions, flat).
3. **Price point:** the amount, and how monthly and annual billing differ.

## Modes

Pick the mode from the request. Ask only when it's unclear.

| Mode | Use it when the user asks | Where |
|---|---|---|
| **Pricing strategy** (default) | what to charge, tiers, free plan or trial, value ladder, price perception, whether to raise prices | Steps 1 to 8 |
| **Offer design and profit check** | how to make an offer people say yes to, what guarantee to give, what to add, how to structure the deal, student or startup discounts | "Mode: offer design and profit check" |
| **Regional pricing by country** | prices by country, purchasing power parity pricing, which markets get a lower price, currency and rounding | "Mode: regional pricing by country" (after the home price is set) |
| **Change and sunset announcements** | announcing a plan or product sunset, a discontinued item, a policy or terms change, a rename or rebrand, or the customer side of a price change | "Mode: change and sunset announcements" |

Every mode works from what the user pastes or describes. Connectors make it faster and replace estimates with the user's own numbers.

## Before you start

You need the InsightfulPipe MCP connected. DataForSEO is the main data source (pricing pages and search demand). Search Console, GA4 and Stripe are optional and add your own signals. Without DataForSEO, see "Without a connection" at the end. The steps below are for the default mode; each of the other modes lists its own questions and sources in its section, and calls `query_contexts` with `request="accounts"` and `request="actions_details"` for those platforms the same way.

1. Call `query_contexts` with `request="accounts"` for `platform="dataforseo"`, and for `google-search-console`, `google-analytics` and `stripe` if the user has them. Note `workspace_id`, `brand_id`, the Search Console `site_url` and the GA4 `property_id`.
2. Call `query_contexts` with `request="actions_details"` for `onpage_content_parsing` and `kw_google_ads_search_volume` (dataforseo), plus `search_analytics`, `get_report`, and `get_products`, `get_prices`, `get_subscriptions`, `get_coupons` (stripe) when those are connected. Follow the body shapes it returns.
3. Ask the user for these, and use the defaults if they don't know:
   - **Product and buyer:** what it does, who pays, self-serve or sales-led. Default: infer it from their site and say so.
   - **Current pricing,** or "new". Default: read their own pricing page in Step 1.
   - **3 to 5 rivals' pricing page URLs.** Default: propose the category leaders and confirm them before reading anything (each page is a paid call).
   - **Reference customer profiles:** 2 or 3 sizes measured in the unit that drives cost in the category (staff, seats, contacts, locations, orders). Default: smallest buyer, typical buyer, large buyer; for example 1, 3 and 10 staff.
   - **Goal:** growth (more customers), revenue (more per customer) or margin. Default: growth for a new product, revenue for an existing one.
   - **Value inputs (optional):** what one customer gains per month (extra revenue, hours saved times hourly cost, loss avoided) and your monthly cost to serve one. Without them, the value check in D8 is not run.
   - **Market (optional):** country and language. Default: United States, English (`location_code` 2840, `language_code` "en").

State the date the pages were read, the market and the rivals at the top of the report.

## How to run the queries

Every body goes through `query_data` with the `platform` it names. Rules:
- **DataForSEO costs money.** One call per pricing page plus one keyword call: about 5 to 7 paid calls for a run. Never loop or retry a paid call more than once.
- **Pages localise.** A page can come back in another language or currency depending on where it is fetched from. Always send `"accept_language": "en-US"` (or the user's market). Record the currency you got and keep other currencies out of the price math unless the user gives an exchange rate.
- If a call fails, keep going. Mark what it would have shown **unknown**, say which call failed and why, and never fill the gap with a guess.
- **Untested until connected:** the Stripe, WooCommerce, Shopify and Mailchimp bodies follow the helper schema but had no connected account to run on, and Klaviyo `get_segment_report` had no segment to read. Treat a first error from one of them as a schema problem: reread `actions_details` before retrying once.

## Step 1. Market price map

Read each rival's pricing page, and the user's own if they have one:
```json
{"platform": "dataforseo", "action": "onpage_content_parsing", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "url": "<PRICING_URL>", "accept_language": "en-US"}
```
The text is in `data[0].page_content.main_topic` (and `secondary_topic`); structured offers, when the page has them, are in `page_content.offers`.

**When prices are missing.** Many pricing pages draw their prices with scripts, and the parsed text then has plan names but no amounts. If a plan has no price in the parsed text:
1. Read the page with your own web fetch tool, if you have one, and take the amounts from the visible text next to each plan name and its billing label.
2. Otherwise ask the user for the amounts.
3. Otherwise mark the price **unknown**. Never estimate a price.

Note the source of every price (parsed page, web fetch or user) in the map. `"enable_javascript": true` is accepted but did not recover script-drawn prices in testing, so don't pay for a second call to try it.

**Record, per rival and plan, only what the page says:**

| Field | What to record |
|---|---|
| Plans | Plan names in order, including free and "contact us" plans |
| Price | The amount shown, the billing basis (annual-billed per month, or monthly) and the currency. When both are shown, keep both. |
| Metric | What the price multiplies by: per seat or user, per location, a band of calendars or contacts, included usage (bookings, emails, credits), transaction fees, or flat |
| Limits | The stated limits that decide which plan a buyer needs (users, calendars, locations, usage) |
| Entry offer | Free plan (and its cap), trial length, and whether a card is needed |
| Enterprise gate | "Contact us" or "starts at" plans, and the threshold that sends you there |
| Add-ons | Anything sold on top: credits, extra seats, setup services, assistants |
| Presentation | The default billing toggle, badges ("most popular", "best value"), anchors ("starts at $X"), annual saving shown |

Feature tables built from check-mark images parse as empty cells. Don't infer which plan has a feature from an empty cell; leave it out or ask.

## Step 2. Price every rival at your reference profiles

For each profile, find each rival's cheapest plan whose **stated limits** fit it, and compute the monthly price on annual billing (seat price × seats, band price, or price per location). If a rival only shows monthly billing, use that and say so.

- A plan with no stated limit for the profile's unit fits.
- A free plan counts at $0. Say what it costs instead, if the page says so (card fees, usage fees).
- A rival in another currency, or one whose metric can't be mapped to the profile (for example included bookings when the profile is staff), stays in the map but out of this table. Say why.

This table shows how each metric scales: seat pricing climbs with team size, band pricing climbs in steps, location pricing and fee-funded models stay flat.

## Step 3. Search demand and price sensitivity

One call with 20 to 30 keywords built from the category, the rivals and the segments:
```json
{"platform": "dataforseo", "action": "kw_google_ads_search_volume", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "keywords": ["<KEYWORD_1>", "<KEYWORD_2>"], "location_code": 2840, "language_code": "en"}
```
Each row gives `search_volume` (monthly average), `cpc` and `competition`. Build the list from these groups (C = category phrase, R = a rival, S = a segment):

| Group | Patterns |
|---|---|
| Head | "C", "C app" |
| Price research | "C pricing", "C cost", "R pricing" for every rival |
| Free-seeking | "free C", "free C app", "cheap C", "is <leader> free", "<leader> free plan" |
| Switching | "R alternative" for the 2 biggest rivals |
| Segment | "C for S", "S C" for each segment the user sells to |
| Enterprise | "enterprise C", "C for teams" |

Send both segment patterns for every segment the user names, and the whole list in one call. A keyword with no volume returns null: list it as "no data" and count it as 0 in the sums. Google Ads can merge close variants: two phrasings ("salon booking software", "booking software for salons") may come back with the same volume, CPC and monthly trend. List both, but count the pair once in a group's sum. Then compute:
- **Free-seeking share** = free-seeking volume ÷ (free-seeking + price-research volume). How strongly the market expects a no-cost way in.
- **Leader free check** = the leader's free-seeking volume ÷ "<leader> pricing" volume. How often buyers ask whether the leader is free before (or instead of) asking what it costs.
- **Segment CPC index** = a segment keyword's CPC ÷ the CPC of the highest-volume head keyword. What advertisers pay for that buyer relative to the average buyer, a proxy for how much that segment is worth.
- **Switching volume** per rival, and **enterprise volume**.

## Step 4. Your own signals (optional, when connected)

**4a. How searchers find your pricing (Search Console).** Last 90 complete days:
```json
{"platform": "google-search-console", "action": "search_analytics", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "site_url": "<SITE_URL>", "dimensions": ["query"], "start_date": "<START>", "end_date": "<END>", "row_limit": 1000}
```
Keep queries with a price word: price, pricing, cost, free, cheap, discount, coupon, plan, subscription, trial, vs, alternative. Group them like Step 3 and report impressions and clicks per group. This pull stops at 1,000 rows; when it returns exactly 1,000, say the shares are of the visible rows.

**4b. Does pricing traffic convert (GA4).** Last 30 complete days:
```json
{"platform": "google-analytics", "action": "get_report", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "property_id": "properties/<PROPERTY_ID>", "dimensions": ["pagePath"], "metrics": ["screenPageViews", "activeUsers", "sessions", "keyEvents"], "start_date": "<START>", "end_date": "<END>", "dimensionFilter": {"filter": {"fieldName": "pagePath", "stringFilter": {"matchType": "CONTAINS", "value": "pric"}}}, "limit": 20}
```
```json
{"platform": "google-analytics", "action": "get_report", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "property_id": "properties/<PROPERTY_ID>", "dimensions": ["eventName"], "metrics": ["eventCount", "totalUsers", "keyEvents"], "start_date": "<START>", "end_date": "<END>"}
```
Report sign-up or purchase key events per 100 pricing page viewers. If no key event fired in the window, the rate is **unknown**: a defined event that never fires measures nothing. The page itself (layout, anchors, objections) belongs to the Pricing Page Auditor skill.

**4c. What customers actually pay (Stripe).** Untested until a Stripe account is connected; the bodies follow the helper schema:
```json
{"platform": "stripe", "action": "get_products", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "active": true, "auto_paginate": true}
```
```json
{"platform": "stripe", "action": "get_prices", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "active": true, "auto_paginate": true}
```
```json
{"platform": "stripe", "action": "get_subscriptions", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "status": "all", "auto_paginate": true}
```
```json
{"platform": "stripe", "action": "get_coupons", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "auto_paginate": true}
```
From these: plan mix (active subscriptions per price), average revenue per customer, share on annual billing, share with a discount, trialing count, and cancellations in the last 90 days per plan. Amounts are in the smallest currency unit (cents): divide by 100.

**Signs you are underpriced** (any two): most customers sit on the cheapest paid plan while using it heavily; prospects rarely push back on price; you are well under the paid median at the typical profile (Step 2); cancellations rarely cite price; rivals raised prices recently. **Signs you are overpriced:** cancellations cluster on one plan, heavy discount use (over a third of active subscriptions), and pricing traffic that doesn't convert while other pages do.

## Step 5. Decisions

Apply each rule, show the numbers that triggered it, and say when the user's business makes a rule wrong. The thresholds are starting points.

| # | Decision | Rule |
|---|---|---|
| D1 | Entry offer | **Free plan** when the free-seeking share is 40% or more and at least half the rivals cost $0 at the smallest profile: cap it at the smallest profile. **Trial only** when the share is under 25% and fewer than half the rivals are free. In between, test a free plan against a reverse trial (everything unlocked for a set time, then the free plan). Trial length follows time to first value: 7 days when value shows in the first session, 14 as the default, 30 when setup takes days. A card up front gets fewer, more serious starts. Overrule the numbers when the product says otherwise: a free plan suits a product that spreads through use and costs little per free user; a trial suits one that needs setup before it shows value. |
| D2 | Value metric | Pick the unit that (a) grows as the customer gets more value, (b) the buyer can predict, (c) is hard to game, (d) you can measure, and (e) the category already accepts. Use Step 2 to show how each rival's metric scales across the profiles, and where seat pricing gets expensive. |
| D3 | Price points | **Core plan:** at or under the median paid rival price at the typical profile. **Growth plan:** at or under the median paid price at the large profile. Going above a median needs a named advantage buyers pay for, and a test. Adjacent paid plans sit 1.3× to 3× apart: under 1.3× they blur together, over 3× they leave a gap a middle plan should fill. |
| D4 | Plan count | Three rungs (entry, core, growth) by default, plus a contact-us rung when D5 says so. Use four or more only when the median paid price at the large profile is 5× or more the median paid price at the typical profile. |
| D5 | Enterprise rung | Add a contact-us rung when at least half the rivals show one, or the user has deals that need contracts or security reviews. Don't lead with it when enterprise search volume is under 100 a month. What enterprise buyers expect: single sign-on, audit logs, admin controls, an uptime commitment, security documents and a named contact. |
| D6 | Annual billing | Take one saving per rival: the largest the page shows (its "save up to" figure). Leave out rivals with no annual option or an amount with no billing label. Match the median of those savings, kept within 15% to 25%. Show annual prices by default only when most rivals do. Savings and the default toggle are not amounts, so rivals in any currency count in both. |
| D7 | Segment package | Test every segment the user names. A segment keyword with a CPC index of 2 or more and 100 or more searches a month is a segment worth a dedicated package. Price it against the rival plan that names the same segment, if there is one: at or under that plan, and 1.3× to 3× the plan it builds on. Compare all three in one unit: if the rival charges per location and your plans charge per account, compare at one location, say what each extra location costs at the rival, and say where a second location goes in your ladder. |
| D8 | Value ceiling | Only with value inputs: the price should stay at or under 10% to 25% of the monthly value one customer gets, and above the cost to serve. The floor that matters to the buyer is the next best alternative (Step 2), not your cost. Not run without the inputs; say so. |

## Step 6. Value ladder and offer stack

Lay out the rungs a customer climbs, from the first free or cheap step to the most expensive plan, and the add-ons around them:
- **Entry:** removes the reason not to start (D1).
- **Core:** where most customers should land; the plan you badge.
- **Growth:** for the large profile; adds capacity and the controls bigger teams need.
- **Band edges** (when the metric is a band): each paid rung covers up to twice the profile it is priced for, so a growing customer has headroom before the next step. With profiles of 1, 3 and 10 staff: entry 1, core 2 to 6, growth 7 to 20.
- **Segment package or custom rung:** D7 and D5.
- **Add-ons:** only ones the market already sells (Step 1): usage credits, setup or migration services, extra capacity, assistants. Each add-on should answer "what does a customer who outgrows this plan buy next?"

Separate rungs with the levers buyers understand: usage limits (staff, bookings, contacts), features, support level, and access and control (API, single sign-on, audit logs, admin roles). Limits that track the value metric (D2) make the best upgrade triggers.

Flag gaps: adjacent rungs more than 3× apart, a rung with no reason to upgrade into it, or an add-on that costs more than the next plan.

## Step 7. Perception and packaging review

From the pages (Step 1) and search (Steps 3 and 4a):
- **Price endings:** prices ending in 9 read as value; round prices read as premium and simple. Note what the category does.
- **Badges and anchors:** which plan rivals badge, and any "starts at" or high plan that makes the middle look reasonable (an anchor), or a weaker plan placed so the badged one looks like the obvious pick (a decoy).
- **Billing framing:** annual by default or monthly, and how the saving is shown (percent, months free, or per-month price). Small daily framing ("under $1 a day") makes a low price feel smaller; it doesn't help a premium position.
- **Entry wording:** how plainly rivals say "free" or "no card needed", and whether searchers are asking (leader free check).
- **Plan names:** names that say who the plan is for beat names that only say size.
- **Readable prices:** when a page draws its prices with scripts (Step 1 needed the fallback), search engines and AI assistants may not see them either. If the user's own page does this, recommend putting the prices in the page text.
- **Your page (if you have one):** the same checks on your plans, and the 4a query groups: many "free" or "cheap" queries landing on your pricing means the entry offer needs to be clearer, not cheaper.

## Step 8. Validate before you ship

The market map tells you where you can sit; buyers tell you what they will pay. Recommend at least one of these:
- **Van Westendorp price sensitivity survey:** ask each respondent four prices (too cheap to trust, a bargain, getting expensive, too expensive to consider). Plot the cumulative answers; the crossings give an acceptable range and a point of least resistance. Read at least 100 answers per segment you want to price separately, and show the product description, not just the name.
- **Gabor-Granger ladder:** ask "would you buy at $X?" and move up after a yes, down after a no. Ladder: the lowest, median and highest paid rival price at the typical profile, plus one rung 25% above the highest.
- **Conjoint:** for a big repackaging; buyers pick between plan bundles, which prices each feature and limit. Use it when plans differ on many features.

**Pricing experiments:**

| Test | Measure |
|---|---|
| Free plan vs reverse trial (D1) | Paid conversion by day 30 and 90, not sign-ups |
| Core price at two ladder points | Paid conversion and revenue per visitor to pricing |
| Annual default on vs off | Annual share and first-year revenue |
| Metric: seat vs band | Expansion revenue at 90 days |
| Plan names | Plan mix |

Test on new customers only, one change at a time, for at least one full billing cycle. If traffic is too thin for a split test, run the prices in sequence and compare like-for-like periods, or vary quotes in sales calls and track close rates.

**Before launch:** the pricing page and plan limits match, billing is set up for every plan and the annual option, sales and support know the new prices and the upgrade triggers, and the FAQ answers "what happens to my current plan?"

## Changing prices you already charge

Use this when Step 4 shows you are underpriced, or the user asks to raise prices:
1. **Pick the approach:** new customers only (existing ones keep their price, simplest, leaves money behind); existing customers at renewal with 60 to 90 days' notice and an option to lock the old price by switching to annual; a new plan with new value at the new price, which existing customers may choose; or a full restructure that maps each customer to the nearest new plan.
2. **Announce it** with the change and sunset announcements mode (change type "price change"): it sizes who is affected, orders who hears first, writes the notice, the FAQ and the support lines, and sets the reaction checks. The notice says what added value since they joined. No surprises in the invoice.
3. **Watch** paid conversion on the pricing page (4b) and cancellations per plan (4c) for two billing cycles.

## Pricing and acquisition economics

Higher prices only help if retention holds. Lifetime value = monthly revenue per customer × gross margin ÷ monthly churn. Keep lifetime value at about 3× the cost to acquire a customer or better; a higher price gives more room to pay for ads, a lower price needs cheaper acquisition. For the full calculation on live ad spend, use the LTV:CAC Ratio Optimizer skill.

Advertise each rung to the buyer it fits: the entry offer to broad, problem-aware audiences; the core plan to high-intent searches ("<category> pricing", "<rival> alternative"); a segment package to the segment terms D7 found; the contact-us rung to named accounts.

## Report format (pricing strategy mode)

1. **Headline:** the recommended metric, entry offer, plans and prices in three lines, with the market, the rivals and the date the pages were read.
2. **Market price map:** one row per rival and plan, with each price's source.
3. **Price at your profiles:** the Step 2 table, plus who was left out and why.
4. **Demand signals:** free-seeking share, leader free check, segment CPC indexes, switching and enterprise volume, with the keyword table.
5. **Your own signals:** 4a to 4c, or "not connected" / "not run" with the reason.
6. **Decisions D1 to D8:** each with the rule, the numbers and the verdict.
7. **Recommended plans:** rung, metric, price ceiling, who it's for, the limit that moves a buyer up.
8. **Value ladder and gaps.**
9. **Perception review.**
10. **Validation plan and experiments.**
11. **Unknowns:** every price, check or signal that couldn't be read, and why.

## Mode: offer design and profit check

The offer is the whole deal a buyer is asked to accept, not just the price. This mode builds or repairs it from what buyers actually object to, checks it against what rivals give, costs every addition per sale, and sizes a test. It suits courses, services, digital products, stores and self-serve software alike.

**Ask for** (defaults in brackets):
- The product, its price, and who buys it.
- **Cost per sale:** delivery or fulfilment cost, payment fees and any per-buyer support time [ask; never assume a margin].
- **Refund rate** over the last 90 days and the current guarantee [pulled from the store when connected; otherwise ask].
- **The current offer** in the user's words: what is included, what makes buying feel safe (guarantee, cancellation terms, trial period), the terms (one payment, instalments, monthly) and any reason given to buy now.
- **Offer page traffic and conversion rate** for the last 30 days [GA4 when connected], used only to size the test.
- **Objection evidence the user has:** reviews, sales call notes, support tickets, comments, survey answers. Paste is fine.

**Refund rate from the store** (untested until a store is connected). WooCommerce, last 90 days, refund rate = `total_refunds` ÷ `total_sales`:
```json
{"platform": "woocommerce", "action": "get_sales_report", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "filters": {"date_min": "<START>", "date_max": "<END>"}}
```
Shopify: the `get_orders` body shown under R2 below, then refunded amounts from each order's `refunds` ÷ order totals, for orders created in the window.

**O1. Write down the current offer** in four lines: the core package, what makes buying feel safe, the terms, the reason to act now. A missing line is a finding.

**O2. Count the objections.** Collect lines from every source available and sort each into the first theme it matches:

| Theme | Words that place a line here |
|---|---|
| Worth the money | worth it, worth the money, expensive, overpriced, price, cost, cheaper |
| Fear it won't work | refund, money back, guarantee, cancel, does it work (or "does <name> work"), results |
| Trust | legit, scam, review, reviews, complaints |
| Effort and time | how long, hard, difficult, time, setup |
| Fit | for beginners, for small business, for me, without experience |
| Cheaper or free options | free, alternative, vs, instead |
| Waiting | sale, coupon, discount, black friday, next intake, start date |

Sources:
- **Search Console** (the Step 4a pull, 90 days): queries that contain the brand or product name plus a theme word. Weight by impressions.
- **Keyword volumes** (DataForSEO, one `kw_google_ads_search_volume` call, the Step 3 body): the category and the 2 biggest rivals, each with "worth it", "review", "legit", "refund", "cost" and "free", plus any other objection phrase buyers in the category search (for example "how long does it take to learn <skill>"). Weight by monthly volume.
- **Product reviews** (WooCommerce, when connected):
```json
{"platform": "woocommerce", "action": "get_product_reviews", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "auto_paginate": true, "filters": {"product": "<PRODUCT_ID>", "status": "approved"}}
```
  Keep reviews rated 3 or lower (a 5-star review that mentions the price is praise, not an objection). Weight 1 per review.
- **Pasted lines** (calls, tickets, comments, survey answers): weight 1 per line.

A line with no theme word is left out. Score each theme as its share of the objection evidence within each source, averaged over the sources that returned data, so impressions, volumes and review counts never get added together. Rank the themes. A theme with no evidence gets no answer in the offer.

**O3. What rivals give.** For the 2 to 4 rivals the buyer compares against:
- Their offer page through `onpage_content_parsing` (the Step 1 body): guarantee length and conditions, what is included, payment terms, any deadline.
- Their running ads, which show the offer they lead with:
```json
{"platform": "ads-libraries", "action": "facebook_search_companies", "workspace_id": "<WORKSPACE_ID>", "query": "<RIVAL_NAME>"}
```
```json
{"platform": "ads-libraries", "action": "facebook_company_ads", "workspace_id": "<WORKSPACE_ID>", "page_id": "<PAGE_ID>", "country": "US", "max_ads": 30, "trim": true}
```
```json
{"platform": "ads-libraries", "action": "google_company_ads", "workspace_id": "<WORKSPACE_ID>", "domain": "<RIVAL_DOMAIN>", "region": "US"}
```
  Meta ads carry the ad text. Google's library rows carry no ad text, only a link to each ad, and in testing a domain search returned ads from an unrelated advertiser too: count only rows whose `advertiserName` is the rival, and open the `adUrl` to read an offer. A rival with no running ads is recorded as "no ads running", not as "no offer".

Record per rival: guarantee (days and conditions), extras, payment terms, reason to act now. Count how many rivals give each.

**O4. The offer map.** For each of the top 3 themes (and any other theme scoring 15% or more), choose one element that answers it, and only one:

| Theme | Elements that answer it |
|---|---|
| Worth the money | a smaller starter package, payment in instalments, a plain comparison with the next best option's total cost |
| Fear it won't work | a guarantee with a clear window and simple conditions, a pilot or first month at lower risk, cancel any time |
| Trust | named results and reviews near the price, a sample lesson or demo, who is behind it |
| Effort and time | done-with-you setup, templates, live help or an onboarding call, a stated time to first result |
| Fit | a fit check before buying, a track for beginners, who it is not for |
| Cheaper or free options | what the free option lacks, said plainly; a starter package priced against it |
| Waiting | a true reason to act now (below) |

Match or beat the rival norm only where the theme ranks high: when most rivals give a 30-day guarantee and "fear it won't work" ranks first, a 7-day guarantee is a gap; when the theme ranks low, a longer guarantee is cost with no answer.

**Variants.** Student, education, nonprofit and startup offers are the same offer with a gate: who qualifies and how it is checked (a school email domain, a verification service, proof of incorporation date or funding stage), the discount, a cap per customer, and when it ends (graduation, 12 months). Cost each variant in O5 and track the share of buyers using it.

**O5. Profit check per sale.** For the current offer and the new one:
- Contribution per sale = price × (1 - refund rate) - payment fees - delivery cost - cost of each extra per buyer.
- **Extras:** the cost per buyer who takes it up (a live call costs the host's time divided by the buyers on it). Digital extras that cost nothing per buyer still cost time to make: list that once, outside the per-sale figure.
- **Guarantee:** a new or longer guarantee is planned at 1.5 times the current refund rate until a test shows the real rate (a starting point; say so). With no refund history, show the check at 5%, 10% and 15% refunds and say which one breaks it.
- **Instalments:** the provider's fee plus the expected unpaid amount (default rate × the share of the price still owed when defaults happen), times the share of buyers who choose instalments.
- **Break-even lift** = current contribution per sale ÷ new contribution per sale - 1: how much more often buyers must say yes for the new offer to earn the same.
- **Verdict:** keep when the break-even lift is 15% or less; test first between 15% and 40%; cut or reprice an element above 40%, or when contribution per sale falls to zero or below.

**O6. A true reason to act now.** Use only reasons that are true and enforced:
- a start date (a cohort, a season, a delivery cut-off);
- a price rise on a stated date that really happens;
- real capacity (seats on live calls, stock you hold, slots a team can serve);
- an extra that is really withdrawn on a stated date.

Refuse, and say why: countdown timers that restart, "only 3 left" not tied to stock, a "was" price you never charged, and fake sign-up counts. In the US, the FTC's pricing guides treat a former price as deceptive unless it was really charged; in the EU, a price cut must be shown against the lowest price of the previous 30 days.

**O7. Present it.** Where each element goes: the answer to the top objection next to the price and the buy button; the guarantee in plain words next to the button and in the FAQ; instalments next to the full price, never instead of it; the reason to act now with its date. In ads, lead with the element that answers the top theme. For full page copy, use Copywriting if installed.

**O8. Test it.** One change against the current offer, new visitors only.
- Primary metric: **contribution per visitor**, read after the guarantee window closes, because a guarantee can raise sales and refunds together.
- Size to detect the larger of the break-even lift and 10%: n per arm = (1.96 + 0.84)² × (p1(1 - p1) + p2(1 - p2)) ÷ (p2 - p1)², where p1 is the current conversion rate and p2 = p1 × (1 + that lift). That is 95% confidence and 80% power.
- Days = 2n ÷ daily offer page visitors. Over 56 days means traffic is too thin: test a bigger change, or run the offers one after the other over like periods.
- For deeper test design, use A/B Test Designer if installed.

**Offer report:** the current offer in four lines; objection themes with their evidence per source; the rival offer table; the new offer (each element, the objection it answers, its cost per sale, where it shows); the profit check for both offers; break-even lift and verdict; the reason to act now and anything refused; the test plan; unknowns.

## Mode: regional pricing by country

Sets prices by country for software, digital products and subscriptions, so a discount goes only where price is what stops people buying, and a higher price is tested only where buyers already pay more readily than at home. Run it after the home price is set (Steps 5 and 6), or on the user's current prices. Store currency display and shopping feed prices are outside this mode.

**Ask for:** the home price list and currency; the product type; the markets to consider; cost to serve one customer and payment fees; and sales by country (a billing export or an order list) when no store is connected. Currency support in their billing system decides whether local prices are possible or only discounted home-currency prices.

**R1. How expensive each country is.** From the World Bank's published data (not an InsightfulPipe action; read it with your web fetch tool or ask the user to paste it):
- `https://api.worldbank.org/v2/country/IND;BRA;MEX/indicator/PA.NUS.PRVT.PP?format=json&mrnev=1`: purchasing power parity conversion factor for household consumption, local currency per international dollar.
- The same URL with `PA.NUS.FCRF`: the official exchange rate, local currency per US dollar.
- **Price level ratio** = PPP factor ÷ exchange rate: how expensive a country is against the US (India was 0.23 and the UK 0.92 for 2025). If the home market isn't the US, divide each country's ratio by the home country's. `mrnev=1` returns the latest year with a value; state the year. The older `PA.NUS.PPPC.RF` indicator is archived and returns an error.

**R2. Is price the blocker? Your funnel by country.** Last 90 complete days:
```json
{"platform": "google-analytics", "action": "get_report", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "property_id": "properties/<PROPERTY_ID>", "dimensions": ["country"], "metrics": ["sessions", "activeUsers", "keyEvents"], "start_date": "<START>", "end_date": "<END>", "limit": 50}
```
```json
{"platform": "google-analytics", "action": "get_report", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "property_id": "properties/<PROPERTY_ID>", "dimensions": ["country", "eventName"], "metrics": ["eventCount", "totalUsers"], "start_date": "<START>", "end_date": "<END>", "dimensionFilter": {"filter": {"fieldName": "eventName", "inListFilter": {"values": ["<SIGNUP_EVENT>", "<PURCHASE_EVENT>"]}}}, "limit": 100}
```
Paid customers by country come from the store or the billing export:
```json
{"platform": "woocommerce", "action": "get_orders", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "auto_paginate": true, "filters": {"after": "<START>T00:00:00"}}
```
```json
{"platform": "shopify", "action": "get_orders", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "shop_name": "<SHOP_NAME>", "status": "any", "updated_at_min": "<START>T00:00:00Z", "limit": 250, "auto_paginate": true}
```
Count paid orders by billing country (`billing.country` in WooCommerce, `billing_address.country_code` in Shopify). Shopify filters on update time, so keep only orders whose `created_at` is in the window. App store revenue isn't readable through a connector: use a pasted App Store Connect or Play Console export.

Per country: sessions, sign-ups (or trial starts, or checkouts started for a store) per session, paid customers per sign-up, each against the home market. A country **gets a lower price** only when all four hold:
1. Enough interest: 300 or more sessions in 90 days and at least 1% of all sessions.
2. They want it: the sign-up rate is at least 70% of the home market's.
3. They don't pay: paid per sign-up is at most 50% of the home market's.
4. It is cheaper to live there: price level ratio under 0.80.

When (2) fails, the problem is fit, language or traffic quality, and a discount won't fix it. When (3) fails, they already pay: keep the home price. When (1) fails: too little data, keep the home price and look again in a quarter. The thresholds are starting points.

**R3. What local rivals charge.**
- **Pricing pages:** `onpage_content_parsing` (the Step 1 body) on the rival's local page, with `accept_language` set to the market (for example "en-IN", "pt-BR"). Record the currency you got.
- **App stores:** the public listing per storefront.
```json
{"platform": "apple-store", "action": "lookup_by_id", "workspace_id": "<WORKSPACE_ID>", "app_id": "<APPLE_ID>", "country": "IN"}
```
```json
{"platform": "google-play", "action": "app_details", "workspace_id": "<WORKSPACE_ID>", "app_id": "<PACKAGE_NAME>", "country": "in"}
```
  `price` comes back in the storefront's own currency units (in testing, 999 with `currency` "INR" for an app priced 9.99 USD in the US store), and covers the upfront price only: in-app subscription prices aren't in the listing.
- Convert each local price to US dollars at the exchange rate and divide by the rival's home price: that is the rival's own discount for the country. Many rivals don't discount at all (in testing, one app's Indian price came to more than its US price).

**R4. Bands.** Countries that pass R2 get a band from their price level ratio; every other country stays at the home price:

| Price level ratio | Price, share of home |
|---|---|
| 0.80 or more | 100% |
| 0.55 to under 0.80 | 75% |
| 0.35 to under 0.55 | 55% |
| under 0.35 | 40% (the floor) |

A country whose price level ratio is 1.20 or more (against home) and whose paid-per-sign-up rate is at or above the home market's can test up to 115% of the home price. No band goes below cost to serve plus payment fees. Flag a band price above the local rivals' median (you'll look expensive there) or below half of it (money left behind).

**R5. Currency, rounding and tax.** Convert at the exchange rate (or the billing system's rate), then round to the nearest price people expect in that currency, in the home price's style: a home price ending in 9 becomes whole local amounts ending in 9 (99 above 1,000), and Brazil uses ,90. Consumer prices in the EU, UK and Australia are shown with tax included; US and Canadian prices before tax. Review local prices once a year or when an exchange rate moves more than 10%.

**R6. Stop the abuse.** A lower price invites buyers from dearer countries.
- Set the price from the card's issuing country and the billing address; use IP location only to choose what to display.
- Charge the home price when the card country and billing country disagree, or a VPN or proxy is detected at checkout.
- Keep the customer at their band on renewal only while the card country still matches.
- Limit regional prices to self-serve plans: team and contract plans pay the home price.
- Watch the share of regional sign-ups paying with a card from another country. Above 5%, tighten the checks.

**R7. Model the revenue before changing anything.** For each country that gets a lower price:
- **Break-even lift** = home price ÷ band price - 1: how many more paying customers it needs to earn the same.
- **Ceiling** = home paid-per-sign-up rate ÷ the country's rate - 1: the most a price cut could add if price were the whole gap.
- **Go** when the ceiling is at least twice the break-even lift (half the gap closing still pays). **Test** when it is between one and two times. **No** below that: even closing the whole gap wouldn't pay back.
- New customers only; existing customers keep their price.
- When Google Ads runs in those countries, check that acquisition still pays back at the lower price:
```json
{"platform": "google-ads", "action": "gaql", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "account_id": "<CUSTOMER_ID>", "query": "SELECT geographic_view.country_criterion_id, geographic_view.location_type, metrics.clicks, metrics.cost_micros, metrics.conversions FROM geographic_view WHERE segments.date DURING LAST_30_DAYS AND geographic_view.location_type = 'LOCATION_OF_PRESENCE' LIMIT 200"}
```
  Map `country_criterion_id` to a name with `SELECT geo_target_constant.id, geo_target_constant.name, geo_target_constant.country_code FROM geo_target_constant WHERE geo_target_constant.id IN (<IDS>)`. Cost is in micros: divide by 1,000,000. Ads cost per paid customer should be recovered within 12 months of the band price × gross margin.

**R8. Test it.** Launch the band in one or two "go" countries for new customers, keep the rest as they are, and compare paid conversion and revenue per visitor against the 90 days before, for at least one billing cycle. Watch refunds and the foreign-card share.

**Regional report:** a country table with the price level ratio and its year, sessions, sign-up rate and paid rate against home, the blocker verdict, local rival prices, the band, the local price rounded, break-even lift, ceiling and decision; the abuse rules; the test plan; unknowns.

## Mode: change and sunset announcements

Plans and writes announcements customers won't welcome, or that change how they use the product: a plan or product sunset, a discontinued item, a policy or terms change, a rename or rebrand, and the customer side of a price change. Office closures, layoffs and restructures are HR and legal communication, not this mode.

**Ask for:** what changes and the effective date; why; what replaces it; who is affected; what they must do and by when; what you offer them (migration help, a credit, a locked price, extended access); and anything a contract or the terms promise about notice.

**C1. Size who is affected.** Use whatever is connected; otherwise ask for counts.
- **Klaviyo:** the segments and lists, then each segment's size:
```json
{"platform": "klaviyo", "action": "get_segments", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "auto_paginate": true}
```
```json
{"platform": "klaviyo", "action": "get_segment_report", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "body": {"data": {"type": "segment-values-report", "attributes": {"timeframe": {"key": "last_30_days"}, "filter": "equals(segment_id,\"<SEGMENT_ID>\")", "statistics": ["total_members"]}}}}
```
```json
{"platform": "klaviyo", "action": "get_lists", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "auto_paginate": true}
```
- **Mailchimp** (untested until connected): `{"platform": "mailchimp", "action": "list_segments", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "list_id": "<LIST_ID>", "auto_paginate": true}` returns each segment's `member_count`.
- **Buyers of a discontinued item:** WooCommerce `get_orders` with `"filters": {"product": "<PRODUCT_ID>", "after": "<12_MONTHS_AGO>T00:00:00"}`, or Shopify `get_orders` (the R2 body), counting orders whose `line_items` hold the product. Count customers, not orders, and their spend.
- **Users of a changed feature or page:** GA4, last 90 days:
```json
{"platform": "google-analytics", "action": "get_report", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "property_id": "properties/<PROPERTY_ID>", "dimensions": ["pagePath"], "metrics": ["activeUsers", "screenPageViews"], "start_date": "<START>", "end_date": "<END>", "dimensionFilter": {"filter": {"fieldName": "pagePath", "stringFilter": {"matchType": "BEGINS_WITH", "value": "<FEATURE_PATH>"}}}, "limit": 20}
```
- **Subscribers on a retired plan:** Stripe `get_subscriptions` (Step 4c), counted per price.

Split the affected customers by value (revenue in the last 12 months, or monthly revenue): the top 10% get a personal message.

**C2. Who hears first, and when.** Set A as the day affected customers are told and E as the effective date. Notice before E, as starting points (a contract or the terms always win):

| Change | Notice before E |
|---|---|
| Plan or product sunset | 90 days or more; annual customers keep it to the end of their paid term |
| Discontinued item | 30 days or more before the last order date; say how long refills, parts and support last |
| Policy or terms change | what your terms promise, often 30 days; flag for legal review |
| Rename or rebrand | 2 to 4 weeks when anything customers use changes (login address, app name, sender name, invoice name); otherwise on reveal day |
| Price change | 60 to 90 days for existing subscribers (see "Changing prices you already charge") |

Order: staff who face customers (support, sales, success) at A - 7 with the FAQ and talking points; top-value affected customers from A - 3, from a named person; partners and resellers at A - 2; all affected customers on A, by email and in the product; everyone else and the public on A (changelog, blog, social); press only when the change is news. Reminders to those who haven't acted at E - 30, E - 7 and E - 1, and a short "it's done" note on E.

**C3. Write every message.** Each message, in this order:
1. The change and the date, in the first two lines.
2. What it means for this customer: their plan, product, renewal date or price.
3. What they need to do and by when, or "nothing".
4. What you are doing to help.
5. Why, in one or two honest sentences.
6. Where to ask.

Plain subject lines that name the change. Never open a loss with "exciting news", never bury the date, never make the customer work out what it means for them. Also write the FAQ (6 to 10 questions this change raises), support replies for the 3 likeliest questions, sales talking points (including what not to promise), the in-product notice, and social post text (written as text only; no scheduler connector is used). A rebrand message says what stays the same (account, data, prices, team) before what changes.

**C4. Drafts, only after confirmation.** With the user's yes, it can create each email as a draft campaign. Nothing is sent or scheduled; the user sends it from Klaviyo or Mailchimp.
```json
{"platform": "klaviyo", "action": "create_campaign", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "body": {"data": {"type": "campaign", "attributes": {"name": "<CAMPAIGN_NAME>", "audiences": {"included": ["<SEGMENT_ID>"]}, "campaign-messages": {"data": [{"type": "campaign-message", "attributes": {"definition": {"channel": "email", "label": "Main", "content": {"subject": "<SUBJECT>", "preview_text": "<PREVIEW>", "from_email": "<FROM_EMAIL>", "from_label": "<FROM_NAME>"}}}}]}, "send_strategy": {"method": "static", "datetime": "<A_DATE>T15:00:00+00:00"}}}}}
```
```json
{"platform": "mailchimp", "action": "create_campaign", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "body": {"type": "regular", "recipients": {"list_id": "<LIST_ID>", "segment_opts": {"saved_segment_id": "<SEGMENT_ID>"}}, "settings": {"subject_line": "<SUBJECT>", "preview_text": "<PREVIEW>", "title": "<CAMPAIGN_NAME>", "from_name": "<FROM_NAME>", "reply_to": "<REPLY_TO>"}}}
```
Klaviyo creates the campaign in Draft status; the body text is added in Klaviyo or with a template. Both writes need a Read & Write connection.

**C5. Watch the reaction.** Set the baseline before sending, from the last 10 comparable email sends:
```json
{"platform": "klaviyo", "action": "get_campaign_report", "workspace_id": "<WORKSPACE_ID>", "brand_id": "<BRAND_ID>", "body": {"data": {"type": "campaign-values-report", "attributes": {"timeframe": {"key": "last_12_months"}, "filter": "equals(send_channel,\"email\")", "statistics": ["recipients", "delivered", "unsubscribes", "unsubscribe_rate", "spam_complaints", "spam_complaint_rate"]}}}}
```
Rates come back as fractions (0.002 is 0.2%). Compare the announcement with the baseline on the same basis (per recipient or per delivered email). In Mailchimp, `list_reports` gives `unsubscribed` and `abuse_reports` per campaign, and `get_report_unsubscribes` and `get_report_abuse_reports` give the people and reasons for one campaign. Then, after each send:
- **Unsubscribes:** flag a send at more than 2 times the baseline median.
- **Spam complaints:** flag at 0.1% or more; Gmail and Yahoo require bulk senders to stay under 0.3%.
- **Did they act:** the share of affected customers who migrated, switched or replaced the item by E - 7 and by E.
- **Searches** (Search Console, `dimensions: ["date", "query"]`, the Step 4a body): for a rebrand, the new name's share of brand impressions by week; for a sunset or discontinued item, searches for the product with "discontinued", "alternative" or "replacement".
- **Support:** ticket volume and the top questions; add them to the FAQ.

**Announcement report:** the change and its type; affected customers per segment with their value; the dated rollout (who, what, when, channel); each message; the FAQ, support replies and talking points; the drafts offered; the baseline and the flags to watch; legal review flags; unknowns.

## What this skill changes

In the pricing, offer and regional modes it changes nothing: it reads pages and data and returns a plan. It never edits prices, products or coupons in Stripe or a store, and never edits your pricing or offer page. In the announcement mode, after you confirm, it can create draft email campaigns in Klaviyo (`create_campaign`) or Mailchimp (`create_campaign`). It never sends or schedules them.

## Without a connection

If DataForSEO isn't connected, ask the user to paste each rival's plan names, prices, limits and entry offer (or read the pages with your web fetch tool), and to share any keyword volumes they have. Run Steps 2 and 5 to 8 on that, label the demand checks **unknown**, and say the market map came from the user.

The other modes run the same way on pasted material:
- **Offer design:** pasted reviews, call notes, tickets and comments for O2; rival offer pages read with your web fetch tool or pasted for O3; cost, refund rate and conversion from the user for O5 and O8.
- **Regional pricing:** World Bank figures fetched or pasted; sessions, sign-ups and paid customers by country from an analytics or billing export; local rival prices pasted.
- **Announcements:** affected counts and past email results (sends, unsubscribes, complaints) from the user; every message, the FAQ and the timeline are written the same way, and nothing is drafted in an email tool.

Label anything not read from a source as "from the user".

## Go deeper

- **Pricing Page Auditor:** how the prices are presented and whether visitors act on them.
- **Marketing Psychology:** anchoring, decoys, risk reversal and price framing in more depth.
- **LTV:CAC Ratio Optimizer:** whether the new prices pay for acquisition.
- **Signup Flow CRO:** the free plan or trial start you chose in D1.
- **A/B Test Designer** (if installed): deeper design for the offer and regional price tests.
- **Copywriting** (if installed): the full offer page once the offer is set.

## Rules

- Never invent a price, limit, volume, refund rate or customer count. Unknown is an answer.
- Quote rivals' facts in your own words, with the source per price.
- Keep currencies apart; never mix amounts in different currencies in a median (percentages such as annual savings carry no currency).
- Every recommendation names the decision rule and numbers behind it.
- A recommendation to go above the market median needs a named reason and a test.
- No more than about 7 paid DataForSEO calls per run without asking.
- Every offer element answers an objection that has evidence, and is costed per sale before it is recommended.
- No fake urgency: no restarting timers, invented stock limits, never-charged "was" prices or invented counts.
- A lower regional price goes only to a country that passes the price-is-the-blocker test, and only to new customers.
- Announcements tell staff who face customers first, give every affected customer the date and what it means for them, and flag terms, policy and contract changes for legal review. This skill gives no legal advice.
- Writes are drafts only, after confirmation; it never sends, schedules or changes prices.
