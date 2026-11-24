// Changes to structs-webapp's sources, as [exact upstream text, replacement]
// pairs per upstream file (sneaky/overlay.cjs applies them).
//
// structs-webapp is served by its guild and reaches the guild API at /api,
// with a session cookie, and GRASS and the chain node on the same host. This
// page (sneaky.structs.zone) hosts none of them: these patches send webapp to
// Sneaky Produnktions' services, as sneaky/runtime/guild.js reads them, with a
// bearer token instead of the cookie. Then come players' own pictures and the
// Sneaky gallery (sneaky/runtime/pfp.js, gallery.js). The rest puts Sneaky Produnktions where
// webapp's sign-up and tutorial name SN Corp.

const GUILD = 'Sneaky Produnktions';
const GUILD_CAPS = 'SNEAKY PRODUNKTIONS';
const TAG = 'SNEAK';
// Under the badge (their pig), where SN Corp has its motto: the guild's description.
const MOTTO = 'THE SNEAKY<br>PRODUNKTIONS<br>STRUCTS GUILD.';

// The nav label of every sign-up and orientation screen.
const navLabel = [["'SN.Corporation'", `'${GUILD}'`]];

// The signup logo: Sneaky Produnktions' badge and motto in SN Corp's 192px slot.
const logo = [
  ['src="/img/logo-snc.gif"', 'src="/sneaky/img/sneaky-produnktions-badge.png"'],
  ['alt="SNC logo"', `alt="${GUILD} logo"`],
  ['>WE KNOW BETTER.</h2>', `>${MOTTO}</h2>`],
];

const guildApi = path => `Object.defineProperty(this, 'apiUrl', {get: () => \`\${__sneaky.guild.api}${path}\`, enumerable: true});`;

module.exports = {
  'js/index.js': [
    // Nothing below may run before the guild, and so its services, is known.
    // The tutorial is a simulation and needs no guild.
    ['const tutorialMode = TutorialMode.isActive();', 'if (!TutorialMode.isActive()) await __sneaky.guild.ready;\nconst tutorialMode = TutorialMode.isActive();'],
    ['`ws://${window.location.hostname}:1443`', '(__sneaky.guild.grass || `ws://${window.location.hostname}:1443`)'],
  ],
  'js/managers/SigningClientManager.js': [
    [': `ws://${window.location.hostname}:26657`)', ': (__sneaky.guild.chainWs || `ws://${window.location.hostname}:26657`))'],
    // Under the current protocol the signing queue only sends a player's own
    // messages built from a gameplay intent; a plain queued message is refused
    // ("Queued intent requires current-protocol preparation"). Upstream moved
    // MsgPlayerUpdateName there but not MsgPlayerUpdatePfp, which the Sneaky
    // gallery signs (sneaky/runtime/pfp.js, gallery.js).
    [
      "const id = this.queue.enqueueImmediate(\n      '/structs.structs.MsgPlayerUpdatePfp',",
      "const id = this.queue.enqueueGameplayImmediate(\n      '/structs.structs.MsgPlayerUpdatePfp',",
    ],
  ],
  'js/util/GameplayIntent.js': [
    // Like the name, a player's own pfp: the native handler, exercised by the
    // signed simulation, checks the signer's authority over the player.
    [
      "  '/structs.structs.MsgPlayerUpdateName': null,\n",
      "  '/structs.structs.MsgPlayerUpdateName': null,\n  '/structs.structs.MsgPlayerUpdatePfp': null,\n",
    ],
  ],
  'js/api/GuildAPI.js': [
    ["this.apiUrl = '/api';", guildApi('')],
    // This page's guild is fixed, never looked up: /guild/this is the
    // API host's own guild, and Sneaky Produnktions shares SN Corp's API.
    ['`${this.apiUrl}/guild/this`', '`${this.apiUrl}/guild/${__sneaky.guild.id}`'],
    // /auth/token takes the same signed login as /auth/login and answers with a bearer token.
    [
      'const jsonResponse = await this.ajax.post(`${this.apiUrl}/auth/login`, loginRequestDTO, {...options, reauthenticate: false});',
      'const jsonResponse = await this.ajax.post(`${this.apiUrl}/auth/token`, loginRequestDTO, {...options, reauthenticate: false});\n'
      + '    __sneaky.guild.setToken(jsonResponse?.success ? jsonResponse.data?.access_token : null);',
    ],
    [
      'const jsonResponse = await this.ajax.post(`${this.apiUrl}/auth/logout`, {}, options);',
      'const jsonResponse = await this.ajax.post(`${this.apiUrl}/auth/logout`, {}, options);\n    __sneaky.guild.setToken(null);',
    ],
  ],
  'js/framework/JsonAjaxer.js': [
    ["headers: {\n        'Content-Type': 'application/json'\n      },", "headers: {\n        'Content-Type': 'application/json',\n        ...__sneaky.guild.headers()\n      },"],
  ],
  'js/managers/AuthManager.js': [
    // Before any guild API call, recovery checks on chain that the player is in
    // this guild, moving them here from another guild, and stops if they are
    // not: a shared guild API may log in another guild's player (recovery.js).
    [
      'import {MenuPage} from "../framework/MenuPage";',
      'import {MenuPage} from "../framework/MenuPage";\nimport {MenuWaitingViewModel} from "../view_models/generic/MenuWaitingViewModel";',
    ],
    [
      'const primaryAddress = this.gameState.signingAccount.address;\n    const guildId = this.gameState.thisGuild.id;',
      'const primaryAddress = this.gameState.signingAccount.address;\n'
      + '    if (!await __sneaky.recovery.ensureInThisGuild(this, primaryAddress, signal, MenuWaitingViewModel.setMessage)) return false;\n'
      + '    const guildId = this.gameState.thisGuild.id;',
    ],
  ],
  'js/telemetry/OnboardingTelemetry.js': [
    // Onboarding and tutorial runs are reported under this interface's own
    // name. Guilds take a slug here (RegexPattern::SLUG), which allows the dots.
    ["ONBOARDING_INTERFACE_NAME = 'structs-webapp'", "ONBOARDING_INTERFACE_NAME = 'sneaky.structs.zone'"],
    ['fetch(ENDPOINT, {', 'fetch(`${__sneaky.guild.api}/onboarding/events`, {'],
    ['navigator.sendBeacon(ENDPOINT, body)', 'navigator.sendBeacon(`${__sneaky.guild.api}/onboarding/events`, body)'],
  ],
  // Like GuildAPI's: these APIs live on the guild, not on this page's host.
  'js/api/InfluenceAPI.js': [
    ["this.apiUrl = '/api/influence';", guildApi('/influence')],
  ],
  // Read by the public Sector Blitz leaderboard (/sector-blitz), which waits here
  // for the guild, and by spectating a raid (/?spectate=<planet>).
  'js/api/PublicSectorBlitzAPI.js': [
    ["this.apiUrl = '/api/public/sector-blitz';", guildApi('/public/sector-blitz')],
    ['    const response = await fetch(', '    await __sneaky.guild.ready;\n    const response = await fetch('],
  ],

  // Players' own pictures (sneaky/runtime/pfp.js): every portrait shows a
  // player's pfp URL, over webapp's generated layers, which remain the
  // fallback. The URL rides in the render attributes, which every portrait
  // already receives.
  'js/models/PfpClientRenderAttributes.js': [
    ['    return new PfpClientRenderAttributes(\n      obj.head ?? null,', '    return __sneaky.pfp.keepUrl(obj, new PfpClientRenderAttributes(\n      obj.head ?? null,'],
    ['      obj.background ?? null\n    );', '      obj.background ?? null\n    ));'],
  ],
  'js/factories/PlayerFactory.js': [
    ['player.pfp_client_render_attributes = PfpClientRenderAttributes.fromJson(player.pfp_client_render_attributes);',
      'player.pfp_client_render_attributes = __sneaky.pfp.attributes(player.pfp, PfpClientRenderAttributes.fromJson(player.pfp_client_render_attributes));'],
  ],
  'js/factories/PlayerSearchResultDTOFactory.js': [
    ['player.pfp_client_render_attributes = PfpClientRenderAttributes.fromJson(player.pfp_client_render_attributes);',
      'player.pfp_client_render_attributes = __sneaky.pfp.attributes(player.pfp, PfpClientRenderAttributes.fromJson(player.pfp_client_render_attributes));'],
  ],
  'js/view_models/login/ActivateDeviceVerifyViewModel.js': [
    ['PfpClientRenderAttributes.fromJson(this.activationCodeInfo.pfp_client_render_attributes)',
      '__sneaky.pfp.attributes(this.activationCodeInfo.pfp, PfpClientRenderAttributes.fromJson(this.activationCodeInfo.pfp_client_render_attributes))'],
  ],
  'js/view_models/components/PfpViewerComponent.js': [
    ['  renderHTML() {\n    if (!this.pfp) {', '  renderHTML() {\n    return __sneaky.pfp.html(this.pfp, this.renderLayersHTML());\n  }\n\n  renderLayersHTML() {\n    if (!this.pfp) {'],
  ],
  // The Sneaky gallery (sneaky/runtime/gallery.js): "Choose Sneaky" at sign-up,
  // beside the generated picture, and the edit button on the player's own
  // portrait in their profile.
  // No recovery key section in sign-up (runtime/account.js): once the player
  // has chosen their name the key is made and the account created, with
  // nothing shown, explained or confirmed, and sign-up goes on to Success.
  'js/controllers/AuthController.js': [
    [
      '  signupRecoveryKeyIntro() {\n    const viewModel = new RecoveryKeyIntroViewModel();\n    viewModel.render();\n  }',
      '  signupRecoveryKeyIntro() {\n    __sneaky.account.createAccount(this, MenuPage);\n  }',
    ],
  ],
  'js/view_models/signup/SignupSuccessViewModel.js': [
    ['<div>Your account has been created. Keep your Recovery Key safe; you will need it if you lose access to your account.</div>',
      '<div>Your account has been created.</div>'],
  ],
  // The Account page: Download Player (a file holding the mnemonic) in place
  // of Log Out.
  'js/view_models/account/AccountIndexViewModel.js': [
    ['<button id="${this.logoutBtnId}" class="sui-screen-btn sui-mod-destructive">Log Out</button>',
      '${__sneaky.account.downloadButtonHTML(this)}'],
    [
      "    document.getElementById(this.logoutBtnId).addEventListener('click', () => {\n      MenuPage.router.goto('Account', 'logoutConfirm');\n    });\n",
      "    __sneaky.account.bindDownload(this);\n",
    ],
  ],
  'js/view_models/signup/SetUsernameViewModel.js': [
    ...navLabel,
    ['    this.initPfp();\n', '    this.initPfp();\n    __sneaky.gallery.mount(this, MenuPage);\n'],
    ['    regeneratePfpBtn.disabled = true;\n', '    regeneratePfpBtn.disabled = true;\n    __sneaky.gallery.lock();\n'],
  ],
  'js/view_models/account/AccountProfileViewModel.js': [
    ['<div class="profile-header-image">${pfpViewer.renderHTML()}</div>', '<div class="profile-header-image">${pfpViewer.renderHTML()}</div>${__sneaky.gallery.profileButtonHTML(this)}'],
    ['  initPageCode() {\n    if (this.isOwnProfile) {\n', '  initPageCode() {\n    if (this.isOwnProfile) {\n      __sneaky.gallery.mountProfile(this, MenuPage);\n'],
  ],

  // Sneaky Produnktions in place of SN Corp.
  'templates/game/index.html.twig': [
    ['{% block title %}Structs{% endblock %}', `{% block title %}${GUILD} | Structs{% endblock %}`],
  ],
  'js/tutorial/TutorialCopy.js': [
    ['`SN.CORP certifies that you now meet', `\`${GUILD_CAPS} certifies that you now meet`],
  ],
  'js/tutorial/TutorialWorld.js': [
    ["name: 'SN.Corporation',", `name: '${GUILD}',`],
    ["tag: 'SNC',", `tag: '${TAG}',`],
  ],
  'js/view_models/tutorial/TutorialStatusViewModel.js': [
    ["'Computer connecting to SN.C'", `'Computer connecting to ${GUILD}'`],
  ],
  'js/view_models/login/LoggingInViewModel.js': [
    ['alt="Computer connecting to SN.C"', `alt="Computer connecting to ${GUILD}"`],
  ],
  'js/view_models/signup/ConnectingToCorp2ViewModel.js': [...navLabel, ...logo],
  'js/view_models/signup/Orientation1ViewModel.js': [
    ...navLabel,
    ['>SN.CORPORATION</span>', `>${GUILD_CAPS}</span>`],
  ],
  'js/view_models/signup/Orientation2ViewModel.js': [
    ...navLabel,
    ...logo,
    ['`You have been contracted by SN.CORPORATION, a member of the', `\`You have been contracted by ${GUILD_CAPS}, a member of the`],
  ],
  'js/view_models/signup/Orientation3ViewModel.js': navLabel,
  'js/view_models/signup/Orientation4ViewModel.js': [
    ...navLabel,
    ['data-sui-tooltip="SN.CORP accepts no responsibility', `data-sui-tooltip="${GUILD_CAPS} accepts no responsibility`],
  ],
  'js/view_models/signup/Orientation5ViewModel.js': navLabel,
  'js/view_models/signup/Orientation7ViewModel.js': [
    ...navLabel,
    ['harvest Alpha Matter on behalf of SN.CORPORATION.`', `harvest Alpha Matter on behalf of ${GUILD_CAPS}.\``],
  ],
  'js/view_models/signup/Orientation8ViewModel.js': navLabel,
  'js/view_models/signup/OrientationEndViewModel.js': [
    ...navLabel,
    ['frontier regions, SN.CORP recommends', `frontier regions, ${GUILD_CAPS} recommends`],
  ],
  'js/view_models/signup/IncomingCall3ViewModel.js': [
    ['`<strong>SN.CORP:</strong> Greetings, SN.CORPORATION employee.', `\`<strong>${GUILD_CAPS}:</strong> Greetings, ${GUILD_CAPS} employee.`],
  ],
  'js/view_models/templates/OrientationStructDeployedTemplate.js': navLabel,
  'js/view_models/templates/HRBotTalkingTemplate.js': navLabel,
};
