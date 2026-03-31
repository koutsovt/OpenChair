# Skill: Architecture Decision Review (gg-arch)

Use this skill when the user wants to stress-test an architecture decision, run an adversarial review, or produce a decision record before governance submission.

## What gg-arch Does

gg-arch is a thinking tool — not a coding agent. It externalises the mental simulation architects do before governance reviews. It runs a structured pipeline:

1. **Tension Extraction** — Identify competing concerns (security vs speed, cost vs quality, etc.) with severity and poles
2. **Persona Generation** — Create 3–7 calibrated reviewer personas mapped to the tensions
3. **Adversarial Review** — Each persona critiques the decision; the architect responds
4. **Decision Record Synthesis** — Produce a structured record with tensions navigated, objections addressed, tradeoffs accepted, and full reasoning trace

## Source

gg-arch lives at `../gg-framework/packages/gg-arch/`. Key references:

- `CLAUDE.md` — architecture overview, conventions, design principles
- `SPEC.md` — schemas, prompt templates, CLI structure, memory formats
- `packages/ggarch/src/schemas.ts` — Zod schemas (source of truth for all data)

## When to Use

- User says "review this architecture", "stress-test this decision", "what would a security reviewer say"
- Before submitting a TDA or architecture proposal to governance
- When comparing a new decision against past precedents
- When testing whether a narrative/framing will land with reviewers

## How to Run

```bash
# Interactive review (recommended)
cd ../gg-framework/packages/gg-arch
pnpm --filter ggarch dev -- review

# Review from file
pnpm --filter ggarch dev -- review --input ./path-to-tda.md

# Review with inline context
pnpm --filter ggarch dev -- review --context "We're choosing Supabase over Firebase for..."

# View past decisions
pnpm --filter ggarch dev -- decisions list

# Update outcome after governance meeting
pnpm --filter ggarch dev -- decisions outcome <id> --status approved --notes "TRB approved"

# View learned patterns
pnpm --filter ggarch dev -- patterns
```

## If gg-arch CLI Is Not Built

If the CLI isn't available, simulate the pipeline manually using the same structured approach:

### Step 1: Extract Tensions

Given the architecture context, identify 3–7 tensions as:
| Severity | Tension | Pole A | Pole B |
|----------|---------|--------|--------|

### Step 2: Generate Personas

For each major tension, create a reviewer persona with: name, perspective, background, likely concerns, and communication style.

### Step 3: Run Reviews

For each persona, produce a structured critique:

- **Verdict:** approve / approve_with_conditions / request_changes / reject
- **Key Concern:** single most important issue
- **Questions:** what the reviewer would ask
- **Conditions:** what must be true for approval

Present each review to the user and collect their response before proceeding to the next persona.

### Step 4: Synthesise Decision Record

After all reviews, produce:

- Decision title and date
- Summary
- Tensions navigated (with resolutions and tradeoffs accepted)
- Objections addressed (with status: resolved / accepted_risk / deferred)
- Conditions for success
- Open risks
- Reasoning trace (narrative paragraph capturing _why_, not just _what_)

## Memory

gg-arch stores data in `~/.gg-arch/`:

- `org-context.json` — organisational constants (strategy, governance, platform)
- `decisions.json` — past decisions with reasoning traces
- `patterns.json` — learned reviewer/framing/governance patterns

Always check for existing org context and past decisions to calibrate reviews.

## Key Principles

- **Decision records are the product** — the reasoning trace is what gg-arch uniquely creates
- **Structured output** — every phase produces typed data, not freeform text
- **Memory accumulates** — each session makes the next one better
- **Progressive disclosure** — don't dump everything at once, reveal phase by phase
