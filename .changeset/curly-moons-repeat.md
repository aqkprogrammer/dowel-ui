---
"@dowel-ui/cli": patch
---

Report the real version. `dowel --version` printed a hardcoded `0.1.0` that had
drifted from the published `0.2.0`; it is now read from the package manifest at
runtime, so it cannot fall out of step with a release again.
