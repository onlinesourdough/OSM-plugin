---
name: osm-interview
description: Interview to explore context, restate goals and the underlying problem, or find direction when requested or materially unclear at the start; clear work and isolated questions continue directly.
metadata:
  version: "2.0.0"
---

# OSM:interview

Help the user think through a situation while giving the assistant the context
needed for a useful next action. Use this for setup, a new agent or automation,
a project, a specialist solution, or an existing approach the user wants to
reconsider. Understanding or a decision can be the whole requested result.

## Select the conversation

- Start when the user asks for an interview, exploratory sparring, a restatement
  of their goals/problem or help finding direction. Reuse their subject and depth.
- At the start of work, the model may select a short interview when unresolved
  purpose, responsibility or success criteria would materially change the
  direction and cannot be resolved from accepted inputs or authorized sources.
  State the focus briefly and begin; do not add a routine permission question.
- A new project, agent, automation or plugin installation alone is not a
  trigger. Clear work proceeds through its existing method. During execution,
  ask the smallest blocking question; do not silently switch to an interview.
- If broader reflection would help but is unnecessary for the current result,
  offer it once at a natural pause without holding up independent work. Start
  that broader conversation only when the user takes it up. Reuse a decline.

Read the relevant existing context before asking. Independent repository work
starts with local instructions and accepted inputs; this method neither loads
personal context by default nor creates an owner home, repository or agent.
For owner-level first setup, use the conditional
[owner-context guide](references/owner-context.md). Setup retains installation,
access, source verification and continuity; Interview owns the conversation.

## Follow what changes the decision

For thinking aloud or a goal/problem restatement, first explain in your own
words what the user wants to change, the underlying difficulty and what a useful
result would accomplish. Keep it a short natural paragraph in their language;
distinguish the desired outcome from their suggested remedy and label any
material inference. Compress the meaning rather than retelling the transcript.
Use the available voice/text conversation; no recording service, minimum speaking
time or separate document is needed.

Identify the most consequential gap. A short exchange often needs only one or
two questions, and none when the supplied context already resolves the next
action. This is neither a quota nor a cap; let remaining uncertainty and the
user's chosen depth govern. A correction replaces the mistaken interpretation
and changes the next action where needed.
Ask one material question at a time in the user's language, following the
[conversation procedure](references/conversation.md). Prefer a concrete recent
example over an abstract questionnaire. Let answers change the next question;
do not run a fixed list or ask the user to restate discoverable facts.

Contribute judgment: surface a contradiction, an overlooked option or a costly
assumption, explain its consequence, and distinguish evidence from a hypothesis.
Challenge the proposed remedy when the underlying difficulty is unresolved.
Keep confirmed intent separate from technical inference and open choices.

Use only lenses that affect this work. For an agent or automation, explore the
actual task, inputs, judgment, allowed actions, escalation, failure and evidence
of a useful result. For a project or solution, explore who benefits, the change
they need, constraints, alternatives and the smallest useful validation. These
are prompts for judgment, not required fields or a new approval checklist.

Adapt depth to the uncertainty and the user's engagement. Follow an explicit
skip, stop or change of subject, retaining useful answers. A direction already
accepted is not reopened without new evidence or a user request.

## Return to useful work

Stop when the user ends the interview or there is enough shared understanding
for the agreed next action. Summarize the situation, accepted decisions,
material assumptions or unknowns and next action; resolve only a correction
that would change that action. Do not require a separate approval of the summary
when the answers already establish direction and authority.

Continue the original authorized task with those answers. When substantive
execution needs a contract, pass them to [Spec](../osm-spec-work/SKILL.md);
Spec owns scope and proof, and does not repeat discovery. An interview-only
request ends with the useful understanding, without manufacturing a build task.

Keep project decisions with the project and external facts at their source.
Only relevant durable owner facts use [Manage Data & Context](../osm-manage-data-context/SKILL.md)
under existing authority. Do not save raw transcripts, temporary project plans
or speculative answers as owner memory. A separate document is optional.
