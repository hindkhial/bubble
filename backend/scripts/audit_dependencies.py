#!/usr/bin/env python3
"""Check Maven dependency:list output against OSV. Sends coordinates only, never application data."""
import json
import pathlib
import sys
import urllib.request


def audit(source, destination):
    packages = []
    for line in source.read_text().splitlines():
        coordinate = line.strip().split(" -- ")[0].split(":")
        if len(coordinate) >= 5 and coordinate[-1] in {"compile", "runtime", "test", "provided", "system"}:
            packages.append({"name": coordinate[0] + ":" + coordinate[1], "version": coordinate[-2], "scope": coordinate[-1]})
    if not packages:
        raise ValueError("No dependency coordinates found; run Maven dependency:list first")
    queries = [{"package": {"ecosystem": "Maven", "name": item["name"]}, "version": item["version"]} for item in packages]
    request = urllib.request.Request("https://api.osv.dev/v1/querybatch",
                                     data=json.dumps({"queries": queries}).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=45) as response:
        results = json.load(response)["results"]
    if len(results) != len(packages):
        raise ValueError("Incomplete advisory response")
    findings = [dict(item, vulnerabilities=result["vulns"]) for item, result in zip(packages, results) if result.get("vulns")]
    report = {"source": "https://api.osv.dev/v1/querybatch", "packages": len(packages), "findings": findings}
    destination.write_text(json.dumps(report, indent=2) + "\n")
    print(f"Checked {len(packages)} dependency coordinates; {len(findings)} packages with reported advisories.")
    return 1 if findings else 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 scripts/audit_dependencies.py DEPENDENCIES_FILE REPORT_FILE", file=sys.stderr)
        sys.exit(2)
    try:
        sys.exit(audit(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])))
    except (OSError, ValueError, KeyError) as error:
        print(f"Advisory check unavailable ({type(error).__name__}); no clean result claimed.", file=sys.stderr)
        sys.exit(2)
