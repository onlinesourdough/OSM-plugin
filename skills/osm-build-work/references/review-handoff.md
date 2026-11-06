# Help a person review the result

Build owns the human-facing handoff for substantive work. Review verifies its
claims; Ship keeps the same handoff aligned with the delivered result. Reuse
the existing PR, document or task instead of creating a parallel report. Match
the reader and the size of the change: a small correction can be one paragraph.

Open with the concrete problem and resulting change. Show the difference using
one useful example, then identify the few places needing attention and any
material tradeoff or decision. Summarize observed checks and remaining limits;
link the detailed evidence. Keep long logs, transcripts and review reports out
of the main explanation, using links or collapsed sections. A failure that
changes the decision stays visible. Avoid a chronology of the agent's work.
Return the handoff itself, without narrating compliance with this method. Combine
problem, example and checks in a short paragraph when sufficient; do not add a
separate heading for every fact or repeat the same limitation in several places.

Choose the format for what the reviewer needs to understand about this change;
there is no visual slot to fill. For a difficult explanation, use
[Clarify](../../osm-clarify/SKILL.md) to choose the concrete example and relationship;
it owns explanatory judgment. Plain text can be sufficient.
For visible changes, real captures
or an action/result sequence can help. For a visible UI change, compare a real
baseline and candidate capture of the same state, viewport and data.
For behavior, use a small observed input/output pair or measured result.
For instructions, documents or architecture, exact excerpts or a labelled
explanatory diagram may be more useful than a screenshot. These are explanations
unless actual behavior was exercised; do not claim a measured improvement from
a diagram, a rewritten prompt or an untested example.

A diagram should explain a concrete mechanism, boundary, decision or tradeoff.
Phase names alone rarely explain the change unless their relationships changed.
Check what understanding the reader gains; omit a visual that merely repeats
the prose. These are choices, not mandatory screenshots, tables or diagrams.

Identify the source revision/artifact and relevant comparison conditions. State
an unavailable baseline or check rather than manufacture evidence. Preserve
private data and other work while capturing; use existing tools and authorized
destinations. No new capture dependency, public upload service or Agentic Systems
installation is implied. Evidence complements the existing domain checks and
acceptance procedure; it adds no new review or owner-approval gate.

Inspect the rendered handoff before sending it: a person without the chat history
should understand the change, media should be readable, and evidence links should
work for the intended audience. After a relevant change, update the title,
comparison, checks and pending decision in place. Identify historical evidence
as historical instead of silently carrying it to the new result. Respect
existing delivery delegation; present a decision only when one is actually open.

The comparison and observed-proof approach was informed by
[before-and-after](https://github.com/michaelshimeles/skills/blob/4b72f46b045e6fef52e6a98d4c162dd309826aed/before-and-after/SKILL.md)
and [evidence-driven-testing](https://github.com/michaelshimeles/skills/blob/4b72f46b045e6fef52e6a98d4c162dd309826aed/evidence-driven-testing/SKILL.md).
These are research references, not bundled software or required services.
