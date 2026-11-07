# OSM browser connection: architecture and dependency

Research checkpoint: 7 November 2026. This is an implementation proposal and
capability assessment, not a deployed connection or permission grant.

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
state, exchanges the code, and handles token refresh/revocation. Bind each auth
attempt to a short-lived local device verifier and return only an opaque,
single-use completion receipt through the browser. The local OSM process redeems
the receipt over HTTPS, stores that user's connection in the OS credential store,
and verifies bot/workspace identity and the chosen root before reporting ready.
Never put access tokens in browser return URLs or ship the client secret in the
plugin. Token custody, refresh ownership and disconnect semantics require review
before implementing that broker; this document does not provision it.

Cancellation, closed browser, expired attempt, wrong state, denied access,
token-exchange failure and changed workspace keep the previous connection intact.
Return to the connection dialog with an honest retry/cancel action. Reopening the
app must not silently re-register or orphan a connection.

## Precise outstanding dependency

No OSM OAuth client ID, registered owned HTTPS callback, client-secret store,
auth-service deployment or approved token custody currently exists in this repo.
That is the dependency for real browser completion. The current Connect Notion
dialog provides human guidance, cancellation and a real check of the existing
OSM pilot route; it cannot complete OAuth. Do not replace this gap by logging
into the separate official Notion plugin or accepting user-wide MCP access.

Universal page access management uses the page menu in Notion. The centralized
“Manage page access” UI is Enterprise-only. A checked root is not a full grant
inventory; search is eventually consistent and cannot enumerate all access.
404 can mean nonexistent or unshared, so the UI says inaccessible. After native
grant changes, refresh and re-read the selected page/source through OSM.

The current public REST OpenAPI has 49 paths (inspected read-only); its search
and token operations do not include a page-level grant/revoke endpoint. Token
revocation and Enterprise admin user/MCP/agent permission APIs are separate
capabilities, not substitutes for page sharing in this personal connection.

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
