# Social Hub

Social Hub connects your **Facebook Page** and your **LinkedIn Page** to the site. From one admin page you can see what you have already posted on both, write new posts with pictures and link previews, post them now, or schedule them for later.

- Sidebar: **Social Hub** (one link, with the lists and the composer on the page).
- Settings: **Settings → Social Hub**, with sub-tabs **Accounts**, **Facebook setup**, **LinkedIn setup**, **Publishing** and **Help**.
- Module repository: [social-hub](https://github.com/cactus-foundation-modules/social-hub).

## Using it

Open **Social Hub** in the sidebar.

- The row of chips under the title filters by page. The control under that switches between **Published** (what is on your pages), **Scheduled**, **Drafts** and **Needs attention** (posts that did not go out, with the reason).
- **New post** opens a sheet. Choose the pages, write the text, add up to four pictures from the media library (or upload one), and add a link. A web address in your text turns into a preview card by itself; the cross removes it. Then choose **Post now**, **Schedule** (with a date and time) or **Save as draft**.
- With pictures attached, the link goes into the text of the post instead of showing as a card. That is how both Facebook and LinkedIn behave.
- The round arrow at the top reads your pages again for new posts, likes, comments and shares. This also happens by itself every hour.
- A scheduled post goes out **on or after** its time, at the next check (every five minutes where the site allows). **Post now** on a scheduled post sends it immediately.
- If one page fails and another works, the post is **Partly posted**. Press **Try again** and only the failed page is retried - nothing is posted twice.

## Setting it up

Everything is on **Settings → Social Hub**. The **Facebook setup** and **LinkedIn setup** sub-tabs hold the step-by-step guides, the address to give each network, and the boxes for the app details. The short version:

### Facebook

1. At [developers.facebook.com/apps](https://developers.facebook.com/apps/), **Create app** and choose the **Manage everything on your Page** use case.
2. Add the permissions `pages_show_list`, `pages_read_engagement` and `pages_manage_posts`.
3. In App settings → Basic, put your site's domain in **App domains** and add a **Website** platform with your site address. Then, under **Facebook Login for Business → Settings** (or Facebook Login → Settings), paste the redirect address shown in Social Hub into **Valid OAuth Redirect URIs**, press **Enter** so it becomes a tag, and press **Save changes**. Check it with the Redirect URI Validator at the top of that page; it must say the address is valid. If your app uses **Facebook Login for Business** (it is in the left-hand menu), also create a **Configuration** under Facebook Login for Business → Configurations with those three permissions (login variation General, User access token) and paste its **Configuration ID** into Social Hub. Such apps grant only what the configuration lists, and Social Hub refuses to connect a page that was not granted all three.
4. Copy the **App ID** and **App secret** (App settings → Basic) into Social Hub and press **Save app details**.
5. Switch the app from Development to **Live** (it needs a privacy policy address). Posts made by an app that is still in Development mode are only visible to people with a role on the app.
6. On the **Accounts** tab press **Connect Facebook** and tick the Pages you want.

### LinkedIn

1. At [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps), create an app tied to your company Page, and have a super admin of the Page verify it.
2. On the **Products** tab request the **Community Management API**. LinkedIn approves it by hand; allow a few days.
3. On the **Auth** tab, add the redirect address shown in Social Hub to **Authorized redirect URLs**.
4. Copy the **Client ID** and **Primary Client Secret** into Social Hub and save.
5. On the **Accounts** tab press **Connect LinkedIn**.

### How long connections last

- Facebook Page connections do not expire. They stop working if the person who connected them changes their Facebook password, loses admin access to the Page or removes the app.
- LinkedIn sign-ins last about 60 days. Social Hub renews them quietly when LinkedIn gave the app a refresh token; otherwise the page shows **Needs reconnecting** and one press of **Reconnect** fixes it for another two months.
- A page that needs reconnecting is flagged on the Social Hub page and in the admin bell. Posts for it fail with a clear message and can be retried after reconnecting.

## With Gazette: the Social posts tab

If the **Gazette** module is installed too, Gazette gets one extra tab, **Social posts** (`Gazette -> Social posts`, needs `socialhub.view`). It lists every Gazette post with a **Facebook** column and a **LinkedIn** column:

- **Posted** with a **View post** link, when a post on that page links to the Gazette post. Social Hub looks for the address both in the link card and in the words of the post, ignoring `www.`, `http` versus `https`, a trailing slash and tracking tags (`?utm_...`).
- **Scheduled**, with **Due** and the date and time, when a post waiting to go out links to it.
- **Failed**, with **Try again**, when the last attempt did not go out.
- **Not posted**, with a **Post** button that opens the usual new-post sheet already filled in: the post title and excerpt, the Gazette post attached as a link card, and that network's pages ticked. Needs `socialhub.post`. Drafts, posts not live yet and members-only posts have no public address, so they have no button.

With more than one page on a network the column lists each page by name. Two filters (Facebook and LinkedIn: **Any / Posted / Scheduled / Not posted**) and a title search narrow the list; set Facebook to **Not posted** and LinkedIn to **Posted** to find what still needs putting on Facebook.

**The limit worth knowing:** Social Hub only knows what it has read from each page - the most recent 25 Facebook posts and 20 LinkedIn posts at each hourly read, kept from then on - plus the posts written in Social Hub itself. A Gazette post shared by hand long before Social Hub was connected shows **Not posted**. Shortened links (`fb.me`, `lnkd.in`) cannot be matched back to the post.

## With Gazette: sharing from the post editor

With **Gazette** installed, the Gazette post editor gets a **Share on social media** card under **Publish** (needs `socialhub.view` to see it, `socialhub.post` to change it):

- Tick each connected Facebook or LinkedIn page the post should also go to. A page that needs reconnecting cannot be ticked.
- Once something is ticked, a text box appears, filled with the post's title and excerpt. Edit it freely (up to 3,000 characters, LinkedIn's limit). A link to the Gazette post is added for you, with its headline, excerpt and featured picture as the link card.
- **When the article goes live** (the default) or **At a set time**. A set time earlier than the article itself is moved to the article's time, so nothing links to a page that is not up yet.
- Changes save on their own after a second. Pressing **Publish Now** or **Schedule** in Gazette saves the card first; if the social post cannot be saved (too long, a page disconnected) the article is not published and the reason shows under the Publish buttons.

What happens next:

- **Publish Now:** the social post is sent straight after the article goes live (the five-minute publishing job picks it up if that first attempt is interrupted).
- **Schedule:** the social post is scheduled for the same moment. Reschedule the article and the social post moves with it.
- **Unpublish**, or the article is made **Private:** a social post that has not gone out goes back to waiting. Deleting the article deletes a social post that has not gone out.
- **An article that is already live:** ticking pages offers **Post now** (or **Schedule social post** with a set time) in the card instead.

Once it has gone, the card shows where it landed with **View** links, and **Try the failed ones again** if only some pages took it. These are ordinary Social Hub posts, so they also appear under **Scheduled** and **Drafts** on the Social Hub page. One social post per article; to share it again later, use the Social posts tab below or Social Hub itself.

## Deleting a post from Facebook or LinkedIn

On the **Published** list, every post has a **Delete from Facebook** (or **LinkedIn**) button for anyone with `socialhub.post`. It asks first, because this removes the post from the page for everyone, reactions and comments included, and cannot be undone.

- Social Hub asks the network to delete the post **first**. Only when the network agrees is it removed from the list here. If the network refuses (a missing permission, a sign-in that needs renewing) you are told why and nothing changes.
- A post that was already deleted on Facebook or LinkedIn itself is simply cleared from the list.
- If Social Hub posted it, its own record of that post goes too, so the Gazette **Social posts** tab stops showing it as posted.
- Only posts shown in the list can be deleted. Facebook needs the `pages_manage_posts` permission (already required for posting); LinkedIn needs you to be a super admin of the page.
- The **Delete** button on drafts and scheduled posts is unchanged: those never reached a network, so they just disappear from here.

## When a network will not share everything

Each read of a page records what the network refused to hand over (like and comment counts, link details, older posts). It is shown under the page in **Settings -> Social Hub -> Accounts**, as a banner on the Social Hub page and on the Gazette **Social posts** tab, and as part of the admin bell notification. It clears by itself on the next read once the cause is fixed (usually: reconnect the page and accept every permission offered). Facebook is read in steps, richest first, so a refusal of the counts still leaves you the posts and their links.

## Permissions

Set under **Roles**:

| Permission | Lets someone |
| --- | --- |
| `socialhub.view` | Open Social Hub and read the lists. |
| `socialhub.post` | Write, schedule, publish, edit, retry and delete posts, and refresh the lists. |
| `socialhub.manage` | Connect and disconnect pages and edit the settings. |

## Behind the scenes

- **Tables** (`shub_` prefix): `shub_settings`, `shub_connections`, `shub_posts`, `shub_post_targets`, `shub_remote_posts`. A post that follows a Gazette article carries `source_kind`/`source_id` (and `source_at`, its own later time) on `shub_posts`; Gazette tells Social Hub when the article is published, scheduled, unpublished or deleted through its `gazette.post-status-changed` extension point. App secrets and page tokens are encrypted with the site's `ENCRYPTION_KEY` (a restored backup written under a different key reads as "not set up" and needs the details entered again).
- **Scheduled jobs:** `/api/m/social-hub/cron/publish` (every 5 minutes) and `/api/m/social-hub/cron/sync` (hourly). Frequencies can be changed on **Settings → Social Hub → Publishing**, or under **Settings → General → Schedules**.
- **One publisher at a time:** a post is claimed with a row lock before it is sent, so two overlapping runs cannot post it twice. A post left "posting" by a run that died is failed after 15 minutes so a person can check the page before retrying.
- **Slow answers and one automatic retry:** Facebook is given 30 seconds to take a post (it fetches the linked page and picture first). If it still goes quiet, the post is marked failed and the next publishing run tries that page once more, at least five minutes later. Before sending again Social Hub reads the page's recent posts, and if the post is already there it records that instead of posting it twice. If the page cannot be read, nothing is re-sent and the post stays failed with a note to look at the page. Only Facebook timeouts are retried automatically (LinkedIn offers no such check), a refusal is never retried, and a post waiting on its retry does not raise the bell notification. A person pressing Retry gets the same look at the page first.
- **Link previews and pictures from other websites** are fetched by the server, never the browser, and anything resolving to a private address is refused at every redirect. Remote pictures reach the admin screens through `/api/m/social-hub/admin/image` because the site's content security policy allows no third-party image hosts.
- **The OAuth sign-in** carries a one-off `state` bound to a ten-minute sealed cookie that also pins the person and the network.
- **APIs:** Facebook Graph API v24; LinkedIn REST Posts API, versioned by month (`LI_API_VERSION` in `lib/linkedin.ts`). LinkedIn's "little text format" characters are escaped in post text, because an unescaped bracket truncates a post.

## Troubleshooting

See the **Help** sub-tab under Settings → Social Hub for the common ones: no Pages shared, a Facebook post visible only to you (the app is still in Development mode), a missing permission, LinkedIn showing no Pages or refusing with a 403, and pictures that do not appear.

---

**Wiki:** [Home](Home) · [Modules](Modules) · [Authoring a module](Authoring-a-module) · [Unified Inbox](Unified-Inbox)
