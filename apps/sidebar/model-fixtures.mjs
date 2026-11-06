// Invented, connector-shaped AI Operating Model texts for tests and the
// preview fixture. They follow the shape of an official Notion fetch response
// (page header, properties and enhanced-Markdown content); they are not
// sanitized captures of a real connector and use invented page identities.
const page = n => `https://app.notion.com/p/${String(n).padStart(32, '0')}`;
export const modelTarget = page(10);

// Two source groups, a policy list, evidence and pricing links in prose, a code
// block and a quotation. Only the two reference lists become groups.
export const ownerModel = `Here is the result of "view" for the Page with URL ${modelTarget} as of 2026-10-19T09:00:00.000Z:
<page url="${modelTarget}">
<properties>
{"title":"AI Operating Model"}
</properties>
<content>
Read this model once per session for owner-context work. See the [privacy policy](${page(20)}) before sharing anything.
## Context sources {toggle="true"}
\t- <mention-page url="${page(11)}">Soul</mention-page> — collaboration preferences
\t- <mention-page url="${page(12)}">About</mention-page>
\t- <mention-database url="${page(13)}">Memory</mention-database>: facts, decisions &amp; lessons
\t- [Skills](${page(14)})
## Rules
- Never copy live task status into Memory; read [Tasks](${page(21)}) instead.
- Keep private records private.
## Work and outputs
<database url="${page(15)}" inline="false">Tasks</database>
- <mention-page url="${page(16)}">Projects</mention-page>
- [Repository](https://github.com/example/project)
## Evidence
The 2026-10-12 review is in [this run](${page(22)}) and the [backup](${page(23)}).
\`\`\`
- [Example in code](${page(24)})
\`\`\`
> - [Quoted link](${page(25)})
## Commercial policy
Offer prices follow [the pricing page](https://example.com/pricing).
</content>
</page>`;

// Different language and headings, optional team sources, no owner names.
export const teamModel = `<page url="${page(30)}">
<content>
# Arbejdsmodel
### Kilder
#### Personlig
- [Hukommelse](${page(31)})
- [Metoder](${page(32)})
#### Team
- [Team hukommelse](${page(33)}): delt
- [Team metoder](${page(34)}) (team)
### Leverancer
1. <mention-page url="${page(35)}">Kunder</mention-page>
</content>
</page>`;

// A model with its own name and headings: role-labelled sources beside notes,
// a role whose page has the same name, one with a different page name, an
// unlabelled link, and one row that does not fit the grammar.
export const variedTarget = page(50);
export const variedModel = `<content>
## Daily work
- **Planner:** <mention-page url="${page(51)}"/> plans the week.
- **Notes:** <mention-page url="${page(52)}">Notes</mention-page>
- Keep this list short.
## Reference
- **Docs:** [Handbook](${page(53)})
- [Archive](${page(54)})
## Team
- **Studio:** <mention-page url="${page(55)}">Studio</mention-page>
- Owner: <mention-page url="${page(56)}"/> approves changes.
</content>`;

// A section that mixes a source with an instruction cannot be resolved alone.
export const mixedModel = `<content>
## Sources
- [Docs](${page(41)})
- Ask before sharing anything.
## Team
- [Team docs](${page(42)})
</content>`;

// The current official Notion fetch shape for role-labelled rows: HTML bold
// labels and generic <mention url> references, paired or self-closed, inside the
// native <page>/<content> wrapper. Sanitized: invented page identities and
// labels only, no owner text. Prose mentions and a user mention stay out.
export const nativeTarget = page(60);
export const nativeModel = `Here is the result of "view" for the Page with URL ${nativeTarget} as of 2026-10-23T09:00:00.000Z:
<page url="${nativeTarget}">
<properties>
{"title":"AI Operating Model"}
</properties>
<content>
For work that uses my context, read this once per session; see <mention url="${page(70)}">Policy</mention> first.
## Home
- <b>OSM:</b> <mention url="${page(61)}">OSM</mention>
- <b>Memory:</b> <mention url="${page(62)}" />
- <b>Skills</b>: <mention url="${page(63)}">Skills library</mention> — personal and team methods
- <b>Docs:</b> <mention-page url="${page(64)}">Docs</mention-page>
- **Tasks:** [Tasks](${page(65)})
## Rules
- <b>Note:</b> keep private records private; ask <mention url="${page(71)}">Owner notes</mention> first.
- Approver: <mention-user url="${page(72)}">Person</mention-user> reviews changes.
</content>
</page>`;

// The current official Notion fetch writes a standalone child-page reference as
// three lines: the opening tag, the page title, then the closing tag, with no
// list bullet. Sanitized: invented identities and titles only.
export const childPageModel = `${nativeModel.replace('</content>', `## Recovery
<page url="${page(99)}">
Recovery guide
</page>
</content>`)}`;
