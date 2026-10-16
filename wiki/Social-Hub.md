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
3. In App settings → Basic, put your site's domain in **App domains** and add a **Website** platform with your site address. Then, under **Facebook Login for Business → Settings** (or Facebook Login → Settings), paste the redirect address shown in Social Hub into **Valid OAuth Redirect URIs**, press **Enter** so it becomes a tag, and press **Save changes**. Check it with the Redirect URI Validator at the top of that page; it must say the address is valid. Only if Facebook still refuses the sign-in, create a Facebook Login for Business configuration with those permissions and paste its **Configuration ID** into Social Hub.
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

## Permissions

Set under **Roles**:

| Permission | Lets someone |
| --- | --- |
| `socialhub.view` | Open Social Hub and read the lists. |
| `socialhub.post` | Write, schedule, publish, edit, retry and delete posts, and refresh the lists. |
| `socialhub.manage` | Connect and disconnect pages and edit the settings. |

## Behind the scenes

- **Tables** (`shub_` prefix): `shub_settings`, `shub_connections`, `shub_posts`, `shub_post_targets`, `shub_remote_posts`. App secrets and page tokens are encrypted with the site's `ENCRYPTION_KEY` (a restored backup written under a different key reads as "not set up" and needs the details entered again).
- **Scheduled jobs:** `/api/m/social-hub/cron/publish` (every 5 minutes) and `/api/m/social-hub/cron/sync` (hourly). Frequencies can be changed on **Settings → Social Hub → Publishing**, or under **Settings → General → Schedules**.
- **One publisher at a time:** a post is claimed with a row lock before it is sent, so two overlapping runs cannot post it twice. A post left "posting" by a run that died is failed after 15 minutes so a person can check the page before retrying.
- **Link previews and pictures from other websites** are fetched by the server, never the browser, and anything resolving to a private address is refused at every redirect. Remote pictures reach the admin screens through `/api/m/social-hub/admin/image` because the site's content security policy allows no third-party image hosts.
- **The OAuth sign-in** carries a one-off `state` bound to a ten-minute sealed cookie that also pins the person and the network.
- **APIs:** Facebook Graph API v24; LinkedIn REST Posts API, versioned by month (`LI_API_VERSION` in `lib/linkedin.ts`). LinkedIn's "little text format" characters are escaped in post text, because an unescaped bracket truncates a post.

## Troubleshooting

See the **Help** sub-tab under Settings → Social Hub for the common ones: no Pages shared, a Facebook post visible only to you (the app is still in Development mode), a missing permission, LinkedIn showing no Pages or refusing with a 403, and pictures that do not appear.

---

**Wiki:** [Home](Home) · [Modules](Modules) · [Authoring a module](Authoring-a-module) · [Unified Inbox](Unified-Inbox)
