# Live Chat

The `chat` module puts a small chat bubble on your site and lets you talk to visitors from your admin. There is no chat server to run, no outside company holding your conversations and nothing to set up beyond switching it on. It does what it says on the tin, and very little else, which is rather the point.

Repo: `cactus-foundation-modules/live-chat`

> **Not to be confused with** [Live Chat Powered By Chatwoot](Live-Chat), the older and considerably busier module. The two can be installed side by side while you move over.

## Getting started

1. Install **Live Chat** from **Modules > Browse**.
2. Open your **header** or **footer** layout and drop in the **Live Chat** block. The bubble appears in the bottom corner of every page that uses that layout.
3. Look over **Settings > Live Chat**: the bubble's wording, the greeting, which corner it sits in, whether visitors may email themselves a transcript, and how long chats are kept.

Attachments need your media storage set up (Backblaze on most sites). Without it, chat still works; visitors are simply told files cannot be sent yet.

## What your visitors see

- A bubble in the corner. Clicking it opens the chat, with your greeting at the top and two optional boxes for their name and email. A **Save** button appears once either has something in it; what is saved drops out of the box, and the box goes once both are in. Saved before the first message, the details go with that message.
- They can send pictures, PDFs and office documents, up to 4MB each and three at a time.
- After their first message the chat asks whether they would like a **browser notification** when you reply. Say yes and they are told even after they have closed the tab, in browsers that allow it.
- If you reply while the chat window is shut, your message **pops up above the bubble**, the way a text does on a phone. A number on the bubble says how many they have not read.
- **End chat** closes the conversation and, if they tick the box, emails them a copy with any files linked.

## Cookies, and asking first

Live Chat has its own switch on your cookie banner, called **Live chat**. It is not added for you: open **Settings > GDPR & Legal**, find the cookie banner, and click the **Live chat** suggestion this module offers there (it arrives with its description already written). Settings > Live Chat tells you if it is missing, with a link straight to it.

Once the banner carries it:

- A visitor who has **not answered** the banner yet opens the chat and is asked first, with an **Allow live chat** button that says yes to live chat and nothing else, and a **Cookie settings** button for the full list. Anything they type stays in the box while they decide.
- A visitor who **said no** is told, politely, that live chat is switched off in their cookie settings. Try to send a message anyway and the chat tucks itself away and your cookie settings open on the switches; turn Live chat on and the chat opens again by itself.
- Saying no (or changing their mind later) wipes what the chat kept in their browser and deletes their trail from your visitor list straight away.

Without the switch on your banner (or with the banner off), nobody can be asked, so chatting works as it always has and the visitor list below stays empty, because nobody has agreed to be on it.

## Who is on the site

With **Show who is on the site** ticked in Settings > Live Chat (it is, by default), every visitor who said yes to the Live chat cookies is listed while they browse, whether or not they have said a word. You will find them under **On the site** in **Inbox > Live chat** and as the second tab of the bubble you see on the site while signed in.

For each visitor you see:

- the page they are on right now, how long they have been here, roughly what they are on (phone, tablet or computer) and where they came from;
- the pages they have looked at, newest first;
- **what is in their basket**, if you have the shop, with names and prices looked up from your own products and a total.

Pick a visitor and type in the box at the bottom to **say hello first**. A chat starts with them there and then, and pops up above their bubble within half a minute. Somebody already chatting is handed to their chat instead, so nobody gets two.

The same details sit at the top of every chat with a listed visitor (click the line under their name to open them), so you can see which chair they are dithering over while you talk.

A visitor's trail is deleted a week after they were last on the site.

## Answering chats

- **Inbox > Live chat** in the admin: open and ended chats down the side, the conversation beside them. Reply, attach files, end or reopen a chat, or delete it for good.
- **On the site itself**: while you are signed in, you see your own bubble instead of the visitor's. It lists the chats waiting for you and lets you answer without leaving the page. New messages pop up above it while it is shut.
- **The Unified Inbox**, if you have it: chats appear there the moment they are sent and can be answered from there too.
- Waiting chats light the **bell**, and anyone with desktop alerts switched on gets a notification.

Replies go out under your display name, first name only.

## Going offline, and the phone bar

- **Online/Offline switch**: on the Live chat tab of the Inbox, and in the header of the bubble you see on the site while signed in (needs `chat.reply`). Offline is site-wide. Visitors then see your **offline label and message** (set in Settings > Live Chat) instead of the greeting, and can still leave a message. Nothing flips it back for you.
- **Phone bar**: add the **Live chat: message us** cell to the Mobile Bar block. It opens the chat (or your chat list, when signed in) and carries the unread count. Tick **Hide the floating bubble on phones** in Settings so the bar is the only way in; the bubble stays on larger screens. The Live Chat block must still be in the header or footer, as it is what answers the button.

## Permissions

| Key | Lets somebody |
| --- | --- |
| `chat.view` | read chats, see the admin bubble on the site and see who is on the site |
| `chat.reply` | reply to, end and reopen chats, and message a visitor first |
| `chat.manage` | change settings and delete chats |

## Keeping and deleting

Chats with nothing said in them for longer than the number of months you set (12 by default) are deleted overnight, their files with them. Deleting a chat from the inbox removes its files from storage straight away. Visitor trails (pages and basket) go a week after the visitor was last seen, or at once if they say no to the Live chat cookies; the chat itself stays.

## For developers

- Module name `chat`, table prefix `chat_`: `chat_settings` (including `agent_online`, `hide_bubble_on_mobile`, `away_label`, `away_message`, `track_visitors`), `chat_conversations` (including `visitor_id`, `started_by`), `chat_visitors`, `chat_messages` (ids from the sequence `chat_messages_id_seq`), `chat_attachments`.
- **Live on serverless means polling.** The visitor's widget asks for messages after the last id it holds every 3 seconds while open and 12 while shut; admin views every 3-5 seconds; everything slows down when the tab is hidden.
- **Visitor identity** is a secret handed to the browser with its first message, kept in localStorage and sent as the `x-chat-visitor` header. Only its sha256 is stored. No cookies, no accounts. New chats are limited to 5 an hour from one address, messages to 20 a minute per chat.
- **Attachments** are stored with core's `uploadMedia` under `media/chat/<conversation>/` with an unguessable key and no library row (declared through `core.media-private-storage`), and served only by `/api/m/chat/attachments/<id>`: a signed `?sig=` link for visitors and transcripts, or an admin session with `chat.view`.
- **Visitor notifications** use Web Push with the site's own signing pair, through a service worker at `/api/m/chat/widget/sw` scoped to its own folder, so it takes over no page. They need an https `SITE_URL`.
- **Unified Inbox** support comes through `core.conversation-provider` (id `chat`) and `core.conversation-arrived`, announced after every message. The Unified Inbox's listener needs `SITE_URL` and `CRON_SECRET`.
- **Consent.** Manifest `cookieCategories` declares `live-chat` in the long form (the same key the Chatwoot module declares, so answers carry over). `lib/consent.ts` reads core's `siteConfig.consentBannerConfig`: gate `category` when the banner is enabled and carries `live-chat`, else `none`. Server side, `POST widget/messages` refuses with 403 `{ needsConsent: 'live-chat' }` under `category` without a yes in the `cactus-consent` cookie, and `POST widget/presence` refuses unless gate is `category` AND the yes is there. Client side, `lib/consent-client.ts` saves a yes through core's `saveConsentDecision` (action `custom`; every other optional category keeps the visitor's stored answer, or `false` if they never answered) and opens the banner with `window.cactusConsent.open()`. The widget listens on `cactus:consent-change`; a stored no clears `localStorage['cactus-chat']` and DELETEs the presence row.
- **Visitors.** `chat_visitors` (migration `003_visitors.sql`): claimed like a chat, `<id>.<secret>` in localStorage, sent as `x-chat-presence`, only the sha256 stored. The widget checks in (`POST /api/m/chat/widget/presence`) on arrival, on each `usePathname()` change, on the shop's `cactus-shop-cart-changed` event and every 30s while the tab is in front; "online" means a check-in in the last 90s. Trail is the newest 30 pages. The basket is read from the shop's own `localStorage['cactus_shop_cart']` (ids and quantities only, sent only when changed) and named and priced server side from `shp_products` by id, read only and only when that table exists; the chat does not require the shop. 30 new visitor rows an hour per address. Rows are pruned 7 days after `last_seen_at` by the nightly cron and opportunistically whenever a new visitor arrives.
- **Saying hello first.** `POST /api/m/chat/admin/visitors/<id>/chat` (`chat.reply`) replies into the visitor's open chat if they have one, else creates a `chat_conversations` row with `started_by = 'agent'`, `visitor_id` set and `visitor_token_hash` = the visitor row's own token hash. The presence reply names that chat id (never a secret) and the browser claims it as `<chat id>.<its presence secret>`. `chat_conversations.visitor_id` is `ON DELETE SET NULL`, so pruning a trail never takes a chat with it. Admin reads: `GET admin/visitors` (online list, plus `reason`: `off` | `no-category`), `GET admin/visitors/<id>`, and `GET admin/conversations/<id>` now carries `visitor`.
- Needs `ENCRYPTION_KEY`; `CRON_SECRET` runs the nightly retention sweep (`/api/m/chat/cron/retention`), which now prunes visitor trails first.

---

**Wiki:** [Home](Home) · [Modules](Modules) · [Unified Inbox](Unified-Inbox) · [Live Chat Powered By Chatwoot](Live-Chat)
