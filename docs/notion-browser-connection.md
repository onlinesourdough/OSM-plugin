# OSM browser connection: architecture and dependency

Research checkpoint: 7 November 2026; owner-action proposal added 10 November 2026.
This is an implementation proposal and capability assessment, not a deployed
connection or permission grant. Nothing described here is registered, hosted or
running.

The accepted user flow is **Connect Notion → browser login → select pages →
return → selected Data & Context page**. Agent assistance is optional. No key
belongs in chat. OSM must own its connection and share it across Home and tools.

| Route | Authorization / page scope | Fit |
| --- | --- | --- |
| OSM OAuth integration, selected workspaces | Each user authorizes OSM; native Notion page picker | Suitable for a bounded pilot; own registration required |
| OSM public integration, any workspace | Same OAuth page picker, eligible for any workspace | Suitable product route; marketplace listing is optional |
| Internal connection | Static bot token; pages shared through Notion, inherited to children | Existing Mac pilot; cannot itself offer browser OAuth |
| Hosted Notion MCP | OAuth + PKCE, DCR/CIMD; acts with user's Notion permissions | Does not meet the selected-page connection contract merely by filtering tools/pages |
| Personal access token | User-created credential with the user's permissions | Does not meet this human onboarding or least-privilege contract |

## Smallest suitable architecture

Register **OSM's own** OAuth integration in the Notion developer portal. Select
the intended workspaces for the pilot, or “Any workspace” for a public product;
that installation-scope choice cannot later be changed in place. Select only
the capabilities needed by the accepted product. This reader needs read content;
write capabilities and onboarding mutations need separate qualification.

Use an owned HTTPS callback registered verbatim with Notion. The current REST
token endpoint authenticates with HTTP Basic using `client_id:client_secret`.
Its documented request schema does not expose `code_verifier`, and the REST
authorization guide does not document a public-client/PKCE exchange. A loopback
callback alone therefore does not eliminate the confidential-client dependency.
Do not infer that the hosted MCP PKCE mechanism applies to REST OAuth.

A small confidential auth service keeps the client secret, validates single-use
state, exchanges the code and, only if the owner approves its custody, handles
token refresh and revocation. Bind each auth attempt to a short-lived local device
verifier and return only an opaque, single-use completion receipt through the
browser. The local OSM process redeems the receipt over HTTPS and stages the
returned access token in memory. Before anything is committed it verifies, with
the staged token alone, the bot, workspace, selected root and current context;
only a verified token may replace the stored credential, and OSM reports ready
only after that. Never put access tokens in browser return URLs or ship the client
secret in the plugin. Token custody, refresh ownership and disconnect semantics
require review before implementing that broker; this document does not provision it.

Cancellation, closed browser, expired attempt, wrong state, denied access,
token-exchange failure, a changed workspace and a failed verification keep the
previous connection intact, because nothing is committed before verification.
Return to the connection dialog with an honest retry/cancel action. Reopening the
app must not silently re-register or orphan a connection.

## Precise outstanding dependency

No OSM OAuth client ID, registered owned HTTPS callback, client-secret store,
auth-service deployment or approved token custody exists in this repository. The
owner's existing internal connection is a static workspace bot; it is not an OAuth
client, and its recorded identifier is never assumed to be one. A separate portal
registration may exist elsewhere; none has been inventoried. That is the dependency
for real browser completion. The current Connect Notion dialog gives human guidance,
cancellation and a real check of the manual Mac route
([Keychain route](home-connection.md#host-credential-route-macos-keychain)); it
cannot complete OAuth and has no Connect action that pretends to. Do not replace this
gap by logging into the separate official Notion plugin or accepting user-wide MCP
access.

Universal page access management uses the page menu in Notion. The centralized
“Manage page access” UI is Enterprise-only. A checked root is not a full grant
inventory; search is eventually consistent and cannot enumerate all access.
404 can mean nonexistent or unshared, so the UI says inaccessible. After native
grant changes, refresh and re-read the selected page/source through OSM.

The current public REST OpenAPI has 49 paths (inspected read-only); its search
and token operations do not include a page-level grant/revoke endpoint. Token
revocation and Enterprise admin user/MCP/agent permission APIs are separate
capabilities, not substitutes for page sharing in this personal connection.

## Owner-action and deployment proposal

For review. It reuses the owner's existing selection of the Data & Context home and
internal connection; it asks for no second selection and creates nothing.

### Decisions that only the owner or operator can make

| # | Decision | Why it is external |
| --- | --- | --- |
| 1 | Reuse an existing OSM OAuth registration if one exists, or authorize creating one; choose workspace-limited (a pilot for the owner's own workspace) or public installation | Notion does not allow changing installation scope in place; registration is a developer-portal account action |
| 2 | Approve one exact HTTPS callback origin and path, and the existing hosting account that serves it | DNS control, routing and any cost belong to the operator. Candidate for review only, not verified as owned or routable: `https://auth.onlinesourdough.com/osm/notion/callback` |
| 3 | Approve client-secret and token custody, including whether any refresh credential may transit or persist server-side, its retention, deletion, tenant isolation and incident recovery | The server must hold the client secret; the boundary is a security decision, and no credential is sent through chat for approval |

### Proposed shape

- **Registration.** An OSM-owned OAuth integration with the Read content capability
  only. Write capabilities need their own qualification.
- **Broker.** One small confidential service on the approved existing hosting. It
  holds the client secret in the approved secret store, never in the plugin, frontend,
  source or logs. It keeps only encrypted, short-lived completion state.
- **Attempt.** The local OSM process creates a random device verifier, keeps it in
  memory and sends the broker only its SHA-256 challenge over HTTPS. The broker returns
  an attempt ID and the authorization URL it built (client ID, registered redirect
  and a single-use `state`). OSM opens it in the user's browser.
- **Authorization.** The user signs in at Notion and picks pages with Notion's native
  picker. Notion redirects to the registered callback with `code` and `state`.
- **Exchange.** The broker validates that `state` is known, unexpired and unused,
  exchanges the code using HTTP Basic client authentication, and checks that the
  response names a bot and workspace. It stores the result bound to the challenge for
  at most a few minutes and shows only "Return to Codex". Nothing secret is in a URL.
- **Redemption.** The initiating device sends the attempt ID and verifier. The broker
  compares the hash, returns the access token once and deletes it. A replay, wrong
  verifier or expired attempt returns nothing. Any refresh credential is not part of
  this response unless decision 3 approves it.
- **Stage, verify, then commit.** The redeemed access token is held in the local
  process's memory and is not written anywhere first. With that token alone OSM reads
  its own identity and the bootstrap read of the selected root for the current context,
  and compares them with the saved projection's bot, workspace and root. A different
  account, an unreadable root or a changed context is refused and nothing is written.
  Only a verified token is committed: one replacement of the Keychain item's value and,
  if the owner approves a changed account or root, the existing revision-checked
  projection save. These are two operations, not one transaction. If the process stops
  between them, the old projection meets the new credential and the existing
  account-change check refuses every read (`account_changed`). Overwriting the item
  first and verifying afterwards would not preserve the previous connection and is
  not proposed.
- **What the reader accepts today.** `hostCredential` reads one raw token string from
  the item: whitespace-free, at most 4,096 characters. It can consume an OAuth access
  token as that string. It cannot read an access-plus-refresh pair, JSON or any other
  schema. Storing a refresh credential, a structured value, an expiry or a second item
  would need reviewed changes to the store, its schema and the reader, and server-side
  persistence of a refresh credential would need decision 3's approval. None of this is
  implemented or assumed here: there is no OAuth code, secret migration or new
  credential provider, and OSM has no Keychain writer at all today, since the owner
  provisions the manual item. A writer, if approved, is new reviewed code. The existing
  identity, bootstrap, mapping and account-change checks would apply unchanged to the
  access token.
- **Refresh and revoke.** Whether the access token expires, and whether refresh is
  available, is defined by Notion's token documentation at implementation time. Refresh
  needs the client secret, so the broker would have to perform it, which means retaining
  a refresh credential server-side or in a new device store: exactly decision 3, and not
  assumed. Disconnect would remove the local item and ask the broker to revoke; the user
  can also remove OSM in Notion's Connections list. A revoked or expired token reads as
  `not_connected` with a Reconnect action, which repeats the staged flow.
- **Failures keep the previous connection.** Cancellation, a closed browser, an
  expired attempt, a wrong state, denied access, a failed exchange, a different
  workspace or account, an unreadable root and a changed context each leave the
  existing credential and projection untouched, because nothing is committed before
  verification. The dialog returns to a plain retry or cancel. Reopening OSM never
  silently registers again or orphans a connection.

### Safe now, and what waits for deployment

| Work | Needs external authority? |
| --- | --- |
| Local Keychain reader, identity check, bootstrap read, route setting, distinct states | No; implemented here for the manual route |
| Attempt, redemption, staged verification and failure handling in the local process, tested against a synthetic broker | No, but not built here: a Connect button that cannot complete would be misleading |
| A Keychain writer and any refresh or structured-credential storage (store, schema and reader changes) | Review under decision 3; not implemented and not assumed |
| Registering the integration, choosing installation scope | Yes: decision 1 |
| Callback hosting, DNS, deploying the broker, the client-secret store | Yes: decisions 2 and 3 |
| Real authorization, cancellation, expiry, account change, refresh and disconnect through the deployed route | Yes: only these can qualify browser login |

Until those run for real, browser sign-in is not ready, and the manual route stays the
only first-use path. The manual route is a pilot, not the default for a browser product
or for ChatGPT.

## Primary sources

- [OAuth integrations](https://developers.notion.com/guides/connections-and-tokens/oauth-integrations/overview)
  and [public integrations](https://developers.notion.com/guides/connections-and-tokens/public-integrations/overview)
  describe installation scope and per-user page selection.
- [REST authorization](https://developers.notion.com/guides/authorization/overview)
  and [Create a token](https://developers.notion.com/reference/create-a-token)
  specify the callback and confidential token exchange.
- [Hosted MCP client guide](https://developers.notion.com/guides/mcp/build-mcp-client)
  documents PKCE, registration and token lifecycle; [Notion MCP help](https://www.notion.com/help/notion-mcp)
  explains the user's permission model.
- [Connection management](https://www.notion.com/help/add-and-manage-connections-with-the-api)
  distinguishes universal page menus and Enterprise access management.
- [Search limitations](https://developers.notion.com/reference/search-optimizations-and-limitations)
  explicitly rejects a complete access-inventory claim.
- [Public REST OpenAPI](https://developers.notion.com/openapi.json) owns its
  current operation surface; the candidate implements no sharing mutation.
