"""Keep optional helper outputs outside the immutable OSM package."""
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[3]


def external_path(value, label):
    candidate = Path(value).expanduser()
    if not candidate.is_absolute():
        raise ValueError(f"{label} must be an absolute external path")
    candidate = candidate.resolve()
    if candidate.is_relative_to(PACKAGE_ROOT) or PACKAGE_ROOT.is_relative_to(candidate):
        raise ValueError(f"{label} must not overlap the immutable skill package")
    return candidate


def contained_output(root, candidate):
    candidate = Path(candidate).resolve()
    if not candidate.is_relative_to(root):
        raise ValueError("Output resolves outside its selected work directory")
    return external_path(candidate, "Output")
