// The Sneaky Produnktions overlay's runtime, loaded ahead of structs-webapp's entry.
//
// __sneaky.guild is the guild this page plays through, Sneaky Produnktions (guild.js),
// __sneaky.recovery moves a recovered player of another guild into it
// (recovery.js), __sneaky.pfp shows players' own pictures (pfp.js) and
// __sneaky.gallery lets a player pick a Sneaky Produnktions NFT as theirs, at sign-up and
// on their profile (gallery.js). sneaky/patches.cjs points webapp's code at them.
// __sneaky.account creates the account at sign-up without showing its recovery
// key, and offers Download Player in place of Log Out (account.js).
import {guild} from './guild.js';
import {recovery} from './recovery.js';
import * as pfp from './pfp.js';
import {gallery} from './gallery.js';
import {account} from './account.js';

globalThis.__sneaky = Object.freeze({guild, recovery, pfp: Object.freeze({...pfp}), gallery, account});
