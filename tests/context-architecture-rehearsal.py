#!/usr/bin/env python3
"""Offline rehearsal of the OSM Context Architecture against fictional fixtures.

Every case has one positive fixture that must pass, optional valid variants of
that positive that must also pass (counted separately), and at least one
negative fixture that must be rejected for its stated reason. Each result is
printed as it is evaluated. This is fixture-level proof only: it does not exercise real
permissions, inheritance, outside denial, host isolation, instruction loading,
adapters, Home behaviour or timed runs.
"""
import copy
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests/fixtures/context-architecture"
REFERENCES = ROOT / "skills/osm-context/references"
CHECKS = {}


def check(name):
    def register(function):
        CHECKS[name] = function
        return function
    return register


def merge(base, override):
    result = copy.deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    return result


def resolve(data, workspaces):
    if "workspace" in data:
        return merge(workspaces[data["workspace"]], data.get("override", {}))
    return data


def each_workspace(data, workspaces):
    return [resolve(item, workspaces) for item in data["workspaces"]]


def slug(heading):
    text = re.sub(r"[^\w\s-]", "", heading.strip().lower())
    return re.sub(r"\s+", "-", text)


def version(text):
    return tuple(int(part) for part in text.split("."))


ROLES = ("profile", "knowledge", "memory", "methods", "operational", "control")
EXCERPT_FIELDS = ("source_id", "target_id", "authority", "provenance", "revision", "source_date",
                  "meaning", "uncertainty", "coverage", "refresh_state")
EMPTY_DISPLAY = (None, "", "empty", 0, "0", "none")


@check("storage-roles")
def storage_roles(data, ws):
    reasons = []
    for w in each_workspace(data, ws):
        if any(not w["roles"].get(role) for role in ROLES):
            reasons.append("missing-role")
        active = sum(1 for d in w["definitions"] if d["active"])
        if active != 1:
            reasons.append("competing-definition" if active > 1 else "missing-definition")
        if w["layout"] == "new-blank-root" and not w.get("reused_stores"):
            reasons.append("no-reuse")
        if w.get("scoped_destination", {}).get("widened_databases"):
            reasons.append("widened-database")
    return reasons


@check("human-originals")
def human_originals(data, ws):
    reasons = []
    for w in each_workspace(data, ws):
        ids = {o["id"] for o in w["human_originals"]}
        if any(o["before_sha"] != o["after_sha"] for o in w["human_originals"]):
            reasons.append("original-changed")
        for write in w.get("planned_writes", []):
            if write["target"] in ids:
                reasons.append("write-to-human-original")
    return reasons


@check("excerpt")
def excerpt(data, ws):
    reasons = []
    for w in each_workspace(data, ws):
        item = w["excerpt"]
        if any(not item.get(field) for field in EXCERPT_FIELDS):
            reasons.append("excerpt-incomplete")
        route = item.get("route", {})
        if not (route.get("read_only") and route.get("qualified")):
            reasons.append("excerpt-route-unqualified")
    return reasons


@check("relocation")
def relocation(data, ws):
    reasons, before, after = [], data["before"], data["after"]
    for field, reason in (("id", "identity-changed"), ("created", "creation-changed"),
                          ("content", "content-changed"), ("properties", "property-changed"),
                          ("relations", "relation-changed"), ("children", "children-changed"),
                          ("evidence", "evidence-changed"), ("dates", "evidence-changed")):
        if before.get(field) != after.get(field):
            reasons.append(reason)
    if not data["staged_first"]:
        reasons.append("not-staged")
    if set(data["affected"]) - set(data["readback"]):
        reasons.append("readback-incomplete")
    if data.get("mismatch") and data.get("continued_after_mismatch"):
        reasons.append("mismatch-not-stopped")
    if data.get("outside_root_writes"):
        reasons.append("outside-root-write")
    return reasons


@check("protected-write")
def protected_write(data, ws):
    reasons = []
    for w in each_workspace(data, ws):
        protected = {p["id"] for p in w["protected"]}
        for write in w.get("planned_writes", []):
            if write["mode"] == "routine" and write["target"] in protected:
                reasons.append("protected-write")
    return reasons


@check("migration-links")
def migration_links(data, ws):
    reasons = []
    for w in each_workspace(data, ws):
        m, root = w["migration"], w["root"]["id"]
        for link in m["old_links"]:
            if link.get("resolves_to") not in (m["old_entry"], root):
                reasons.append("broken-old-link")
        if m["old_entry_state"] != "maintenance-container":
            reasons.append("old-entry-not-container")
        if m.get("notice_points_to") != root:
            reasons.append("missing-notice")
        if m.get("automatic_adoption"):
            reasons.append("automatic-adoption")
        if sum(1 for d in w["definitions"] if d["active"]) != 1:
            reasons.append("competing-definition")
    return reasons


@check("retrieval")
def retrieval(data, ws):
    steps, expected = data["steps"], data["expected"]
    reasons, kinds = [], [step["kind"] for step in steps]
    bodies = [index for index, step in enumerate(steps) if step["kind"] == "body"]
    if len(bodies) > 3:
        reasons.append("too-many-bodies")
    if any(not steps[index].get("id") for index in bodies):
        reasons.append("body-without-id")
    if data.get("preload") or "library-bodies" in kinds:
        reasons.append("whole-preload")
    if "body" in kinds and ("metadata" not in kinds or kinds.index("metadata") > kinds.index("body")):
        reasons.append("body-before-metadata")
    if not kinds or kinds[0] != "entry":
        reasons.append("not-from-entry")
    if data["found"] != expected:
        reasons.append("not-found")
    # The retained result is a body this path read, selected by an earlier metadata step.
    read = next((index for index in bodies if steps[index].get("id") == expected), None)
    if read is None:
        reasons.append("result-not-read")
    elif not any(step["kind"] == "metadata" and step.get("selected") == expected for step in steps[:read]):
        reasons.append("result-not-selected")
    return reasons


@check("replay")
def replay(data, ws):
    return ["duplicate-on-replay"] if data["replay_creates"] else []


@check("readiness")
def readiness(data, ws):
    reasons, states = [], data["states"]
    if data["reported"].get("timed") == "verified" and not states["timed"].get("observed_run"):
        reasons.append("merged-states")
    if data["unchanged_run_writes"]:
        reasons.append("unchanged-run-wrote")
    for source, state in data["actual"].items():
        if state in ("unknown", "blocked", "deferred") and data["displayed"].get(source) in EMPTY_DISPLAY:
            reasons.append("state-shown-as-empty")
    return reasons


@check("finance-total")
def finance_total(data, ws):
    reasons = []
    if data["claim"] == "total":
        if data["rows_used"] < data["rows_in_scope"] or data["selected_by"] != "complete-scope":
            reasons.append("selected-row-sum")
        if not data["coverage_complete"]:
            reasons.append("incomplete-total")
    if data.get("missing_as_zero"):
        reasons.append("missing-as-zero")
    if not data.get("basis"):
        reasons.append("no-basis")
    return reasons


@check("ambiguous-value")
def ambiguous_value(data, ws):
    return [] if data["state"] == "pending" or data.get("rule") else ["guessed-resolution"]


@check("unmapped-status")
def unmapped_status(data, ws):
    reasons = []
    if data["original"] not in data["mapping"] and (data["state"] != "pending" or data.get("mapped_to")):
        reasons.append("coerced-status")
    if not data["original_kept"]:
        reasons.append("original-lost")
    return reasons


@check("proposal-decision")
def proposal_decision(data, ws):
    reasons = []
    for item in data["items"]:
        if item["source_kind"] == "proposal" and item["recorded_as"] == "decision":
            reasons.append("proposal-as-decision")
        if item["recorded_as"] == "decision" and not all(item.get(k) for k in ("evidence", "attribution", "uncertainty")):
            reasons.append("decision-without-evidence")
    return reasons


@check("corroboration")
def corroboration(data, ws):
    reasons = []
    if data["created"]:
        reasons.append("second-record")
    if not data["new_evidence"]:
        reasons.append("evidence-not-added")
    return reasons


@check("owner-correction")
def owner_correction(data, ws):
    return ["correction-overwritten"] if data["current_value"] != data["owner_correction"] else []


@check("financial-scope")
def financial_scope(data, ws):
    reasons = []
    if not data["complete"] and data["result"] == "total":
        reasons.append("complete-looking-total")
    if data["result"] == "partial" and not data["coverage_stated"]:
        reasons.append("coverage-unstated")
    return reasons


@check("unread-media")
def unread_media(data, ws):
    reasons, unread = [], [item for item in data["items"] if not item["read"]]
    if any(item["state"] in EMPTY_DISPLAY or item["state"] == "done" for item in unread):
        reasons.append("unread-as-empty")
    if unread and data["checkpoint_advanced"]:
        reasons.append("checkpoint-past-unread")
    return reasons


@check("mapping-version")
def mapping_version(data, ws):
    if data["old"] != data["new"] and data["old_data_handling"] not in ("reconcile", "replay"):
        return ["silent-mapping-change"]
    return []


@check("uncertain-write")
def uncertain_write(data, ws):
    reasons = []
    if data["write"] == "uncertain" and data["checkpoint_advanced"]:
        reasons.append("checkpoint-past-unverified")
    if data.get("retried") and not data["reconciled_before_retry"]:
        reasons.append("blind-retry")
    return reasons


@check("unchanged-replay")
def unchanged_replay(data, ws):
    if not data["source_changed"] and (data["writes"] or data["content_rewrites"]):
        return ["unchanged-replay-wrote"]
    return []


@check("host-pointers")
def host_pointers(data, ws):
    reasons = []
    for pointer in data["pointers"]:
        if pointer["target"] != data["new_root"]:
            reasons.append("stale-pointer")
        if pointer["company_data"]:
            reasons.append("data-in-pointer")
    return reasons


@check("root-navigation")
def root_navigation(data, ws):
    reasons = []
    if set(data["manual_link_list"]) & set(data["native_children"]):
        reasons.append("duplicate-link-list")
    if data.get("manual_list_required"):
        reasons.append("manual-list-required")
    if len(data["exposed"]) != len(set(data["exposed"])):
        reasons.append("duplicate-destination")
    if set(data["exposed"]) != set(data["native_children"]):
        reasons.append("destination-missing")
    if data["exposed_root_title"] != data["root_title"]:
        reasons.append("root-title-changed")
    if not data["limits_reported"]:
        reasons.append("limits-unreported")
    if data["definitions"] != 1:
        reasons.append("competing-definition")
    return reasons


@check("decision-recency")
def decision_recency(data, ws):
    reasons = []
    if data["answer_source"] == data["speculation"]["id"]:
        reasons.append("speculation-superseded-decision")
    if data["speculation_label"] == "current":
        reasons.append("speculation-as-current")
    return reasons


@check("import-time")
def import_time(data, ws):
    reasons = []
    if data["recorded_event_date"] != data["event_date"]:
        reasons.append("import-as-event-date")
    if data["confirmed"] or data["current"]:
        reasons.append("import-as-confirmation")
    return reasons


@check("freshness")
def freshness(data, ws):
    reasons, balance = [], data["balance"]
    if balance["age_hours"] > data["freshness_hours"]:
        if balance["reported"] == "current":
            reasons.append("stale-as-current")
        elif not balance["observation_time_shown"]:
            reasons.append("observation-time-missing")
    if data["invoice"]["state"] != "valid":
        reasons.append("invoice-decayed")
    return reasons


@check("shared-runner")
def shared_runner(data, ws):
    reasons, seen = [], []
    for trigger in data["triggers"]:
        seen.extend(trigger["paths"])
    if len(seen) != len(set(seen)):
        reasons.append("duplicate-schedule")
    checkpoints = [path["checkpoint"] for path in data["paths"]]
    if len(checkpoints) != len(set(checkpoints)):
        reasons.append("shared-checkpoint")
    if data["per_source_service"]:
        reasons.append("compulsory-service")
    if data["writers"] != 1:
        reasons.append("multiple-writers")
    return reasons


@check("independent-progress")
def independent_progress(data, ws):
    reasons = []
    for path in data["paths"]:
        if path["outcome"] != "verified" and path["after"] > path["before"]:
            reasons.append("advanced-by-other-success")
        if path["outcome"] == "verified" and path["after"] < path["before"]:
            reasons.append("rolled-back")
    if data["run"] == "complete" and any(p["outcome"] != "verified" for p in data["paths"]):
        reasons.append("run-reported-complete")
    return reasons


@check("overlap")
def overlap(data, ws):
    reasons = []
    if data["second"]["action"] == "write" or data["concurrent_writes"]:
        reasons.append("double-write")
    if data["duplicates"]:
        reasons.append("duplicate-record")
    return reasons


@check("multipath-replay")
def multipath_replay(data, ws):
    reasons = []
    for path in data["paths"]:
        if path.get("changed") is False and path.get("writes"):
            reasons.append("unchanged-path-rewritten")
        if path.get("write") == "uncertain" and path.get("checkpoint_advanced"):
            reasons.append("checkpoint-past-unverified")
    if data["run"] == "complete":
        reasons.append("run-reported-complete")
    return reasons


@check("meaning")
def meaning(data, ws):
    # Unknown stays unknown, also for a confirmation, cause or confidence; any other
    # value must equal its evidenced source statement.
    for key, value in data["enriched"].items():
        if value in (None, "unknown"):
            continue
        if data["evidence"].get(key) in (None, "unknown") or data["evidence"][key] != value:
            return ["invented-meaning"]
    return []


@check("correction-conflict")
def correction_conflict(data, ws):
    reasons, correction = [], data["correction"]
    if data["current_answer"] == correction["old"]:
        reasons.append("superseded-in-current")
    if correction["old"] not in data["history"]:
        reasons.append("history-deleted")
    if data["conflict"]["state"] != "needs-review":
        reasons.append("conflict-silently-resolved")
    return reasons


@check("evidence-classes")
def evidence_classes(data, ws):
    reasons = []
    for pipeline in data["pipelines"]:
        if pipeline["reported"] == "scheduled-verified" and not pipeline["observed_scheduled_run"]:
            reasons.append("scheduled-claim-without-run")
        if pipeline["reported"] == "manual-verified" and not pipeline["manual_receipt"]:
            reasons.append("manual-claim-without-receipt")
    return reasons


# Managed policy CLAUDE.md locations (memory snapshot :59); like the user file they do not count.
MANAGED_CLAUDE_MD = ("/Library/Application Support/ClaudeCode/CLAUDE.md", "/etc/claude-code/CLAUDE.md",
                     "C:\\Program Files\\ClaudeCode\\CLAUDE.md")


def path_parts(path):
    """Non-empty path components, for both / and \\ separators."""
    return [part for part in re.split(r"[\\/]", path) if part]


def in_rules_directory(parts):
    """`.claude` directly followed by `rules`, both before the final component (snapshot :176)."""
    return any(parts[index] == ".claude" and parts[index + 1] == "rules" for index in range(len(parts) - 2))


def counts_against_agents(path, rules):
    """A project or ancestor CLAUDE.md, .claude/CLAUDE.md or CLAUDE.local.md, whatever its prefix."""
    if path in rules["non_counting_files"] or path in MANAGED_CLAUDE_MD:
        return False
    if in_rules_directory(path_parts(path)):
        return False
    names = {path_parts(name)[-1] for name in rules["counting_files"]}
    parts = path_parts(path)
    return bool(parts) and parts[-1] in names


@check("bridge-loading")
def bridge_loading(data, ws):
    reasons, rules = [], data["rules"]
    for report in data["reports"]:
        pi = report.get("project_instructions") or {}
        evidence = (report.get("client"), report.get("version"), report.get("files") is not None,
                    pi.get("value"), pi.get("location"), report.get("observed_fresh_load"))
        if report["reported"] == "loaded" and not all(evidence):
            reasons.append("loaded-without-evidence")
        if report.get("claims", {}).get("agents_loaded_by_default"):
            if version(report["version"]) < version(rules["min_direct_agents_version"]):
                reasons.append("version-gate")
            counting = [path for path in report["files"] if counts_against_agents(path, rules)]
            combined = (pi.get("value") == "claude-md-and-agents-md" and
                        pi.get("location") in rules["combined_value_honoured_in"])
            if counting and not combined and "@AGENTS.md" not in report.get("imports", []):
                reasons.append("default-agents-with-claude-md")
        if set(report.get("assumed_suppressed_by", [])) & set(rules["non_counting_files"]):
            reasons.append("user-claude-md-suppresses")
        if report.get("duplicated_startup"):
            reasons.append("duplicate-startup")
        if report.get("treated_as_access_proof"):
            reasons.append("loading-as-access-proof")
    return reasons


ABSTRACT = ("", "notes", "context", "document", "misc", "info")
# The six logical knowledge-metadata fields, by their fixture names.
GLANCE_METADATA = ("summary", "kind", "temporal", "evidence_basis", "source_period", "state")


def meaningful_text(value):
    return isinstance(value, str) and bool(value.strip())


def meaningful_list(value):
    return isinstance(value, list) and bool(value) and all(isinstance(item, str) and item.strip() for item in value)


def metadata_complete(entry):
    """All six fields present: non-blank text, and a non-empty list of non-blank evidence entries."""
    return all(meaningful_list(entry.get(field)) if field == "evidence_basis" else meaningful_text(entry.get(field))
               for field in GLANCE_METADATA)


@check("glance")
def glance(data, ws):
    reasons, entries, rendering = [], data["entries"], data["glance_rendering"]
    for entry in entries:
        summary, kind = entry.get("summary"), entry.get("kind")
        if isinstance(summary, str) and isinstance(kind, str):
            summary = summary.strip()
            if summary.lower() in ABSTRACT or len(summary) < 20 or kind == entry.get("source_type"):
                reasons.append("meaning-needs-body")
        if not metadata_complete(entry):
            reasons.append("metadata-incomplete")
    # One rendered item per entry, in order, showing at least its Summary, Kind and temporal scope.
    if not rendering:
        reasons.append("rendering-empty")
    elif len(rendering) != len(entries) or any(
            not all(str(entry.get(field, "")).lower() in item.lower() for field in ("summary", "kind", "temporal"))
            for entry, item in zip(entries, rendering)):
        reasons.append("rendering-mismatch")
    if data["body_reads"]:
        reasons.append("body-read-for-selection")
    if data["selected"] != data["expected"]:
        reasons.append("wrong-selection")
    if not all(field in data["glance_fields"] for field in ("summary", "kind", "temporal_scope")):
        reasons.append("glance-incomplete")
    return reasons


@check("historical-context")
def historical_context(data, ws):
    reasons, entry = [], data["entry"]
    if entry["kind"] == entry["source_type"]:
        reasons.append("kind-is-source-type")
    if entry["state"] in ("superseded", "needs-review") and entry.get("state_reason") == "age":
        reasons.append("age-as-state")
    if entry["temporal_field"] == entry["status_field"]:
        reasons.append("status-collision")
    if entry["temporal"] == "historical" and not entry.get("source_period"):
        reasons.append("period-missing")
    return reasons


@check("mixed-source")
def mixed_source(data, ws):
    reasons = []
    if data["entries_created"] != 1:
        reasons.append("entry-per-source")
    if any(item["type"] != item["provenance"] for item in data["evidence"]):
        reasons.append("mislabelled-evidence")
    return reasons


@check("claim-strength")
def claim_strength(data, ws):
    reasons = []
    for claim in data["claims"] + data["summary_claims"]:
        if claim["origin"] == "hypothesis" and not claim["marked_hypothesis"]:
            reasons.append("hypothesis-as-fact")
        if claim["origin"] == "hypothesis" and claim["basis"] == "fact":
            reasons.append("repetition-promoted")
    if data["preference"]["evidence"] in ("revenue", "invoice-count"):
        reasons.append("preference-from-revenue")
    if not data["significance"].get("basis"):
        reasons.append("significance-without-basis")
    return reasons


ORDINALS = ("first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth")


def invoice_sequence(claim):
    """An ordinal followed by "invoice" is an invoice-sequence claim, qualified or not."""
    text = claim.lower()
    match = re.search(r"\b(%s|\d+(?:st|nd|rd|th))\s+invoice\b" % "|".join(ORDINALS), text)
    if not match:
        return None
    return {"kind": "invoice-sequence", "ordinal": match.group(1),
            "qualified": "observed in the covered period" in text}


@check("milestone")
def milestone(data, ws):
    reasons, sequence = [], invoice_sequence(data["claim"])
    if not data["coverage_complete"] and sequence and not sequence["qualified"]:
        if sequence["ordinal"] in ("first", "1st"):
            reasons.append("first-on-partial")
        else:
            reasons.append("sequence-on-partial")
    if data["backfill"] and not data["claim_rederived"]:
        reasons.append("milestone-unchanged")
    if data["credit_note"] and not data["credit_note_considered"]:
        reasons.append("credit-note-ignored")
    if not data["history_kept"]:
        reasons.append("history-deleted")
    return reasons


@check("projection")
def projection(data, ws):
    reasons = []
    if data["route"] == "projection":
        p = data["projection"]
        if not data["answer_states_as_of"]:
            reasons.append("projection-as-live")
        if not all(p.get(k) for k in ("as_of", "coverage", "authority", "stable_ids", "substance")):
            reasons.append("projection-incomplete")
    if data["knowledge_has_live_state"]:
        reasons.append("duplicate-live-state")
    if data["projection_used_as_task_system"]:
        reasons.append("second-task-system")
    return reasons


@check("daily-writes")
def daily_writes(data, ws):
    reasons, allowlist = [], set(data["allowlist"])
    # Canonical operational targets come from the workspace definitions, never from the allowlist.
    canonical = {target for w in ws.values() for target in w["roles"]["operational"]}
    for write in data["writes"]:
        if write["mode"] == "daily" and write["allowed"] and write["target"] not in allowlist:
            reasons.append("daily-operational-write")
        elif write["mode"] == "daily" and write["allowed"] and write["target"] in canonical:
            reasons.append("daily-canonical-write")
        if write["mode"] == "projection-writeback" and write["allowed"]:
            reasons.append("implicit-writeback")
        if write["mode"] == "task" and write["route_qualified"] and not write["allowed"]:
            reasons.append("task-route-refused")
    return reasons


@check("grants")
def grants(data, ws):
    reasons = []
    # The fictional actual grants and their descendants, described once per workspace.
    actual = {key: {grant["parent"]: set(grant["descendants"]) for grant in w["connection_grants"]}
              for key, w in ws.items()}
    for scope in data["scopes"]:
        if not scope["grants"]:
            reasons.append("grants-not-enumerated")
        key = scope.get("workspace")
        # Known only as a string naming a loaded workspace; the type is checked before membership.
        known = isinstance(key, str) and key in actual
        if not known:
            reasons.append("scope-workspace-missing")
        # Every actual grant of a known workspace is reported, then each one's descendants. The
        # parent-as-view test needs no actual grants, so it runs for every scope.
        own = actual[key] if known else {}
        foreign = ({parent for other, grants_of in actual.items() if other != key for parent in grants_of} - set(own)
                   if known else set())
        if known and set(own) - {grant.get("parent") for grant in scope["grants"]}:
            reasons.append("grant-omitted")
        views = {view["view"] for view in scope["linked_views"]}
        for grant in scope["grants"]:
            parent = grant.get("parent")
            if parent in foreign:
                reasons.append("grant-wrong-workspace")
                continue
            if parent in views:
                reasons.append("view-as-grant")
            if not known:
                continue
            if parent not in own:
                reasons.append("grant-identity-missing")
                continue
            inherited = set(grant["inherited"])
            if own[parent] - inherited:
                reasons.append("descendant-omitted")
            if inherited - own[parent]:
                reasons.append("descendant-not-granted")
        for view in scope["linked_views"]:
            if view["assumed_grant_target"] or not view.get("actual_parent"):
                reasons.append("view-as-grant")
        if scope["ingestion_activated"]:
            reasons.append("access-as-ingestion")
        if scope["rewrite_authority"]:
            reasons.append("access-as-rewrite")
        if scope["per_page_readonly_claim"]:
            reasons.append("per-page-readonly-claim")
        if not all(scope["report_separates"].get(k) for k in ("grant", "retention", "write")):
            reasons.append("authorities-merged")
    return list(dict.fromkeys(reasons))


LIFECYCLES = ("current-recurring", "historical-one-off", "deferred", "excluded")


@check("source-lifecycle")
def source_lifecycle(data, ws):
    reasons = []
    for source in data["sources"]:
        if source.get("lifecycle") not in LIFECYCLES:
            reasons.append("lifecycle-implicit")
        if source.get("activated") and source.get("selected_by") != "customer":
            reasons.append("activated-by-availability")
        if source.get("lifecycle") == "historical-one-off" and source.get("reported") == "missing-daily-pipeline":
            reasons.append("archive-as-missing-pipeline")
        if source.get("lifecycle") == "deferred" and source.get("reported") in EMPTY_DISPLAY:
            reasons.append("deferred-as-empty")
    return reasons


def normalize_markdown(text):
    text = re.sub(r"\\([\\`*_{}\[\]()#+\-.!|])", r"\1", text)
    text = re.sub(r"(\*\*|__|\*|_)(.+?)\1", r"\2", text)
    return re.sub(r"\s+", " ", text).strip()


def exact_tokens(text):
    return (re.findall(r"`[^`]*`", text), re.findall(r"\]\(([^)]*)\)", text),
            re.findall(r"\d+(?:[.,]\d+)*", re.sub(r"`[^`]*`|\]\([^)]*\)", "", text)))


@check("semantic-readback")
def semantic_readback(data, ws):
    reasons = []
    for pair in data["pairs"]:
        same = (exact_tokens(pair["written"]) == exact_tokens(pair["read_back"]) and
                normalize_markdown(pair["written"]) == normalize_markdown(pair["read_back"]))
        if pair["verdict"] == "pass" and not same:
            reasons.append("unsafe-readback-pass")
        if pair["verdict"] == "fail" and same:
            reasons.append("formatting-as-loss")
    return reasons


@check("creation-metadata")
def creation_metadata(data, ws):
    reasons = []
    if data["before"]["created_native"] != data["after"]["created_native"]:
        reasons.append("creation-reset")
        if "native" not in data["verification"]["checked"] and data["verification"]["reported"] == "preserved":
            reasons.append("property-only-check")
    # Native creation metadata is always verified, whether or not this sample changed.
    if data["before"].get("created_native") is not None and "native" not in data["verification"]["checked"]:
        reasons.append("native-unchecked")
    return reasons


@check("legacy-migration")
def legacy_migration(data, ws):
    reasons, before, after = [], data["before"], data["after"]
    if after["type"] != before["type"] or after["category"] != before["category"]:
        reasons.append("legacy-deleted")
    if after["status"] != before["status"]:
        reasons.append("status-overwritten")
    if after["kind"] == before.get("source_type"):
        reasons.append("kind-from-source-type")
    if not after.get("temporal"):
        reasons.append("temporal-unmapped")
    return reasons


@check("method-placement")
def method_placement(data, ws):
    reasons = []
    if any(page.get("contains_architecture") for page in data["planned_pages"]):
        reasons.append("architecture-copied")
    if "architecture" in data["ordinary_use_reads"]:
        reasons.append("architecture-preloaded")
    if not {"orientation", "rules", "definition"} <= set(data["root_contains"]):
        reasons.append("entry-incomplete")
    return reasons


@check("human-document-edit")
def human_document_edit(data, ws):
    reasons = []
    for edit in data["edits"]:
        if edit["actor"] in ("setup", "install", "daily") and edit["target_is_human_library"]:
            reasons.append("routine-human-write")
        if edit["actor"] == "task" and edit["applied_to"] != "original":
            reasons.append("edit-on-copy")
        if edit["actor"] == "task" and not edit["recorded"]:
            reasons.append("edit-unrecorded")
    return reasons


@check("date-only")
def date_only(data, ws):
    reasons, value, recorded = [], data["value"], data["recorded"]
    if value["end"] is None and value["timezone"] is None and "T" not in value["date"]:
        if recorded["kind"] == "missing-coverage" or recorded.get("coverage") != "complete":
            reasons.append("date-only-as-missing-coverage")
        if recorded["kind"] in ("open-ended", "ongoing", "unknown-period"):
            reasons.append("date-only-as-open-ended")
        if recorded.get("needs_review") and recorded.get("review_reason") == "null-end-timezone":
            reasons.append("null-end-review")
        if recorded.get("date") != value["date"] or recorded.get("time") or recorded.get("timezone"):
            reasons.append("shifted-date")
    return reasons


def fictional(value, path="fixture"):
    problems = []
    if isinstance(value, dict):
        for key, item in value.items():
            problems += fictional(item, f"{path}.{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            problems += fictional(item, f"{path}[{index}]")
    elif isinstance(value, str):
        if re.search(r"[\w.+-]+@[\w-]+\.\w", value):
            problems.append(f"{path}: e-mail address")
        for host in re.findall(r"https?://([^/\s)]+)", value):
            if not (host.endswith(".example") or host == "example.com"):
                problems.append(f"{path}: non-example URL host {host}")
        if re.search(r"\b[0-9a-f]{32}\b", value):
            problems.append(f"{path}: provider-shaped identifier")
    return problems


def main():
    workspaces = {key: json.loads((FIXTURES / f"workspace-{key}.json").read_text()) for key in ("a", "b")}
    cases = json.loads((FIXTURES / "cases.json").read_text())
    headings = {}
    for name in ("architecture.md", "migration.md"):
        text = (REFERENCES / name).read_text()
        headings[name] = {slug(line.lstrip("#")) for line in text.splitlines() if line.startswith("#")}
    failures, positives, variants, negatives = [], 0, 0, 0

    for key, workspace in workspaces.items():
        example = ROOT / workspace["example"]
        if not example.is_file() or workspace["name"].split(" (")[0] not in example.read_text():
            failures.append(f"workspace {key}: example page missing or unrelated")
    problems = fictional(workspaces) + fictional(cases)
    for problem in problems:
        print(f"FICTION {problem}")
    failures += problems

    ids = [case["id"] for case in cases]
    if ids != list(range(1, 49)):
        failures.append(f"case ids are not 1..48: {ids}")
    for case in cases:
        label = f"case {case['id']:>2} {case['name']}"
        document, _, anchor = case["contract"].partition("#")
        if anchor not in headings.get(document, set()):
            failures.append(f"{label}: contract anchor {case['contract']} missing")
        function = CHECKS[case["check"]]
        found = function(case["positive"], workspaces)
        positives += 1
        print(f"{label}: positive -> {'PASS' if not found else 'FAIL ' + ','.join(found)}")
        if found:
            failures.append(f"{label}: positive rejected {found}")
        # A valid variant differs from its positive by one input the contract also accepts.
        for index, variant in enumerate(case.get("variants", []), 1):
            variants += 1
            found = function(merge(case["positive"], variant["override"]), workspaces)
            print(f"{label}: variant {index} -> {'PASS' if not found else 'FAIL ' + ','.join(found)}")
            if found:
                failures.append(f"{label}: valid variant {index} rejected {found}")
        if not case["negatives"]:
            failures.append(f"{label}: no negative fixture")
        for index, negative in enumerate(case["negatives"], 1):
            negatives += 1
            data = negative["data"]
            # A negative usually differs from its positive by exactly the defect it tests.
            if data.get("from_positive"):
                data = merge(case["positive"], data.get("override", {}))
            found = function(data, workspaces)
            ok = negative["expect"] in found
            print(f"{label}: negative {index} -> {'REJECTED' if found else 'ACCEPTED'} "
                  f"[{','.join(found) or 'none'}] expected {negative['expect']} {'ok' if ok else 'MISMATCH'}")
            if not ok:
                failures.append(f"{label}: negative {index} expected {negative['expect']}, got {found}")

    print(f"positives={positives} variants={variants} negatives={negatives} failures={len(failures)}")
    for failure in failures:
        print(f"FAIL {failure}")
    print("PASS: context architecture fixtures (fixture-level only; no live, native, Home or timed proof)"
          if not failures else "FAIL: context architecture fixtures")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
