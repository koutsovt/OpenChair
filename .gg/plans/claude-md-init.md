# Plan: Generate CLAUDE.md for OpenChair

## Context

- Empty repo — no existing code, no package.json, no README
- Project details come from user's brief: OpenChair is an open-source, AI-native salon OS
- Tech stack decided: Next.js 14, Supabase, Prisma, Anthropic SDK, gg-framework
- Key features: booking, client cards, colour formula builder, SMS reminders, revenue summary, Stripe billing, WhatsApp booking, virtual hairstyle try-on (HairFastGAN via Replicate)
- Parent ../CLAUDE.md has behavioral directives (KISS, YAGNI, delegate, zero tolerance) — project CLAUDE.md should complement, not duplicate

## Decision

Since the repo is empty, sub-agent analysis would yield nothing. Skip parallel analysis — go straight to generating a CLAUDE.md that establishes the project foundation, structure conventions, and quality gates for when code starts landing.

## Steps

1. Create CLAUDE.md at project root with: project description, planned tech stack, directory structure conventions, file organization rules, code quality checks (lint/typecheck/test commands for Next.js + Prisma), and zero-tolerance policy — all under 100 lines
