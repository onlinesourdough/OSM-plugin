# Astra instruction alignment — 0.7.0

Accepted sources: OpenAI’s [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra),
read 2026-09-12, and [issue #8](https://github.com/onlinesourdough/AIOS-Plugin/issues/8).
The owner explicitly selected human-writing as a built-in AIOS default. This
supersedes the initial proposal to put it in optional Global Skills.
Source baseline: `dccfff1ecb675eb581f90e684b2acf297e1a2407`.

## Result and boundaries

All 17 skills have concise task-specific discovery and independent quoted
`metadata.version: "1.0.0"` baselines. Package version `0.7.0` remains separate.
The shared lifecycle carries user decisions and authorization across phases,
updates one plan at material progress points, and continues through relevant
checks, fixes and Review. Spec reuses the accepted contract and records only
material unresolved fields. Model selection reuses available runtime evidence.
Skill management distinguishes a named local edit from acquiring a new source.

Human-writing is included for substantive prose drafting and revision. It
preserves meaning, facts, uncertainty, quotes and the user’s language/voice;
it adds no new approval gate and no writing pass for unrelated code. Contextual
Review links to the same shipped method, without a second payload.

The requested inspiration was Factory-AI’s [human-writing at 8aea382](https://github.com/Factory-AI/factory-plugins/blob/8aea3821b5a6ccd0db24299232e7d5a7281ccf50/plugins/droid-evolved/skills/human-writing/SKILL.md).
The upstream root license was unavailable from the license endpoint at that
revision. The AIOS skill is original prose; no upstream text, examples or
payload were copied, and it makes no authorship-detection promise.

Native goal invocation rules, owner format, source/account identity, backup,
atomic seed transfer, independent acceptance when required, and destination
publication authority remain. Existing source-owned model choices are unchanged.
The footprint ceiling and package isolation checks remain in force. Source
checks validate declarations; actual instruction decisions need native evidence.

## Verification

- The maintained package validator passes all 17 skill schemas, inventory,
  links, isolated packaging, source boundaries and negative controls, including
  version progression against the baseline.
- Seven version-rehearsal test methods pass, covering malformed metadata,
  initialization, independent body/resource bumps, regressions and SemVer order.
- Layout and continuity rehearsals pass with disposable Git fixtures. Their
  operational contracts were preserved.
- All 17 skills pass Skill Creator’s YAML/frontmatter validator. Its PyYAML
  dependency was installed only in the task’s disposable validation environment.
- All existing selected-read and 8 KiB skill-body ceilings pass. Name/description
  startup text is 3,112 bytes versus 4,192 at the input revision. These are source
  bytes, not measured token, cost, latency or future behavior savings.
- A matched native Astra Build probe used the same synthetic pagination contract
  with baseline and candidate local methods. Both completed implementation,
  checks, fixes and final inspection without asking the absent user. The baseline
  passed six tests and the candidate seven. Neither created a goal, invoked
  publishing, or read the owner home. This is a bounded continuity observation,
  not evidence of universal performance superiority.
- A native Astra writing probe selected human-writing and returned natural Danish
  prose while preserving the supplied count, month, quote, command and uncertainty.
  That probe used identical skill bytes before relocation into this package.

Independent source Review binds acceptance to final bytes. Delivery, native
installation and fresh-session discovery are verified separately after acceptance;
a source version is not a public release claim. Recovery uses the prior reviewed
commit and supported native registration controls, preserving owner data and
existing local UI preferences.
