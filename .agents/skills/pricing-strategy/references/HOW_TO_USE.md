# How to Use This Skill

Hey Claude, I just added the "pricing-strategy" skill. Work out what we should charge: read our main rivals' pricing pages, check how buyers search on price, and recommend plans, prices and whether to offer a free plan or a trial.

## What you need

- **The InsightfulPipe MCP connected to Claude, with DataForSEO available.** The skill reads each rival's pricing page and pulls Google Ads search volumes and CPCs itself. A typical run is 5 to 7 paid DataForSEO calls: one per pricing page and one keyword call.
- **3 to 5 rivals.** Name them or paste their pricing URLs. If you don't, the skill proposes the category leaders and checks with you before reading anything.
- **Two or three customer sizes** in the unit that drives cost in your category (staff, seats, contacts, locations). Without them it uses a small, typical and large buyer.
- **Optional:** Search Console and GA4 (how searchers reach your pricing and whether that traffic signs up), and Stripe (plan mix, discounts and cancellations; untested until a Stripe account is connected). Also optional: what one customer gains a month and what one costs you to serve, which turns on the value check.
- **No DataForSEO?** Paste each rival's plans, prices, limits and free plan or trial, and any keyword volumes you have. The skill runs the same decisions on that and marks the search signals unknown.
- **For the offer mode:** your price, cost per sale and refund rate, plus any reviews, sales call notes or tickets. WooCommerce or Shopify fills in refunds and reviews, Search Console shows objection searches, and the public ad libraries show rival offers.
- **For regional pricing:** your home price and sales by country (GA4, WooCommerce, Shopify or a billing export). The skill reads the World Bank's purchasing power figures and local rival prices, including app store prices per country.
- **For announcements:** what changes, the date and who is affected. Klaviyo, Mailchimp, Shopify, WooCommerce, GA4 or Stripe size the affected customers; Klaviyo or Mailchimp give the baseline for unsubscribes and complaints. Mailchimp, Shopify and WooCommerce paths are untested until one is connected.

## Example requests

**A new product**
Hey Claude, I just added the "pricing-strategy" skill. We're launching an online booking tool for salons and studios. Compare Calendly, Acuity, Setmore and Square Appointments and tell me what to charge for 1, 3 and 10 staff.

**Free plan or trial**
Hey Claude, I just added the "pricing-strategy" skill. Should we offer a free plan, a free trial or a reverse trial? Use our three main rivals and how people search for them.

**Value ladder and offer stack**
Hey Claude, I just added the "pricing-strategy" skill. Lay out a value ladder for our product, from the first free step to a custom plan, with the add-ons our market already sells and any gaps between rungs.

**Pricing perception review**
Hey Claude, I just added the "pricing-strategy" skill. Review how our pricing page and our rivals' pages present price: endings, badges, anchors, annual savings and plan names. Use our Search Console data to see which price searches reach us.

**Raising prices**
Hey Claude, I just added the "pricing-strategy" skill. Check whether we're underpriced against the market and our Stripe data, and plan a price increase for existing customers.

**Offer design and a money-back guarantee**
Hey Claude, I just added the "pricing-strategy" skill. Our $299 course converts at about 1%. Rebuild the offer from what buyers object to and what rivals give, tell me what guarantee to offer, and check the offer still makes money per sale.

**Regional pricing by country**
Hey Claude, I just added the "pricing-strategy" skill. We charge $49 a month everywhere. Use purchasing power parity, our GA4 trial starts and paid customers by country, and local rival prices to tell me which countries should get a lower price, in which currency, and how to stop abuse.

**A sunset or rebrand announcement**
Hey Claude, I just added the "pricing-strategy" skill. We're retiring our legacy plan on February 15. Size who is affected from Klaviyo, plan who hears first, write every message and the FAQ, and tell me how we'll know if it goes badly.

## What you get

1. **A headline** with the recommended pricing metric, entry offer, plans and price ceilings, plus the market, rivals and the date the pages were read.
2. **A market price map:** every rival's plans, prices (annual and monthly), metric, limits, free plan or trial, enterprise gate, add-ons and badges, with the source of each price.
3. **Each rival priced at your customer sizes,** so you see how per-seat, band, per-location and fee-funded models scale.
4. **Demand signals from search:** the share of price searches looking for free, how often buyers ask if the leader is free, switching searches, enterprise searches, and which segments advertisers pay most to reach.
5. **Eight decisions, each with its rule and numbers:** entry offer, value metric, price points, plan count, enterprise rung, annual discount, segment package and value ceiling.
6. **Recommended plans and a value ladder,** with upgrade triggers, add-ons and flagged gaps.
7. **A perception and packaging review** of price endings, badges, anchors, billing framing, free-plan wording and plan names.
8. **A validation plan:** a Van Westendorp survey, a Gabor-Granger price ladder built from rival prices, and pricing experiments, plus a price-increase plan when you need one.
9. **An unknowns list:** every price or signal that couldn't be read, and why.

In the other modes:
- **Offer design:** objection themes ranked from search, reviews and your notes; what rivals give; a new offer where every element answers one objection, with its cost per sale; a profit check with the break-even lift; a true reason to act now (fake urgency refused); a sized test.
- **Regional pricing:** a country table with price level, your sign-up and paid rates against home, a "price is the blocker" verdict, local rival prices, the band and the rounded local price, break-even lift and a go, test or no decision, plus abuse rules.
- **Announcements:** affected customers per segment and value, a dated rollout (staff first), every message, the FAQ, support replies and talking points, draft campaigns offered, and the reaction checks against your own baseline.

## What it can change for you

In the pricing, offer and regional modes, nothing: it reads pages and data and returns a plan. It never edits prices, products or coupons in Stripe or your store, and never touches your pricing page. In the announcement mode, after you confirm, it can create draft email campaigns in Klaviyo or Mailchimp. It never sends or schedules them.

## Tips

- Many pricing pages draw their prices with scripts. When the parsed page has no amounts, the skill reads the page with its web fetch tool or asks you, and marks the source of every price. It never guesses a price.
- Pages can come back in another currency. Prices in a different currency stay in the map but out of the medians unless you give an exchange rate.
- The thresholds are starting points. If a rule doesn't fit your business, say so and the skill notes the override in the report.
- For how the prices are presented and whether visitors act on them, follow up with the Pricing Page Auditor skill. For unit economics on live ad spend, use the LTV:CAC Ratio Optimizer.
