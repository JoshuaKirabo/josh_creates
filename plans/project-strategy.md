# Project strategy

How the four projects get finished and presented. Started 2026-10-30. The site and resume describe each project as finished, so every claim must be true by launch. Facts come from Josh only; the rows below are the plan, not site copy.

## One main skill per project

| Project | Main skill | Kind of AI | Hard problem to feature | Number to measure |
|---|---|---|---|---|
| NextStep | AI engineering + system design | LLM pipeline: JSON-schema output, tool calls, pgvector memory | Keeping a multi-step, multi-model pipeline reliable (bad JSON, retries, latency, cost) | JSON validity rate; brain dump to plan time |
| SleekBoard | Backend + system design | Extraction from postings at scale; resume match that shows evidence | Importing a whole GitHub list: queue, retries, rate limits, duplicates, dead links | Sponsorship filter accuracy on ~50 hand-checked postings; import time |
| Style.io | Machine learning (PyTorch) | Computer vision: garment cut-outs, image embeddings, similarity search | Matching a look to your own closet; learning from turned-down outfits | Top-3 hit rate on ~30 labelled screenshots |
| LopesEat | Mobile (Swift) + API | Recommendations from health goals (to confirm) | Ranking real campus meals against goals | To decide |

The portfolio site already carries the frontend story, so the projects lean on backend, system design and AI.

## Each project ships with

1. A How it works diagram (NextStep done; the other three empty).
2. One trade-off explained.
3. One measured number (closes gap 1 in portfolio-gaps.md).
4. A working demo, and a repo with a README and a few tests.

## Order

Define every project's launch version first (in / out), then build SleekBoard (the site waits on it), then the rest.

## Interview notes

Answers from Josh, per project.

### SleekBoard

### NextStep

### Style.io

### LopesEat
