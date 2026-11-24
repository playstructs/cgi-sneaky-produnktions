// Profile pictures: the player's own picture first, webapp's generated one
// only when there is none.
//
// A player's picture on chain is `pfp`, a URL (or an opaque id). webapp never
// shows it: every portrait is drawn from `pfp_client_render_attributes`, the
// layers of its generated robot. Here every portrait shows the player's `pfp`
// when it is a URL a browser can load, over the generated layers, which stay
// underneath as the fallback: a picture that fails to load is removed.
//
// The URL travels inside the render attributes, as `url`:
// - sneaky/patches.cjs has PlayerFactory and PlayerSearchResultDTOFactory (every
//   player and player search result webapp reads) put the player's `pfp` there,
//   which every portrait already receives;
// - sign-up puts the chosen Sneaky picture there (gallery.js), since the guild
//   API's sign-up request can't carry a URL in `pfp` (it requires JSON, which
//   the chain refuses in a pfp). Once the player exists, their own key sets
//   `pfp` on chain to the same URL (syncOwnPfp below).
//
// Sneaky pictures are hosted by this site, sneaky.structs.zone/sneaky/pfp/ (made by
// sneaky/make_pfps.py), and are shown from whichever host serves this page, so
// they show in development and on any copy of the site too.
import {PfpClientRenderAttributes} from '../../structs-webapp/src/js/models/PfpClientRenderAttributes.js';
import collections from '../pfp/collections.json';

export const SITE = 'https://sneaky.structs.zone';
const PATH = '/sneaky/pfp/';
const SNEAKY = /^https:\/\/sneaky\.structs\.zone\/sneaky\/pfp\/([a-z-]+)\/(\d{1,4})\.webp$/;
const GATEWAYS = {
  'ipfs:': 'https://ipfs.io/ipfs/',
  'ipns:': 'https://ipfs.io/ipns/',
  'ar:': 'https://arweave.net/',
};
const PLACEHOLDER = '<img class="pfp-viewer-layer" src="/img/portrait-placeholder.png" alt="Profile picture">';

export {collections};
export const collection = slug => collections.find(c => c.slug === slug) ?? null;

/** Whether this collection has a picture numbered `id`. */
export function exists(c, id) {
  return Number.isInteger(id) && id >= c.first && id <= c.last && !c.missing.includes(id);
}

/** The picture's URL, as players set it on chain. */
export const pictureUrl = (slug, id) => `${SITE}${PATH}${slug}/${Number.parseInt(id, 10)}.webp`;

/**
 * @param {*} value a pfp URL
 * @return {{collection: object, id: number}|null} the Sneaky picture it is, if any
 */
export function sneakyPicture(value) {
  const match = typeof value === 'string' ? value.match(SNEAKY) : null;
  const c = match && collection(match[1]);
  const id = match && Number(match[2]);
  return c && exists(c, id) ? {collection: c, id} : null;
}

/**
 * @param {*} value a pfp as players set it
 * @return {string|null} a URL an <img> can load, or null
 */
export function src(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    return null;
  }
  const sneaky = sneakyPicture(value.trim());
  if (sneaky) {
    return `${PATH}${sneaky.collection.slug}/${sneaky.id}.webp`; // this site serves them
  }
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null; // an opaque id, or not a URL
  }
  if (GATEWAYS[url.protocol]) {
    // ipfs://CID/path and ipfs:CID/path alike.
    const id = (url.host + url.pathname).replace(/^\/+/, '');
    return id ? GATEWAYS[url.protocol] + id + url.search : null;
  }
  if (url.protocol === 'http:') {
    url.protocol = 'https:'; // a secure page can't show it otherwise
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    return null;
  }
  return url.href;
}

const escape = text => text.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** Patched into PfpClientRenderAttributes.fromJson: keeps the `url` webapp's model drops. */
export function keepUrl(obj, attributes) {
  if (typeof obj?.url === 'string' && obj.url) {
    attributes.url = obj.url;
  }
  return attributes;
}

/**
 * Patched into the player factories: the player's own picture, `pfp`, into the
 * render attributes every portrait is drawn from.
 *
 * @param {string|null} pfp the player's pfp on chain
 * @param {PfpClientRenderAttributes|null} attributes
 * @return {PfpClientRenderAttributes|null}
 */
export function attributes(pfp, attributes) {
  if (!src(pfp)) {
    return attributes;
  }
  const merged = attributes ?? new PfpClientRenderAttributes();
  merged.url = pfp;
  return merged;
}

/**
 * Patched into PfpViewerComponent.renderHTML.
 *
 * @param {object|null} pfp the component's render attributes
 * @param {string} layers webapp's own HTML for them
 * @return {string}
 */
export function html(pfp, layers) {
  const url = src(pfp?.url);
  if (!url) {
    return layers;
  }
  return `${layers || PLACEHOLDER}<img class="pfp-viewer-layer sneaky-pfp-url" src="${escape(url)}" alt="Profile picture" referrerpolicy="no-referrer">`;
}

// A picture that can't be loaded leaves the generated one showing.
window.addEventListener('error', event => {
  if (event.target instanceof HTMLImageElement && event.target.classList.contains('sneaky-pfp-url')) {
    event.target.remove();
  }
}, true);

/** Shows a player's new picture everywhere webapp shows the player's own portrait. */
export function showOwn(player, url) {
  player.pfp = url;
  player.pfp_client_render_attributes = attributes(url, player.pfp_client_render_attributes);
  const event = new CustomEvent('RENDER_PLAYER_PFP');
  event.playerType = 'player';
  window.dispatchEvent(event);
}

// The picture chosen at sign-up is in the player's render attributes; once the
// player exists their own key sets it as their pfp on chain. Only a key that is
// the player's own primary address does it (not a device key, nor in spectator
// mode, where the "player" is someone else), and once a page load.
const synced = new Set();
window.addEventListener('RENDER_PLAYER_PFP', event => {
  if (event.playerType !== 'player') {
    return;
  }
  const {gameState, signingClientManager} = globalThis;
  const player = gameState?.keyPlayers?.player?.player;
  const url = player?.pfp_client_render_attributes?.url;
  if (!player?.id || player.pfp || !sneakyPicture(url) || synced.has(player.id)) {
    return;
  }
  if (!signingClientManager || !gameState.signingAccount || gameState.signingAccount.address !== player.primary_address) {
    return;
  }
  synced.add(player.id);
  signingClientManager.queueMsgPlayerUpdatePfp(player.id, url)
    .then(tx => {
      if (tx?.status !== 'succeeded') throw new Error(tx?.error ?? tx?.status ?? 'not sent');
      player.pfp = url;
      console.info(`[sneaky] pfp of ${player.id} set to ${url}`);
    })
    .catch(error => console.warn(`[sneaky] pfp of ${player.id} not set: ${error?.message ?? error}`));
});
