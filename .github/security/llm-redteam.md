# Periodic LLM red-team (PyRIT) — staging only

Pensieve’s writer/critic/repurpose surfaces already use XML field tags,
`sanitizeSearchText`, and `injectionPatterns`. Still run an adversarial pass
before major releases — static CI (Semgrep / TruffleHog / Trivy) does not
exercise live model behavior.

## What to use
- [Microsoft PyRIT](https://github.com/Azure/PyRIT) — jailbreak / prompt-injection
  suites against your own staging API.

## Rules
1. Target **staging only** (never production). Prefer a throwaway Clerk user.
2. Cap concurrency and rate; respect `contentRateLimit` / `authJobRateLimit`.
3. Focus scenarios: topic/brand-voice injection, repurpose URL content as
   instructions, critic-feedback injection, SSRF via feed-monitor / article URL.
4. Record date + outcome in `CHANGELOG.md` (pass/fail + any fixes).

## Minimal local loop
```bash
# Install PyRIT in a throwaway venv (see upstream README for current pin).
python -m venv .venv-pyrit && source .venv-pyrit/bin/activate
pip install pyrit

# Point attacks at staging Create / repurpose / ideate endpoints with a test JWT.
# Keep payloads and transcripts out of git — they can contain prompt-injection text.
```

Optional live URL smoke (known CVE templates only, still staging):
```bash
# nucleI — replace with your staging origin
nuclei -u https://YOUR-STAGING-HOST -severity critical,high -o /tmp/nuclei-staging.txt
```

Do **not** add PyRIT or Nuclei to every-PR CI — cost, flakiness, and attack
noise make them release gates, not merge gates.
