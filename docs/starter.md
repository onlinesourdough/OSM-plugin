# Start with one useful task

Use this working guide to give your assistant a Notion home for business
knowledge, decisions and methods. Install from the approved edition for your
app and check its [released capabilities](https://github.com/onlinesourdough/OSM-plugin/releases).
The Prime and Log walkthrough describes the working candidate.

## 1. Install and connect

Follow [Install in your app](https://github.com/onlinesourdough/OSM-plugin#install-in-your-app),
then ask your assistant to set up OSM using your chosen Notion page. Reuse an
existing working connection and verify a scoped read in the intended account.
OSM uses Notion for the context home. Your documents, project files and
operational systems keep their originals.

## 2. Map only what the first task needs

Have Setup reuse suitable pages and databases. The Data & Context page has one
definition followed by its native destinations. Use the repository's
[root template](../skills/osm-data-context/assets/data-and-context-root.md)
for the definition itself.

| Place | What belongs there |
| --- | --- |
| Knowledge | A concise explanation of your offers, audience or how work is done |
| Memory | Lasting decisions, corrections and their evidence |
| Skills | Reusable methods you actually use |
| Source agreements | The account, scope, reader, authority and freshness of a selected source |
| Operating policy and checkpoints | The exact route to your write rules and, if selected, the existing run state |

Prefer an existing connector or provider sign-in. If the source needs a key,
use the selected runtime's credential store and
[verify the specific permissions](../skills/osm-setup/references/credentials.md).

## 3. Try one decision across two chats

In this fictional example your current offer is owned by an existing service
page. Start a chat and ask:

> Use our current service page to draft a client reply. Tell me what you found
> there before drafting.

Check the source and the reply. Then give a real, lasting correction or
decision, such as “Please remember that we schedule the first client review
on Tuesdays.” Log saves the decision if your policy allows it. In a fresh
chat, ask what day you schedule the first review and where the answer came
from. Check that the new chat can find the decision and its evidence.

## Keep the setup useful

Prime loads the context a task needs. Log retains useful decisions at
checkpoints and when you ask. Optional Dreaming checks recent work and due
sources between sessions, corrects supported errors and leaves live values in
their source systems.

When resuming or migrating, start from the same Notion home and verify its
current sources. A missing or revoked connection shows up as a specific gap.
The [recovery guide](recovery.md) covers restoring a previously working route.
