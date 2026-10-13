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
| `chat.view` | read chats, and see the admin bubble on the site |
| `chat.reply` | reply to, end and reopen chats |
| `chat.manage` | change settings and delete chats |

## Keeping and deleting

Chats with nothing said in them for longer than the number of months you set (12 by default) are deleted overnight, their files with them. Deleting a chat from the inbox removes its files from storage straight away.

## For developers

- Module name `chat`, table prefix `chat_`: `chat_settings` (including `agent_online`, `hide_bubble_on_mobile`, `away_label`, `away_message`), `chat_conversations`, `chat_messages` (ids from the sequence `chat_messages_id_seq`), `chat_attachments`.
- **Live on serverless means polling.** The visitor's widget asks for messages after the last id it holds every 3 seconds while open and 12 while shut; admin views every 3-5 seconds; everything slows down when the tab is hidden.
- **Visitor identity** is a secret handed to the browser with its first message, kept in localStorage and sent as the `x-chat-visitor` header. Only its sha256 is stored. No cookies, no accounts. New chats are limited to 5 an hour from one address, messages to 20 a minute per chat.
- **Attachments** are stored with core's `uploadMedia` under `media/chat/<conversation>/` with an unguessable key and no library row (declared through `core.media-private-storage`), and served only by `/api/m/chat/attachments/<id>`: a signed `?sig=` link for visitors and transcripts, or an admin session with `chat.view`.
- **Visitor notifications** use Web Push with the site's own signing pair, through a service worker at `/api/m/chat/widget/sw` scoped to its own folder, so it takes over no page. They need an https `SITE_URL`.
- **Unified Inbox** support comes through `core.conversation-provider` (id `chat`) and `core.conversation-arrived`, announced after every message. The Unified Inbox's listener needs `SITE_URL` and `CRON_SECRET`.
- Needs `ENCRYPTION_KEY`; `CRON_SECRET` runs the nightly retention sweep (`/api/m/chat/cron/retention`).

---

**Wiki:** [Home](Home) · [Modules](Modules) · [Unified Inbox](Unified-Inbox) · [Live Chat Powered By Chatwoot](Live-Chat)
