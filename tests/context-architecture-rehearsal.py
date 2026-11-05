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
REFERENCES = ROOT / "skills/osm-data-context/references"
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


POLICY_CHOICES = ("whole-home", "narrower")
# Actions that need their own authority; a writable scope grants none of them.
SEPARATE_AUTHORITY = ("sharing-change", "source-selection", "account-widening", "credential-change", "deletion",
                      "publication", "external-send", "new-notification", "plugin-delivery", "content-workflow-start",
                      "outside-operational-write", "other-consequential-action")


def home_stores(w):
    # An external operational reference (Clients, Projects) is not home containment, so it is not listed here.
    roles = w["roles"]
    return {w["root"]["id"], roles["knowledge"], roles["memory"], roles["methods"], roles["control"]}


def store_of(target):
    return target.split("/")[0]


def policy_denial(policy, target):
    """Why the owner's recorded policy does not cover a target, or None. The target and its store both count."""
    policy = policy or {}
    if policy.get("choice") not in POLICY_CHOICES:
        return "no-policy-recorded"
    identities = {target, store_of(target)}
    if identities & set(policy.get("exclude", [])):
        return "excluded-by-policy"
    if policy["choice"] == "narrower" and not identities & set(policy.get("include", [])):
        return "outside-policy"
    return None


@check("write-policy")
def write_policy(data, ws):
    reasons = []
    for w in each_workspace(data, ws):
        for write in w.get("planned_writes", []):
            if write["mode"] != "routine":
                continue
            if store_of(write["target"]) not in home_stores(w):
                reasons.append("outside-home")
            else:
                reasons.append(policy_denial(w.get("write_policy"), write["target"]))
    return unique(reason for reason in reasons if reason)


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


@check("operational-upkeep")
def operational_upkeep(data, ws):
    reasons = []
    # Canonical operational targets come from the workspace definitions, never from a destination allowlist.
    canonical = {target for w in ws.values() for target in w["roles"]["operational"]}
    for write in data["writes"]:
        if write["mode"] == "daily" and write["allowed"]:
            # Daily upkeep is bounded by the owner's recorded policy. The data's destination allowlist is superseded
            # and neither widens nor reduces that scope; an external operational system is refused whatever it lists.
            if store_of(write["target"]) in canonical:
                reasons.append("daily-canonical-write")
            else:
                reasons.append(policy_denial(data["policy"], write["target"]))
        if write["mode"] == "projection-writeback" and write["allowed"]:
            reasons.append("implicit-writeback")
        if write["mode"] == "task" and write["route_qualified"] and not write["allowed"]:
            reasons.append("task-route-refused")
        if write["mode"] != "upkeep":
            continue
        # Upkeep reaches only an actual descendant collection; a link or projection is not ancestry.
        if store_of(write["target"]) not in data["descendants"]:
            reasons.append("link-as-ancestry")
            continue
        reasons.append(policy_denial(data["policy"], write["target"]))
        edit = write["edit"]
        if not edit["targeted"] or edit["schema_changed"] or edit["layout_changed"]:
            reasons.append("untargeted-upkeep")
        if edit["work_state_changed"]:
            reasons.append("task-state-changed")
        if edit["run_report"]:
            reasons.append("run-report-in-task")
    return unique(reason for reason in reasons if reason)


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


# C1-A1 (cases 49-65): source preparation, credentials and coverage, curation relevance, numerical semantics.
def unique(reasons):
    return list(dict.fromkeys(reasons))


EXTERNAL_RECIPES = ("speech-to-text", "ocr", "vision")
DETECTED_FIELDS = ("type", "language", "size", "transport", "encrypted")
WRITE_SCOPES = ("send-messages", "delete-files", "write-general")
PLATFORM_STORES = {"macos": ("platform-keychain",), "windows": ("platform-credential-store",), "linux": ("managed-linux-store",)}
EVIDENCE_BASES = ("stated-formula", "owner-definition", "documented-rule")


@check("source-recipe")
def source_recipe(data, ws):
    reasons = []
    for fmt in data["formats"].values():
        if not fmt.get("recipe") and not fmt.get("reported") and not fmt.get("exclusion"):
            reasons.append("recipe-missing-unreported")
        if fmt.get("claimed_supported") and not fmt.get("qualified"):
            reasons.append("format-claim-unqualified")
        if fmt.get("recipe") in EXTERNAL_RECIPES and not (fmt.get("egress") and fmt.get("retention")):
            reasons.append("recipe-egress-unrecorded")
        if fmt.get("selected") and fmt.get("skipped_as_non_text"):
            reasons.append("attachment-skipped")
    if data["recipe_choice"] != "once-in-agreement":
        reasons.append("per-item-approval")
    if not {"representative-content", "actual-attachment"} <= set(data["qualification"]["basis"]):
        reasons.append("metadata-only-qualification")
    if data["capture"]["scheduled"] != data["capture"]["manual"]:
        reasons.append("second-ingestion-path")
    if any(data["infrastructure"].values()):
        reasons.append("mandatory-infrastructure")
    return unique(reasons)


@check("extraction-quality")
def extraction_quality(data, ws):
    reasons = []
    for item in data["items"].values():
        if any(item.get(field) is None for field in DETECTED_FIELDS):
            reasons.append("detection-missing")
        result_language = item.get("result_language") or (item.get("native_transcript") or {}).get("language")
        if item["state"] == "success" and (result_language != item["expected_language"]
                                           or item["content"] != "full" or not item["resolved"]):
            reasons.append("quality-false-success")
    if data["embedded_instruction"]["executed"]:
        reasons.append("embedded-instruction-executed")
    if data["destination"]["raw_transcript"]:
        reasons.append("raw-transcript-retained")
    if not data["transient"]["purged"] and not data["transient"].get("expiry"):
        reasons.append("transient-not-purged")
    return unique(reasons)


@check("item-pending")
def item_pending(data, ws):
    reasons, sources = [], data["sources"]
    open_items = [item for item in data["pending"].values() if item["status"] == "pending"]
    for item in data["pending"].values():
        if item["status"] == "cleared" and item["cleared_by"] not in ("verified-success", "authorised-exclusion"):
            reasons.append("pending-cleared-unverified")
    for item in open_items:
        if not all(item.get(field) for field in ("reason", "next_step", "retry_condition")):
            reasons.append("pending-not-actionable")
        if item["retries"] and not item["retry_condition_met"]:
            reasons.append("unchanged-retry")
        if sources[item["source"]]["checkpoint"] >= item["position"]:
            reasons.append("checkpoint-conflated")
    if "blocked" in data["eligible"].values():
        reasons.append("independent-work-blocked")
    at_bound = any(sum(1 for item in open_items if item["source"] == name) >= data["bound"] and not source["paused"]
                   for name, source in sources.items())
    if data["dropped"]:
        reasons.append("pending-overflow-dropped")
    if at_bound:
        reasons.append("pending-bound-not-paused")
    if any(source["held"] for source in sources.values() if source["state"] != "credential-failure"):
        reasons.append("hold-not-source-scoped")
    return unique(reasons)


@check("dependent-meaning")
def dependent_meaning(data, ws):
    reasons, revision = [], data["revision"]
    for topic in data["topics"].values():
        if topic["dependency"] == "pending" and topic["shown"] == "complete" and not topic.get("gap"):
            reasons.append("dependency-gap-hidden")
        if topic["dependency"] == "resolved" and not topic["reopened"]:
            reasons.append("dependency-not-reopened")
    if revision["changed"] and not revision["extraction_reopened"]:
        reasons.append("revision-not-reopened")
    if revision["changed"] and (revision["created_topic"] or revision["reconciled_into"] != revision["owning_topic"]):
        reasons.append("revision-new-topic")
    if data["deletion"]["handled_by"] != "configured-retention":
        reasons.append("deletion-outside-retention")
    return unique(reasons)


@check("source-credential-scope")
def source_credential_scope(data, ws):
    reasons, approved = [], {item["scope"] for item in data["exceptional"] if item.get("authority")}
    if any(scope in WRITE_SCOPES and scope not in approved for scope in data["granted_scopes"]):
        reasons.append("excess-source-scope")
    if set(data["enforced_by"]) & {"prompt-channel-filter", "tool-confirmation"}:
        reasons.append("prompt-as-enforcement")
    if "provider-scopes" not in data["enforced_by"]:
        reasons.append("provider-scope-not-enforced")
    if data["unattended"]["fallback"] or any(c["broad"] and (c["path"] != "interactive" or c.get("used_by_unattended")) for c in data["connectors"]):
        reasons.append("broad-unattended-fallback")
    if {"content", "thread", "attachment"} - set(data["paths"]) or any(state != "verified" for state in data["paths"].values()):
        reasons.append("recipe-path-unverified")
    if data["outside_read"]["denied_by"] not in ("provider", "adapter"):
        reasons.append("denial-unattributed")
    if not {"granted-scopes", "local-allowlist"} <= set(data["write_exclusion"]["evidence"]):
        reasons.append("write-exclusion-unproven")
    if not data["write_probe"]["disposable"]:
        reasons.append("nondisposable-write-probe")
    if data["isolation"]["claim"] == "object-level" and not data["isolation"]["provider_supports_object_level"]:
        reasons.append("isolation-overclaimed")
    return unique(reasons)


@check("secret-store")
def secret_store(data, ws):
    reasons, lifecycle = [], data["lifecycle"]
    if data["keys_found_in"]:
        reasons.append("secret-in-plaintext")
    if data["tests"]["unattended_availability"] != "tested" or data["tests"]["platform"] != data["platform"]:
        reasons.append("secret-unattended-untested")
    if data["access_loss"]["behaviour"] != "fail-closed" or data["access_loss"]["interactive_prompt"]:
        reasons.append("secret-not-fail-closed")
    if any(lifecycle[step] != "defined" for step in ("refresh", "revocation", "recovery")):
        reasons.append("secret-lifecycle-undefined")
    if data["refresh"]["writers"] != 1 and not data["refresh"]["atomic"]:
        reasons.append("refresh-not-serialised")
    store = data["store"]
    suited = store["kind"] in PLATFORM_STORES.get(data["platform"], ()) or (store.get("class") in ("native", "managed") and data["platform"] in store.get("suited_to", ()))
    if not suited or set(data["contract"]["applies_to"]) - {data["platform"]}:
        reasons.append("platform-choice-generalised")
    return unique(reasons)


@check("effective-tool-set")
def effective_tool_set(data, ws):
    reasons = []
    for harness in data["harnesses"].values():
        if not harness["claimed"]:
            continue
        if any(harness["inventory"].get(key) != "checked" for key in ("inherited_account_connectors", "desktop_delivered_connectors", "local_mcp_plugin_settings")) or any(state != "checked" for state in harness["inventory"].values()):
            reasons.append("inherited-connector-unchecked")
        if any(claim["basis"] == "cli-route-disabled" for claim in harness["exclusion_claims"]):
            reasons.append("cli-disable-as-exclusion")
        if harness["tool_set"]["qualified_in"] != "real-launch-mode":
            reasons.append("tool-set-unqualified")
        isolation = harness["isolation"]
        if isolation["basis"] == "prompt-promise" or (not isolation["enforced"] and not isolation.get("limit_reported")):
            reasons.append("isolation-by-prompt")
        if harness.get("evidence") != "recorded":
            reasons.append("harness-claim-untested")
    if data["proofs"]["execution"]["basis"] == "installed-skills":
        reasons.append("proofs-conflated")
    return unique(reasons)


@check("selected-connection-root")
def selected_connection_root(data, ws):
    reasons = []
    needs_broader = any(consumer["reads_via"] != "selected" or not consumer["works_without_broader"]
                        for consumer in data["consumers"].values())
    broader_path = any(path["connector"] == "broader" and path["used_by"] != "interactive-picker"
                       for path in data["optional_paths"])
    if needs_broader or broader_path:
        reasons.append("broad-connector-required")
    if data["denial"]["retried_via"] == "broader-connector":
        reasons.append("fallback-after-denial")
    return unique(reasons)


@check("coverage-policy")
def coverage_policy(data, ws):
    reasons, policy, channels = [], data["policy"], data["channels"]
    if data["retention"]["retain_every_message"]:
        reasons.append("broad-read-as-retention")
    if any(cap["name"] != "read" and cap["justified_by"] == "coverage" for cap in data["capabilities"]):
        reasons.append("coverage-as-capability")
    missed = any(ch["eligible"] == "new" and not ch["included"] for ch in channels.values())
    if policy["kind"] == "broad" and not policy.get("owner_selected"):
        reasons.append("broad-scope-not-owner-selected")
    if policy["kind"] == "broad" and (policy["static_id_list"] or missed):
        reasons.append("static-list-for-broad-policy")
    if any(ch.get("excluded") and ch["included"] for ch in channels.values()):
        reasons.append("exclusion-not-applied")
    if policy["initial_lookback_days"] is None:
        reasons.append("backfill-unbounded")
    keys = [ch["checkpoint_key"] for ch in channels.values() if ch["included"]]
    if len(keys) != len(set(keys)):
        reasons.append("coverage-checkpoint-shared")
    unbacked = any(ch["kind"] == "private" and ch["included"] and not (ch["member"] and ch["policy_allows"])
                   for ch in channels.values())
    if data["claims"]["private"] != "membership-based" or unbacked:
        reasons.append("private-access-overclaimed")
    unrealised = policy["kind"] == "broad" and not data["credential"]["discovers_broader_scope"]
    if unrealised and (not data["setup"]["limitation_shown"] or data["claims"]["coverage"] == "workspace-wide"):
        reasons.append("bot-as-workspace-feed")
    if set(data["reporting"]["local_filters"]) & set(data["reporting"]["provider_restrictions"]):
        reasons.append("local-filter-as-provider-restriction")
    if any(data["defaults"].values()):
        reasons.append("mandatory-access-default")
    return unique(reasons)


@check("configured-empty-source")
def configured_empty_source(data, ws):
    reasons = []
    for source in data["sources"].values():
        first = source.get("first_item")
        deferred = source.get("lifecycle") == "deferred"
        if source["authorised"] and source["items"] == 0 and not deferred and source["shown"] != "configured-empty":
            reasons.append("empty-as-failure")
        if source["content_path"] in ("exercised", "ready") and not first:
            reasons.append("unexercised-path-claimed")
        if source.get("owner_elected_wait") and source.get("sample_demands", 0) > 1:
            reasons.append("sample-demand-repeated")
        if first and not (first["extraction_checked"] and first["readback_checked"]):
            reasons.append("first-item-unchecked")
        if deferred and source["activated"] and not source["condition_met"]:
            reasons.append("deferred-activated-early")
        if deferred and source["shown"] != "deferred":
            reasons.append("deferred-shown-empty")
    if data["unrelated_work"] != "proceeding":
        reasons.append("empty-blocks-unrelated")
    return unique(reasons)


@check("responsibility-relevance")
def responsibility_relevance(data, ws):
    reasons, records, alerts = [], data["records"], data["alerts"]
    correction, shown = records["owner_correction"], data["lifecycle_shown"]
    if records["support_agreement"]["present"]:
        derived = "active"
    elif records["handover"]["present"]:
        derived = "transferred"
    else:
        derived = "unknown"
    if data["channel_access_treated_as"] == "engagement":
        reasons.append("access-as-engagement")
    if alerts["elevated"] and (not alerts["responsibility_resolved_first"] or derived != "active"):
        reasons.append("alert-before-resolution")
    stale = records["handover"]["present"] and records["tracker"]["status"] == "Active"
    if stale and not correction:
        labels = {"handover": "handover record", "tracker": "client tracker"}
        evidence = data["conflict"]["evidence_shown"]

        def preserved(key):
            record = records[key]
            same = [entry for entry in evidence if entry.get("source") == labels[key]]
            return bool(record.get("date")) and bool(same) and all(entry.get("date") == record["date"] for entry in same)

        if not (preserved("handover") and preserved("tracker")):
            reasons.append("conflict-hidden")
    if correction and any(correction["adds"].values()):
        reasons.append("invented-engagement-terms")
    if derived == "unknown" and (shown == "current-client" or data["topic"]["state"] != "needs-review"):
        reasons.append("unknown-as-active")
    if derived == "transferred" and shown == "current-client":
        reasons.append("former-as-current")
    request, edit = data["new_request"], data["tracker_edit"]
    if request and request["recorded_as"] != "request":
        reasons.append("request-as-obligation")
    edit_ok = bool(edit) and edit["route"] == "task-authorised" and edit["targeted"] and not (edit["schema_changed"] or edit["layout_changed"])
    if edit and not edit_ok:
        reasons.append("tracker-correction-untargeted")
    if data["curation"]["mode"] == "recurring" and data["curation"]["writes_tracker"]:
        reasons.append("recurring-operational-write")
    return unique(reasons)


@check("owner-exclusion")
def owner_exclusion(data, ws):
    reasons, exclusion, reporting = [], data["exclusion"], data["reporting"]
    if not exclusion["persists_after_rediscovery"]:
        reasons.append("exclusion-lost-on-rediscovery")
    if exclusion["history_reactivates"]:
        reasons.append("history-reactivates-exclusion")
    if data["replay"]["state"] != "retired-visible":
        reasons.append("retirement-not-visible")
    if reporting["exclusion_reported_as"] == "coverage-success":
        reasons.append("exclusion-as-coverage")
    revoked_apart = reporting["access_status"] == "revoked" and not (reporting["exclusion_shown"] and reporting["revocation_shown"])
    if reporting["exclusion_reported_as"] == "access-revocation" or revoked_apart:
        reasons.append("exclusion-as-revocation")
    if data["alarms"]["notified_after_exclusion"] > 0:
        reasons.append("excluded-alarm-renotified")
    if data["discovery"]["other_channels"] != "continuing" or not data["discovery"]["new_channel_included"]:
        reasons.append("discovery-stopped")
    return unique(reasons)


@check("fidelity-completeness")
def fidelity_completeness(data, ws):
    reasons, fidelity, completeness = [], data["fidelity"], data["completeness"]
    if completeness["status"] == "complete" and not (completeness["basis"] == "owner-confirmed-scope" and completeness["scope_confirmed_by_owner"] and not completeness["gaps"]):
        reasons.append("balance-as-complete")
    if data["reporting"]["merged"]:
        reasons.append("status-merged")
    if data["before_import"]["shown_as"] == "zero":
        reasons.append("missing-import-as-zero")
    if data["feeds"]["bank_feed_counted_as_ledger_coverage"]:
        reasons.append("feed-as-ledger-coverage")
    if fidelity["status"] == "verified" and (fidelity["basis"] != "control-total-readback" or not fidelity["control_total_available"]):
        reasons.append("fidelity-unverified-claim")
    return unique(reasons)


@check("original-states")
def original_states(data, ws):
    reasons = []
    for doc_id, original in data["originals"].items():
        if original["source_status"] == "cancelled" and not original["kept"]:
            reasons.append("cancelled-dropped")
        if original["source_status"] == "reversed" and (not original["relation_kept"] or not original["kept"]):
            reasons.append("reversal-unlinked")
        if original["source_status"] == "cancelled" and original["opens_item"]:
            reasons.append("cancelled-as-open")
        if original["source_status"] == "archived" and original["opens_item"]:
            reasons.append("archive-as-open")
        if (original["kept"] and original["kept_status"] != original["source_status"]) or (original["source_status"] in ("active", "archived") and not original["kept"]):
            reasons.append("status-collapsed")
        for attachment in original.get("attachments", {}).values():
            if attachment["creates_object"] or attachment["attached_to"] != doc_id:
                reasons.append("attachment-new-object")
            if attachment["matched_by"] != "source-id":
                reasons.append("attachment-by-title")
    if data["home"]["raw_originals_copied"]:
        reasons.append("raw-original-copied")
    return unique(reasons)


@check("mapping-default")
def mapping_default(data, ws):
    reasons, mapping, unseen, later = [], data["mapping"], data["unseen"], data["later_event"]
    rows = mapping["rows"].values()
    if mapping["qualified_by"] != "row-review" or any(not row["reviewed"] for row in rows):
        reasons.append("totals-as-mapping-proof")
    default = unseen.get("default") or {}
    default_ok = unseen["behaviour"] == "owner-default" and bool(default.get("evidence") and default.get("version")) and later["mapped_to"] in (None, default.get("target"))
    if later["mapped_to"] and not default_ok:
        reasons.append("guessed-future-default")
    if not default_ok and later["mapped_to"] is None and (later["state"] != "pending" or later["original_value"] is None):
        reasons.append("unseen-original-dropped")
    if unseen["behaviour"] not in ("pending", "owner-default"):
        reasons.append("default-unreviewed")
    if any(row["lossy"] and row["applied"] for row in rows):
        reasons.append("lossy-mapping-applied")
    if any(row["applied"] and not {"tax", "currency", "sign"} <= set(row["keeps"]) for row in rows):
        reasons.append("mapping-meaning-dropped")
    return unique(reasons)


@check("tabular-reference")
def tabular_reference(data, ws):
    reasons = []
    for definition in data["definitions"].values():
        reference = definition.get("reference") or {}
        if definition["state"] == "defined" and definition["basis"] not in EVIDENCE_BASES:
            reasons.append("header-as-definition")
        if definition["state"] == "defined" and (not reference.get("sheet") or reference.get("row") is None):
            reasons.append("reference-inexact")
        if definition["state"] == "defined" and definition["verified_at"] != data["observed_revision"]:
            reasons.append("reference-unverified")
        if definition["basis"] == "inferred" and definition.get("confirmed"):
            reasons.append("inferred-definition-confirmed")
    return unique(reasons)


@check("feed-transition")
def feed_transition(data, ws):
    reasons, overlap, key = [], data["overlap"], data["composite_key"] or {}
    if overlap["created_again"] > 0:
        reasons.append("duplicate-on-transition")
    if overlap["matched_by_composite_key"] and not (key.get("documented_in_agreement") and key.get("version") and key.get("fields")):
        reasons.append("composite-key-undocumented")
    if any(collision["state"] != "pending-conflict" for collision in data["collisions"]):
        reasons.append("composite-collision-merged")
    if data["balancing_items"] > 0:
        reasons.append("invented-balancing-item")
    if any((diff["state"] != "pending" and not diff.get("resolved_by")) or (diff["state"] == "pending" and not diff.get("reason")) for diff in data["differences"].values()):
        reasons.append("difference-not-pending")
    return unique(reasons)


# HL-1 (cases 66-80): owner-selected home write policy and record lifecycle.
PROCESSING_DATES = ("import", "annotation", "skill-version")
NO_CHANGE_EVENTS = ("read", "no-op", "formatting", "reconfirmation")
ACCEPTED_INPUTS = ("current-task", "owner-decision", "selected-source")
AUTHORITY_ORDER = ("live-owner", "memory", "confirmed", "extraction", "uncertain")
PROPOSAL_FIELDS = ("field", "current", "proposed", "source", "revision", "date", "impact", "verification")


@check("four-questions")
def four_questions(data, ws):
    reasons, write = [], data["write"]
    if data["performed"]:
        if policy_denial(data["policy"], write["target"]):
            reasons.append("owner-policy-bypassed")
        if not data["access"]["granted"]:
            reasons.append("access-bypassed")
        if not data["mandate"]["covers"]:
            reasons.append("mandate-bypassed")
        if write["effect"] in SEPARATE_AUTHORITY and not write.get("authority"):
            reasons.append("separate-authority-bypassed")
    if not data["report"]["separates"]:
        reasons.append("questions-merged")
    return unique(reasons)


@check("grant-not-hardcoded")
def grant_not_hardcoded(data, ws):
    reasons, template, run = [], data["template"], data["run"]
    text = (ROOT / template["path"]).read_text() if template.get("path") else template["text"]
    choice = re.search(r'\bchoice:\s*"([^"]*)"', text)
    if not choice or not choice.group(1).startswith("["):
        reasons.append("template-choice-filled")
    if re.search(r"^\s*protected:", text, re.M):
        reasons.append("protected-key-present")
    if not run["recorded"] and run["acts_on"] != "none":
        reasons.append("grant-assumed")
    if (run["recorded"] or {}).get("choice") == "whole-home" and run["refusal_imposed"]:
        reasons.append("refusal-over-grant")
    if run["recorded"] and run["asked_again"]:
        reasons.append("choice-asked-again")
    for w in each_workspace(data, ws):
        policy = w.get("write_policy") or {}
        if policy.get("choice") != "whole-home" or not policy.get("recorded"):
            reasons.append("workspace-grant-unrecorded")
    return unique(reasons)


@check("containment")
def containment(data, ws):
    reasons, home = [], {data["root"], *data["named_stores"]}
    if set(data["named_stores"]) & set(data["operational_sources"]):
        reasons.append("source-as-store")
    for record in data["records"].values():
        if record["scope_from"] != "ancestry":
            reasons.append("scope-from-label")
        if record["ancestry_state"] != "known":
            if record["written"]:
                reasons.append("unresolved-ancestry-written")
            elif not record.get("pending"):
                reasons.append("ancestry-item-missing")
        elif not home & set(record["ancestry"]):
            if record["written"]:
                reasons.append("out-of-scope-written")
            elif record.get("moved") and not record.get("reported"):
                reasons.append("move-unreported")
    return unique(reasons)


@check("policy-surfaces")
def policy_surfaces(data, ws):
    reasons, definition = [], data["definition"]
    excluded = set(definition.get("exclude", []))
    for surface in data["surfaces"].values():
        own_excluded = set(surface.get("exclude", []))
        if definition["choice"] == "whole-home":
            if surface["choice"] != "whole-home" or own_excluded - excluded:
                reasons.append("surface-narrower-than-grant")
            elif excluded - own_excluded:
                reasons.append("surface-wider-than-policy")
        elif (surface["choice"] != "narrower" or not set(surface.get("include", [])) <= set(definition.get("include", []))
              or excluded - own_excluded):
            reasons.append("surface-wider-than-policy")
    if data["pointer"]["refers_to"] != data["root"]:
        reasons.append("pointer-not-by-reference")
    rerun = data["rerun"]
    if rerun["before"] != rerun["after"] and not rerun.get("explicit_change"):
        reasons.append("rerun-changed-policy")
    return unique(reasons)


@check("recorded-forms")
def recorded_forms(data, ws):
    reasons, later = [], data["later_grant"]
    for form in data["forms"]:
        if not form["counts_as_policy"]:
            reasons.append("form-not-policy")
        if not form["kept"]:
            reasons.append("form-dropped")
        if form["job_gains"] and not later:
            reasons.append("job-widened-without-grant")
    if later and not (data["effective"] == "later-grant" and later["reconciled"] and later["change_recorded"]):
        reasons.append("later-grant-ignored")
    return unique(reasons)


@check("separate-authority")
def separate_authority(data, ws):
    reasons = []
    for action in data["actions"]:
        if action["taken"] and action["kind"] in SEPARATE_AUTHORITY and not action.get("authority"):
            reasons.append("authority-inferred-from-grant")
    return unique(reasons)


@check("writable-not-adoption")
def writable_not_adoption(data, ws):
    reasons = []
    if data["source_text"]["kept_as"] != "evidence":
        reasons.append("source-text-adopted")
    if any(change["applied"] and not change["owner_input"] for change in data["changes"]):
        reasons.append("policy-changed-without-owner")
    if data["job"]["rewrote_write_policy"] or data["job"]["rewrote_source_list"]:
        reasons.append("job-rewrote-own-scope")
    if any(policy_denial(data["policy"], write["target"]) is None and not write["allowed"] for write in data["writes"]):
        reasons.append("covered-write-refused")
    return unique(reasons)


@check("home-original")
def home_original(data, ws):
    reasons = []
    for target, edit in data["edits"].items():
        if edit["record_class"] == "original":
            # An original artifact or retained body changes only from accepted input, and only as a targeted edit.
            if edit["input"] not in ACCEPTED_INPUTS or not edit["targeted"]:
                reasons.append("original-edit-unaccepted")
            if edit["reorganised"]:
                reasons.append("original-reorganised")
            if edit["overwritten"]:
                reasons.append("original-overwritten")
            if edit["bulk_imported"]:
                reasons.append("original-bulk-imported")
            if edit["default_destination"]:
                reasons.append("original-default-destination")
            continue
        # A Source or index record and a record in a named store follow the recorded policy, even when a person wrote it.
        if edit["refused"] and policy_denial(data["policy"], target) is None:
            reasons.append("maintained-refused-as-original")
        if not edit["human_writing_kept"]:
            reasons.append("maintained-human-writing-lost")
        pointed = edit.get("pointed_original")
        if pointed and pointed["body_before"] != pointed["body_after"]:
            reasons.append("original-body-changed")
    return unique(reasons)


@check("current-record")
def current_record(data, ws):
    reasons, records = [], list(data["records"].values())
    current = [(record["key"], record["scope"]) for record in records if record["current"]]
    duplicated = {key for key, scope in current if current.count((key, scope)) > 1}
    flagged = {conflict["key"] for conflict in data["conflicts"] if conflict["state"] == "explicit-conflict"}
    if data["appended_stack"]:
        reasons.append("contradictory-append")
    if duplicated - flagged:
        reasons.append("duplicate-current")
    if any(conflict["state"] != "explicit-conflict" for conflict in data["conflicts"]):
        reasons.append("conflict-merged-blindly")
    if any(record["current"] and record["summary"] != record["section"] for record in records):
        reasons.append("summary-stale")
    if data["input"]["relation"] == "same-topic":
        if data["created"]:
            reasons.append("page-per-input")
        if any(record["current"] and not record["history"] for record in records):
            reasons.append("history-lost")
    elif not any(record["forward_to"] for record in records):
        reasons.append("forward-link-missing")
    if data["second_pass_writes"]:
        reasons.append("second-pass-wrote")
    return unique(reasons)


@check("date-meanings")
def date_meanings(data, ws):
    reasons = []
    # Each event carries the record's source date and Revised as they were and as they became; the factual source date
    # stays apart from Revised, and an unknown (null) source date stays null.
    for event in data["events"]:
        kind = event["kind"]
        source_changed = event["source_date_after"] != event["source_date_before"]
        revised_changed = event["revised_after"] != event["revised_before"]
        if kind == "backfill":
            if source_changed or revised_changed:
                reasons.append("date-backfilled")
            continue
        if source_changed:
            if kind in PROCESSING_DATES:
                reasons.append("processing-date-as-source-date")
            elif event["source_date_before"] is None:
                reasons.append("unknown-date-invented")
            else:
                reasons.append("source-date-altered")
        if revised_changed and kind in NO_CHANGE_EVENTS:
            reasons.append("revised-without-substantive-change")
        if kind == "substantive" and data["revised_selected"] and not revised_changed:
            reasons.append("revised-not-set")
    return unique(reasons)


@check("review-due")
def review_due(data, ws):
    reasons, today = [], data["today"]
    for record in data["records"].values():
        if record["review_due"] and not record["reason"]:
            reasons.append("review-due-without-reason")
        if record["review_due"] and record["review_due"] < today and record["treated_as"] != "usable":
            reasons.append("past-due-as-expired")
    done = data["completion"]
    if done["outcome"] == "no-change":
        extra = set(done["writes"]) - {"review_due", "review_reason"}
        if "revised" in extra:
            reasons.append("review-set-revised")
        elif extra:
            reasons.append("review-extra-writes")
        if done["due_after"] == done["due_before"]:
            reasons.append("due-reread-forever")
        if done["due_after"] and not done["reason_after"]:
            reasons.append("review-due-without-reason")
    return unique(reasons)


@check("type-mapping")
def type_mapping(data, ws):
    reasons, stores = [], data["stores"]
    if len(stores) > 1 and len({tuple(sorted(store["fields"])) for store in stores.values()}) == 1:
        reasons.append("identical-schema-forced")
    if "Inbox" in data["stale_flags"]:
        reasons.append("inbox-as-stale")
    if data["released_reference"]["hash_before"] != data["released_reference"]["hash_after"]:
        reasons.append("released-reference-changed")
    if data["plain_page"]["fields_added"]:
        reasons.append("plain-page-altered")
    if data["migration"]["forced"] or data["migration"]["new_database_suite"]:
        reasons.append("forced-migration")
    if not {"revised", "review-due"} <= set(data["provider"]["semantics"]):
        reasons.append("provider-semantics-missing")
    return unique(reasons)


@check("retrieval-order")
def retrieval_order(data, ws):
    reasons, task, candidates = [], data["task"], data["candidates"]
    chosen = candidates[data["selected"]]

    def matches(candidate):
        return candidate["owner"] == task["owner"] and candidate["scope"] == task["scope"]

    comparable = [c for c in candidates.values() if matches(c) and c["status"] == "current"]

    def rank(candidate):
        # An import time is not an evidence time, so it never breaks a tie.
        imported = candidate.get("time_basis") == "import"
        return (AUTHORITY_ORDER.index(candidate["authority"]), float("inf") if imported else candidate["age_days"])

    if comparable and not matches(chosen):
        reasons.append("task-scope-ignored")
    elif chosen["status"] != "current":
        reasons.append("noncurrent-selected")
    elif comparable and chosen is not min(comparable, key=rank):
        reasons.append("import-outranks" if chosen.get("time_basis") == "import" else "recency-over-authority")
    if len(comparable) > 1 and not data["conflict_reason_kept"]:
        reasons.append("conflict-reason-dropped")
    if data["view_used_as_access_control"]:
        reasons.append("view-as-access-control")
    if data["recency_score_used"]:
        reasons.append("recency-score")
    if data["answer_from"] != "summary":
        reasons.append("history-as-current")
    return unique(reasons)


@check("dependents")
def dependents(data, ws):
    reasons, affected, frontier = [], [], [data["revised"]]
    while frontier:
        parent = frontier.pop()
        for name, source in data["depends_on"].items():
            if source == parent and name not in affected:
                affected.append(name)
                frontier.append(name)
    for name in affected:
        output = data["outputs"].get(name, {"state": "current"})
        if output["state"] == "current":
            reasons.append("dependent-stays-current")
        elif output["state"] == "refreshed" and not output.get("verified"):
            reasons.append("failed-refresh-looks-current")
        elif output["state"] == "needs-review" and output.get("in_current_answers"):
            reasons.append("needs-review-in-current")
    if any(not correction["survives"] for correction in data["owner_corrections"]):
        reasons.append("owner-correction-lost")
    if data["timestamp_as_proof"]:
        reasons.append("timestamp-as-proof")
    if data["replay_duplicates"]:
        reasons.append("replay-duplicates")
    return unique(reasons)


@check("drift-and-binding")
def drift_and_binding(data, ws):
    reasons = []
    for drift in data["drift"].values():
        if drift["authority"] == "separate":
            proposal = drift.get("proposal") or {}
            if drift["proposals"] != 1 or not all(proposal.get(field) for field in PROPOSAL_FIELDS):
                reasons.append("proposal-incomplete")
            if drift["notified"] > 1 and not drift["changed_since_notice"]:
                reasons.append("repeat-notification")
        elif not (drift["repaired"] and drift["readback"]):
            reasons.append("repair-unverified")
    if not data["curation_continues"]:
        reasons.append("curation-halted")
    if data["pin"]["rewritten_to_pass"]:
        reasons.append("pin-rewritten-to-pass")
    if any(host["recorded_scope"] != name for name, host in data["hosts"].items()):
        reasons.append("host-path-global")
    if data["static_flag"]["overwrites_status"]:
        reasons.append("static-flag-overwrote-status")
    return unique(reasons)


@check("partial-retry")
def partial_retry(data, ws):
    reasons, retry = [], data["retry"]
    if not retry["inspected_first"]:
        reasons.append("blind-retry")
    written = {step["id"] for step in data["steps"] if step["written"]}
    if written & set(retry["rewrote"]):
        reasons.append("rewrote-written-step")
    if retry["created_duplicates"]:
        reasons.append("duplicate-created")
    if not data["progress_kept"]:
        reasons.append("progress-lost")
    if any(step["reported_done"] and not step["verified"] for step in data["steps"]):
        reasons.append("unverified-reported-done")
    return unique(reasons)


@check("correction-supersession")
def correction_supersession(data, ws):
    reasons, correction = [], data["correction"]
    if correction["mode"] != "in-place":
        reasons.append("correction-as-new-page")
    if not correction["reason_kept"]:
        reasons.append("correction-reason-lost")
    if not correction["original_kept"]:
        reasons.append("original-lost")
    for source in data["sources"]:
        if source["superseded"] and source["cited_as"] == "current":
            reasons.append("superseded-cited-current")
        if source["superseded"] and source["cited_as"] == "dropped":
            reasons.append("superseded-dropped")
    if data["current_pick"] != data["authority_winner"]:
        reasons.append("recency-over-authority")
    return unique(reasons)


@check("ordinary-page-update")
def ordinary_page_update(data, ws):
    reasons = []
    if data["fields_after"] != data["fields_before"]:
        reasons.append("fields-added-to-plain-page")
    if data["new_databases"]:
        reasons.append("new-database")
    if data["revised_set"] and not data["substantive"]:
        reasons.append("revised-without-substance")
    if data["revised_selected"] and data["substantive"] and not data["revised_set"]:
        reasons.append("revised-missing")
    if data["unknown_dates_backfilled"]:
        reasons.append("date-backfilled")
    if data["unchanged_rewritten"]:
        reasons.append("unchanged-rewritten")
    return unique(reasons)


@check("concurrent-conflict")
def concurrent_conflict(data, ws):
    reasons = []
    if not data["checked_before_write"]:
        reasons.append("unchecked-before-write")
    if data["source_changed"]:
        if data["outcome"] == "merged":
            reasons.append("merged-blindly")
        if data["outcome"] == "overwrote":
            reasons.append("overwrote-concurrent")
        if data["outcome"] == "stopped" and len(set(data["versions_preserved"])) < 2:
            reasons.append("version-lost")
        if not data["reported"]:
            reasons.append("conflict-unreported")
    elif data["outcome"] == "stopped":
        reasons.append("spurious-stop")
    return unique(reasons)


@check("intake-classification")
def intake_classification(data, ws):
    reasons = []
    for item in data["inputs"]:
        kind = item["class"]
        if kind not in ("durable", "provisional", "source-only"):
            reasons.append("unclassified")
            continue
        if item["raw_kept"]:
            reasons.append("raw-chat-retained")
        if kind == "durable" and not (item["evidence_kept"] and item["attributed"]):
            reasons.append("durable-without-evidence")
        if kind == "provisional" and not item.get("promoted_on_confirmation"):
            if item["current"]:
                reasons.append("provisional-asserted-current")
            if not item.get("labelled_pending"):
                reasons.append("provisional-unlabelled")
        if kind == "source-only":
            if item["copied"]:
                reasons.append("source-only-copied")
            if item["record_revised"]:
                reasons.append("source-only-made-record")
    return unique(reasons)


@check("flagged-results")
def flagged_results(data, ws):
    reasons = []
    for item in data["items"]:
        if item["merged"]:
            reasons.append("forced-merge")
        if not item["flagged"]:
            reasons.append("unflagged")
        if item["versions_kept"] < 2:
            reasons.append("version-lost")
        if not item["owner_question"]:
            reasons.append("no-owner-question")
        if not item["reported"]:
            reasons.append("unreported")
    return unique(reasons)


@check("relation-basis")
def relation_basis(data, ws):
    reasons = []
    for relation in data["relations"]:
        if not relation["created"]:
            continue
        if not relation["meaning"]:
            reasons.append("relation-without-meaning")
        if not relation["evidence"]:
            reasons.append("relation-without-evidence")
        if not relation["attribution"]:
            reasons.append("relation-without-attribution")
        if not relation["exact_ids"]:
            reasons.append("title-match-as-relation")
    return unique(reasons)


NEEDS_ATTENTION_CLASSES = ("intake", "conflict", "review-due", "coverage", "write")


@check("needs-attention")
def needs_attention(data, ws):
    reasons = []
    for item in data["items"]:
        if item["kind"] not in NEEDS_ATTENTION_CLASSES:
            reasons.append("unknown-class")
        for field, reason in (("subject", "item-without-subject"), ("reason", "item-without-reason"),
                              ("next_action", "item-without-next-action")):
            if not item[field]:
                reasons.append(reason)
        if item["kind"] == "review-due" and not item.get("justified"):
            reasons.append("unjustified-review-due")
        if item["kind"] == "coverage" and not item.get("material"):
            reasons.append("immaterial-coverage-gap")
    if data["score"] is not None:
        reasons.append("global-score")
    if data["verdict"] is not None:
        reasons.append("health-verdict")
    if not data["checked_scope"]:
        reasons.append("scope-unstated")
    return unique(reasons)


@check("checkpoint-identity")
def checkpoint_identity(data, ws):
    reasons, retry = [], data["retry"]
    unread = [write for write in data["writes"] if not write["read_back"]]
    if unread and data["checkpoint_advanced"]:
        reasons.append("checkpoint-on-unread-write")
    if any(write["listed_as"] != "unknown-write" for write in unread):
        reasons.append("unread-write-unlisted")
    if retry["identity"] != retry["original"]:
        reasons.append("retry-new-identity")
    if retry["new_records"]:
        reasons.append("retry-duplicate-record")
    if not retry["inspected_first"]:
        reasons.append("blind-retry")
    return unique(reasons)


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
    if ids != list(range(1, 90)):
        failures.append(f"case ids are not 1..89: {ids}")
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
