# The Sneaky Produnktions overlay

Everything in this directory is applied to the `structs-webapp` submodule as it
is built. Nothing in the submodule is edited. The client stays in English;
there is no translation layer.

| Path | What it is |
|---|---|
| `patches.cjs` | `[exact upstream text, replacement]` pairs per upstream file: the guild connection, recovery, the telemetry name, players' own pictures, the Sneaky gallery, and Sneaky Produnktions in place of SN Corp in sign-up and the tutorial |
| `runtime/` | Loaded before webapp's entry as `__sneaky`: `guild` (`guild.js`, the services of the guild the page plays through, Sneaky Produnktions), `recovery` (`recovery.js`, moving a recovered player of another guild into it), `pfp` (`pfp.js`, every portrait showing the player's `pfp` URL over the generated one, and setting a sign-up picture as `pfp` on chain), `gallery` (`gallery.js`, the Sneaky NFT gallery, at sign-up and on a member's own profile) and `account` (`account.js`, creating the account at sign-up without a recovery key section, and Download Player in place of Log Out) |
| `pfp/` | The Sneaky Produnktions NFTs players choose from, `<collection>/<id>.webp`, and `collections.json`; made by `make_pfps.py` from `../Sneaky`, served at `/sneaky/pfp/` |
| `public/` | Static files served over webapp's: `guild.json` (the guild's on-chain endpoint), `favicon.ico`, and `sneaky/` with `sneaky.css`, the sign-up badge, the guild logo and icons |
| `page.cjs` | Renders webapp's Twig pages (`templates/`) to `index.html` and `sector-blitz/` (the public leaderboard), adding Google Tag Manager (`GTM-58HZKHDD`), the icons and `sneaky.css` |
| `overlay.cjs`, `loader.cjs` | Apply `patches.cjs` to each source file webpack reads |
| `check.cjs` | `npm run check` / `npm test`: stale or orphaned patches, SN Corp left on screen, guild.json against `GUILD_ID`, pictures missing from `pfp/` |

## Writing a patch

```js
'js/view_models/signup/Orientation7ViewModel.js': [
  ['on behalf of SN.CORPORATION.`', 'on behalf of SNEAKY PRODUNKTIONS.`'],
],
```

- The first string is copied exactly from the upstream file; every occurrence
  is replaced, in one pass, longest first.
- Include enough around it (quotes, tags) that it only matches what you mean,
  never an id, class, storage key or anything sent to the guild or the chain.
  CSS classes such as `snc-logo` keep webapp's names.
- One key per upstream file: a second entry for the same file replaces the
  first.

## The art

All of it is made from the Sneaky Produnktions archive in `../Sneaky` by
`make_art.py`, from their pig, the @SneakyProds avatar
(`logos/community-avatar.jpg`). `public/sneaky/img/sneaky-produnktions-badge.png`
is the pig, its black background cleared, in the top of a 384px square, the
shape of webapp's 192px sign-up logo slot, with the motto set under it by
`sneaky.css`. `sneaky-produnktions-logo.jpg` is the avatar as it is, for
`guild.json`; the icons are the pig on black.

`pfp/` holds every Sneaky Animals, People, Stuff and Transformation artwork as
a 320px square WebP. See the main README's *Profile pictures*.
