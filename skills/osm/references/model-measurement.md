# Measure the complete accepted result

Use for an authorized comparison or a claim about quality, tokens, cost or speed.
Ordinary work does not start a benchmark suite. Reuse available task receipts;
keep measurements with the task's evidence, outside portable owner inventories.

Choose a representative task class, quality bar and sufficient baseline before
seeing candidate results. Keep starting inputs, harness, tools, allowed context
and checks comparable. Record model/version, requested and confirmed effort,
date, repetitions, concurrency, time limits, failures and retries. Small samples
screen candidates; they do not establish equivalence across general work. State
where synthetic inputs, missing controls or changed versions limit the result.

Acceptance needs the task's real correctness checks and relevant review quality.
A weighted benchmark score is not the fraction of fully solved tasks. Public
rankings can propose a candidate without proving performance in this workflow.
Inspect raw evidence when available; withheld patches or judge receipts limit
independent reproduction. Keep review judgment separate from deterministic proof.

Read native usage semantics before adding fields. Input may already include
cached reads and output may already include reasoning; do not double-count
subsets. Preserve missing fields as unknown, not zero. Track exposed input,
output, reasoning, cache, elapsed time and retries separately. Summed task time
differs from end-to-end elapsed time under concurrency. Tokenizers differ across
providers; raw tokens, billed amounts, API-equivalent estimates and subscription
quota are different measures.

For a complete workflow, include selection/Spec, repeated context, Build, tools,
Review and repair. Total tokens per accepted result is all measured tokens,
including unsuccessful attempts, divided by accepted results; it is undefined
when none is accepted. Label partial coverage, such as solver-only tokens with
post-hoc judging excluded. Do not silently allocate an unmeasured review cost
or claim that a cheaper solver makes the whole workflow cheaper.

Inspect paired tasks and repeat important close or inconsistent cases when the
authorized budget permits. Report observed savings alongside acceptance and
quality differences. A route change is useful only when its expected saving
outweighs transfer, selection, review and retry overhead at the required quality.
Keep a sufficient existing route when that advantage is unsupported; do not
automatically persist a new default from one success.
