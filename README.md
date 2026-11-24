# sneaky.structs.zone — Structs for Sneaky Produnktions

The [structs-webapp](https://github.com/playstructs/structs-webapp) game client
for [Sneaky Produnktions](https://x.com/SneakyProds)' Structs guild (`SNEAK`,
guild `0-18`). structs-webapp is a git submodule (`structs-webapp/`, following its
`main`) and its client is built as it is: its own JavaScript, page, styles and
art, in English, with its webpack configuration as the starting point. What
this repository adds is the overlay in [`sneaky/`](sneaky/README.md), applied while
webpack reads webapp's sources. Nothing in the submodule is edited, so a newer
structs-webapp builds with the same overlay.

Only the client side is used. This site hosts no guild API of its own: the page
talks straight to the guild's API, its GRASS feed and its chain node, which
`beta.playstructs.com` runs for Sneaky Produnktions.

Onboarding and tutorial telemetry is reported with the interface name
`sneaky.structs.zone`, so these runs can be told apart from other clients' in the
guild's reports (`?interface_name=sneaky.structs.zone`).

## Setup

```bash
git clone --recurse-submodules <this repository>
npm install          # also installs structs-webapp/src's own dependencies
npm run dev          # http://localhost:5203
```

## Updating structs-webapp

```bash
npm run update:webapp
```

This moves the submodule to the latest `main`, installs its dependencies and
runs the check, which lists what the update touched:

| Report | Meaning | What to do |
|---|---|---|
| `stale` | upstream changed the text a patch replaces | fix the patch in `sneaky/patches.cjs` |
| `orphan` | a patched upstream file is gone | move or delete its patches |
| `branding` | SN Corp is named somewhere a player sees | add a patch naming Sneaky Produnktions |
| `guild` | `sneaky/public/guild.json` and `GUILD_ID` disagree | fix whichever is wrong |
| `pfp` | a picture `sneaky/pfp/collections.json` lists isn't in `sneaky/pfp/` | run `sneaky/make_pfps.py` |

`npm test` fails while any remain. The build shows stale patches as warnings.
Commit the submodule pointer together with the overlay.

## Profile pictures

Every portrait (the HUD, profile, guild roster, player search, scans, spectator
and device activation) shows the player's own picture, their `pfp` on chain,
when it is a URL a browser can load: `https` (`http` is upgraded), or `ipfs://`,
`ipns://` and `ar://` through the ipfs.io and arweave.net gateways. webapp's
generated portrait stays underneath, and shows when a player has no such
picture or it fails to load (`sneaky/runtime/pfp.js`). Sector Blitz's public raid
lists are the exception: the guild API sends them only the generated portrait's
attributes, so they show a player's picture only when it is in those too, as it
is for everyone who signs up here.

### The Sneaky gallery

Members choose their picture from every Sneaky Produnktions NFT, which this site hosts
itself, at `https://sneaky.structs.zone/sneaky/pfp/<collection>/<id>.webp`:

| Collection | `<collection>` | Numbers |
|---|---|---|
| Sneaky Animals | `animals` | 1 to 999 |
| Sneaky People | `people` | 1 to 999 |
| Sneaky Stuff | `stuff` | 1 to 420 |
| Sneaky Transformation | `transformation` | 1 to 196 |

The gallery has a tab per collection (webapp's own nav tabs), each one endless
scroll of its pictures, edge to edge; images load as they come into view, and
the grid holds only the rows around what's in view, so even a collection of
999 scrolls and jumps at once. A player who knows their picture's number finds it:
the gallery scrolls to it and outlines it. Clicking a picture chooses it. No
wallet is involved: the picture is the player's choice. Its controls are
webapp's own SUI components: nav tabs, screen buttons, the text input and its
warning, and the close link (`sneaky/runtime/gallery.js`).

It opens from two places:

- **Sign-up**: **Choose Sneaky**, beside the generated picture. That URL can't go
  into the sign-up request's `pfp`: the guild API requires it to be JSON, which
  the chain then refuses as a pfp. So it goes in `pfp_client_render_attributes`
  as `url` (beside the generated layers, which other clients keep showing), the
  player joins with it, and when they first play, their own key sets their
  `pfp` on chain to the same URL (`MsgPlayerUpdatePfp`).
- **Profile**: the edit button on a member's own portrait. Their key sets the
  new picture as their `pfp` on chain at once (`MsgPlayerUpdatePfp`), and the
  profile and HUD show it.

Sneaky pictures are shown from whichever host serves the page (`/sneaky/pfp/…`),
so they show in development too; other clients load them from
sneaky.structs.zone.

The pictures are made from the Sneaky Produnktions NFT archive (`../Sneaky`,
with its `README.txt`) by [`sneaky/make_pfps.py`](sneaky/make_pfps.py) (Python
with Pillow): 320px square WebP, quality 82. The originals are photographs of
drawings on paper, of every shape; each is cropped to a square around its
drawing, so the drawing fills a portrait. A drawing longer than its sheet is
wide gets more paper at the sides, and one that covers a long sheet is shown
whole, over a blurred copy of itself. They come to about 36 MB in 2,614 files
(the originals are 569 MB), which the dev server serves from disk and the build
copies into `dist/sneaky/pfp/` as they are. `sneaky/pfp/collections.json` lists
the collections for the gallery.

```bash
python3 -I sneaky/make_pfps.py ../Sneaky   # keeps existing pictures
```

## Sign-up and the player's key

Sign-up has no recovery key section: once the player has chosen their name,
the page makes their account's key (a mnemonic) and creates the account
straight away, with nothing shown, explained or confirmed, and goes on to
Success. If the guild can't create it, the player sees why and can try again
with the same key (`sneaky/runtime/account.js`).

The Account page has **Download Player** where webapp has **Log Out**: a text
file, `<name>-<player id>.structs-player.txt`, holding the mnemonic this
browser signs with. After sign-up that is the account's own key; after an
account recovery or a device activation it is this browser's device key, which
can recover the player too, for as long as that device stays registered.

## Which guild

The site is Sneaky Produnktions': its guild is `0-18`, fixed in `webpack.config.js`
(`GUILD_ID`), and never looked up. Webapp normally asks its guild API which
guild it is (`/guild/this`), but Sneaky Produnktions shares SN Corp's API, so the page
asks for `/guild/0-18` instead.

Before webapp's code starts, the page reads its guild's `guild.json` (the endpoint
the guild set on chain, `https://sneaky.structs.zone/guild.json`, which this site
serves from [`sneaky/public/guild.json`](sneaky/public/guild.json)) for its
`guild_api`, `grass_nats_websocket` and `client_websocket`
(`sneaky/runtime/guild.js`). If it can't be read, it uses what it last read, then
the fallback in `webpack.config.js`. Requests carry a bearer token from the
guild's `/api/auth/token` (the same signed login as `/api/auth/login`), since a
guild's session cookie would be third-party here.

Account recovery asks the chain which guild the key's player is in before it
calls the guild API, since a shared API may log in another guild's player. A
player of another guild is moved here first: the key signs
`MsgGuildMembershipJoin` for this guild (allowed when its join minimum is 0),
and recovery goes on once the chain shows the move and the guild API knows the
player. Recovery stops instead when the player owns their guild, the guild asks
a join minimum, or the chain can't be read (`sneaky/runtime/recovery.js`).

| Variable (build time) | Default | |
|---|---|---|
| `SNEAKY_LCD_URL` | `https://public.testnet.structs.network` | the chain node the guild is read from |
| `SNEAKY_GUILD_API` | — | a fixed guild API (a local guild in development), skipping guild.json |
| `SNEAKY_GRASS_URL`, `SNEAKY_CHAIN_WS` | — | override what the guild publishes |

### On chain

| | |
|---|---|
| Guild | `0-18` Sneaky Produnktions, tag `SNEAK`, owned by founder player `1-14709` (`structs1h027uh9x62ducr3hfdpfw338432d3f50y9dr9j`) |
| Primary reactor | `3-17` AlxVoy ANODE.TEAM (`structsvaloper1d8c0fqlquj5fpm3xdj9f2gwlamezfavhm0tdtm`) |
| Entry substation | `4-29`, fed by allocation `6-80` from the guild's own stake |
| Joining | open: join minimum 0, invite bypass permissioned |
| Endpoint | `https://sneaky.structs.zone/guild.json` |
| Sign-up (TSA) | player `1-14714` (`structs1xnk7tves570k2u33kujute63xcdyk4c85c22rk`), the host's proxy-join signer: 512 (GuildMembership) on `0-18`, 1024 (SubstationConnection) on `4-29` |
| Bank denom | `sly` / `usly` (in guild.json) |

## Building and serving

```bash
npm run build        # dist/
```

`dist/` is a static site: `index.html` (webapp's game page), `sector-blitz/`
(webapp's public Sector Blitz leaderboard, and one page per sector), the bundles in
`js/` and webapp's `css/`, `img/`, `lottie/` and fonts, plus `guild.json` and
Sneaky Produnktions' art in `sneaky/`, its NFT pictures in `sneaky/pfp/`. It uses absolute paths, so serve it from the root
of `sneaky.structs.zone`; it needs nothing else on that domain, but `guild.json`
must be readable cross-origin (`Access-Control-Allow-Origin: *`), since other
clients read it. `.github/workflows/pages.yml` publishes it to GitHub Pages.

## Licences

structs-webapp is Apache-2.0 (Slow Ninja Inc). Sneaky Produnktions' logo and icons in
`sneaky/public/`, and the NFT art in `sneaky/pfp/`, are Sneaky Produnktions' own, used for
its guild.
