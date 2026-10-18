# AI Call Answering

AI Call Answering puts a voice assistant on your phone line. It answers calls on the Twilio numbers you choose, talks to the caller in a natural [ElevenLabs](https://elevenlabs.io) voice, and writes up every call in the unified inbox.

- Settings: **Settings → AI Call Answering**, with sub-tabs **Assistant**, **Phone numbers** and **Calls**.
- Needs the **Twilio**, **Shop** and **Unified Inbox** modules, and an ElevenLabs API key.
- Module repository: [AI-Call-Answering](https://github.com/cactus-foundation-modules/AI-Call-Answering).

## What the assistant does

- **Product questions.** It looks up your products as the caller asks: sizes, options, price, stock, specifications and your own FAQs. It only states what the shop actually says; where the shop is silent it says so and offers a callback.
- **Suggestions.** It asks what the caller needs and roughly what they want to spend, searches the shop, and recommends one to three products.
- **Order enquiries.** It will not discuss an order until the caller has given the **delivery postcode** and at least one of the **order number**, the **email address** on the order or the **company name** on the order. Every detail given must match. After three wrong attempts in one call (or six from one number in an hour) it stops and offers a callback. It never reads out an email address, phone number or street address; it says the town, the status and the delivery progress.
- **Anything else.** It takes the caller's name and email (reading the email back letter by letter), plus what it is about, and tells them somebody will be in touch. You get a notification, and the call stays flagged until you mark it as dealt with.

It cannot change, cancel or refund an order, take payment, or promise delivery times or charges that are not in the shop.

## Setting it up

1. **Assistant** tab: paste your ElevenLabs API key (or set `ELEVENLABS_API_KEY` on the hosting), pick a voice, type your business name, and press **Set up the assistant**. That creates the agent, its five tools and the post-call webhook on ElevenLabs. Press it again after changing the voice, model or wording; the tab says when settings have changed since the last setup.
2. In the **Twilio** tab, switch on call handling (forwarding or voicemail) for the number. That is what points the number at your site. The **Phone numbers** tab warns if it has not been done.
3. **Phone numbers** tab: tick the numbers the assistant answers. Choose **Answer every call**, or **Only when the number is shut or nothing would ring** so your own phones still ring in opening hours.
4. Switch the assistant **on**.

The ElevenLabs API key needs access to Agents (read and write), Voices (read) and Workspace webhooks.

### Voice and models

| Setting | Default | Notes |
| --- | --- | --- |
| Speech model | `eleven_v4` | The most lifelike. `eleven_v4_turbo` answers a little quicker; `eleven_v3_conversational` and `eleven_flash_v2_5` are also offered. |
| Thinking model | Claude Sonnet 5.5 | Haiku 5.5 is quicker and cheaper; Opus 5.5 is the most thorough. |
| Voice | Alice (British) | The list is your ElevenLabs account's own voices. |
| Longest call | 15 minutes | The assistant ends a call that runs past this. |

Audio is set to 8kHz mu-law, which is what a phone line carries, so there is no conversion on either side.

## Calls in the unified inbox

Every call the assistant takes appears in the unified inbox as a phone conversation with a written overview (the summary, who called, how long, which orders were checked, any callback details) and the full transcript beneath it. A callback stays **open** until it is marked as dealt with in the **Calls** tab. The unified inbox also lists the raw call from the Twilio module; the assistant's entry is the one with the overview.

## If something goes wrong

The assistant is never allowed to leave a caller worse off. If it is switched off, not set up, the key is missing, ElevenLabs is slow (more than six seconds to answer) or down, or ElevenLabs answers with something that is not a connection, the call carries on to the number's ordinary forwarding and voicemail.

If a call is missing from the log, check that the post-call webhook still points at your site's address (it is set once, at first setup) and that the agent shown at ElevenLabs is the one this site made. Calls from other agents in the same ElevenLabs workspace are ignored.

## How it works (for developers)

| Piece | What it does |
| --- | --- |
| `twilio.inbound-call-handler` | Extension point published by the Twilio module (`lib/inbound-call-handlers.ts`). Every call reaching the voice webhook, after the blocked-caller and withheld-number checks, is offered to each handler; one returns TwiML to answer or `null` to decline. A handler that throws is a decline. |
| `lib/call-handler.ts` | This module's handler. Asks ElevenLabs to register the call (`POST /v1/convai/twilio/register-call`), returns the `<Connect>` TwiML, opens the call record. |
| `tools/<name>` | `search_products`, `get_product`, `list_categories`, `lookup_order`, `save_callback`. Called by ElevenLabs mid-call with a bearer token made at setup. Call identity (`call_sid`, conversation id) comes from dynamic variables the platform fills in, never from the model. Failures are answered as a 200 with words for the model, so a broken lookup becomes an apology rather than silence. |
| `webhooks/post-call` | ElevenLabs delivers the transcript after hang-up, signed with HMAC-SHA256 (`ElevenLabs-Signature: t=<unix>,v0=<hex>` over `<t>.<body>`, 30 minute window). Files the call, then tells the inbox via `core.conversation-arrived`. |
| `core.conversation-provider` | Publishes each call to the unified inbox as a `phone` conversation. |

Tables: `acall_settings` (singleton; secrets encrypted), `acall_numbers`, `acall_calls`.

Product and order reads go straight to the shop's tables. Only ACTIVE products that are not hidden from the catalogue and not spare parts are ever returned. Shop-variations and product-attributes data is used when those modules are installed.
