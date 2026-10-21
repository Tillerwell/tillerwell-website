# Analytics

Shows you **who visits your site and where they came from** - Google, an advert, your newsletter, Facebook, another website, or straight in - and, if you run the [Shop](Shop), **which visits ended in an order and who placed it**.

It is counted on your own site. Nothing is sent to Google or anyone else, and no IP addresses are stored. (If you also want Google Analytics or Google Ads, that is the separate [Google Tag](Google-Tag) module; the two get on fine.)

---

## Switching it on

1. Install the module. A small invisible **Analytics** block is added to your header layout for you.
2. Check **Settings > General > Analytics** - it tells you in plain words whether your cookie banner is set up to ask first.
3. Make sure your cookie banner has an **Analytics** category (Settings > General > GDPR & Legal offers it as a one-click suggestion). Until a visitor agrees to it, they are not counted.

Visits you make while signed in to the admin are left out, so you do not become your own best customer.

---

## Reading the numbers (sidebar > Analytics)

| Tab | What it shows |
|---|---|
| **Overview** | Visitors, visits, page views, orders and order value, a visits-per-day chart, and a channel table. |
| **Where from** | The same table, grouped by channel, by source (google, facebook, newsletter...), or by source / medium. |
| **Campaigns** | Every tagged campaign with its visits, orders and order value. |
| **Pages** | Where visits start, and the most viewed pages. |
| **Orders** | Each order, who placed it, what they spent, where they came from and how they first found you. CSV download. |
| **Visits & links** | The raw landing address of each visit with every `utm_` tag, ad click id and referring site. CSV download. |
| **Link builder** | Type a page and a source, medium and campaign; get a tagged link to paste into an advert, email or post. |

A **visit** ends after 30 quiet minutes, or when the same person arrives from a different tagged link.

### Who gets the credit for an order

Each order is credited to the customer's **latest visit that was not simply typing the address in**. Somebody who clicked an advert on Monday and came back direct on Friday to pay counts as an advert customer. The Orders tab also shows how they **first found you**, and the Where from tab has a *First found us* column.

The Orders tab says how many of the shop's orders it could not link to a visit. Those are customers who did not accept the Analytics cookie, blocked it, or ordered some other way.

### How a visit is filed

1. **Your own tags** (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, and any other `utm_` tag, which is kept) always win.
2. **Ad click ids** (Google `gclid`, Microsoft `msclkid`, Facebook `fbclid`, TikTok, LinkedIn and others) are used when there are no tags.
3. **The referring website** is used otherwise: a search engine is Organic Search, a social network is Organic Social, anything else is Referral.
4. No referrer is **Direct**.

Coming back from a payment page (PayPal, Stripe, your bank) is the same visit carrying on, not a new source.

---

## Settings (Settings > General > Analytics)

- **Count visitors** - the master switch.
- **Leave out browsers that ask not to be tracked** - honours Do Not Track and Global Privacy Control.
- **Leave out anyone signed in to the admin.**
- **Keep page-by-page history for** - 30 to 3650 days (default 730). Visits and orders are kept; only the list of individual pages is cleared, along with visits that never led to an order. Runs nightly (needs `CRON_SECRET`, like the other modules' jobs).
- **Other addresses that are this site** - extra hostnames so a visit from your other domain is not called a referral.

---

## Under the hood

- Tables: `ana_settings`, `ana_visitors`, `ana_sessions`, `ana_pageviews`, `ana_orders`.
- Cookies (first-party, HTTP-only): `ana_v` identifies the browser for about 13 months, `ana_s` the current visit for 30 minutes. Both are removed when a visitor withdraws consent.
- The browser reports to `POST /api/m/analytics/collect`. Orders arrive through core's conversion seam; the module reads the total and customer from the shop's own order, ignores anything not placed in the last 48 hours, and records each order once.
- Reports: `GET /api/m/analytics/admin/report` (permission `analytics.view`). Settings need `analytics.manage`.

**Wiki:** [Home](Home) · [Modules](Modules) · [Google Tag](Google-Tag) · [Shop](Shop)
