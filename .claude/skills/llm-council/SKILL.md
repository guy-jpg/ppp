---
name: llm-council
description: >-
  Convene a council of five expert advisors to deliberate on a decision,
  plan, trade-off, or strategic question. Each advisor analyzes the question
  independently and in parallel from a distinct perspective, then a chairman
  synthesizes their views into a single recommendation. Use this whenever the
  user says "ask the council", "convene the council", runs /llm-council, or
  otherwise wants multiple expert viewpoints weighed against each other before
  committing to a decision.
---

# LLM Council

Convene a council of five advisors to deliberate on the user's decision and
deliver a synthesized recommendation. The five advisors run **in parallel** as
independent subagents — none of them sees the others' answers — and then you,
acting as **Chairman**, weigh their input and deliver the verdict.

## When to use this skill

Trigger on any of:

- "ask the council ..." / "convene the council ..."
- `/llm-council <decision>`
- The user explicitly asks for multiple expert perspectives, a structured
  deliberation, or a "red team / blue team" style analysis of a choice.

If the decision is ambiguous or missing, ask the user one short clarifying
question before convening (e.g. what they're deciding, the options on the
table, and any hard constraints). Do not convene the council on a vague prompt.

## How it works

1. **Frame the question.** Restate the user's decision in one or two precise
   sentences. Identify the concrete options being weighed and any stated
   constraints (budget, timeline, risk tolerance, reversibility). If the user
   gave only a topic and no options, infer 2–4 reasonable options and state
   that you're doing so.

2. **Convene the council — in parallel.** Launch **five** subagents in a
   **single message** (multiple Agent tool calls in one turn) so they run
   concurrently. Give each advisor:
   - the framed question and options,
   - all relevant constraints and context,
   - their specific role brief (below),
   - the required output format (below).

   Each advisor works **independently** and does not see the others' output.

3. **Synthesize as Chairman.** Once all five return, you (the main agent) act
   as Chairman: read every advisor's verdict, find the agreements and the real
   disagreements, resolve conflicts on the merits, and deliver one clear
   recommendation. Do not merely average the votes — weigh the strength of the
   arguments.

## The five advisors

Launch one subagent per advisor. Each is a focused lens; together they cover
the decision space.

1. **The Visionary** — argues for the upside and the ambitious path. What does
   the best-case outcome look like? What opportunity is lost by playing it
   safe? Where is the asymmetric upside?

2. **The Skeptic (Red Team)** — actively tries to kill the idea. What are the
   failure modes, hidden costs, second-order effects, and ways this goes
   wrong? What is the strongest case *against* the most attractive option?

3. **The Pragmatist (Operator)** — focuses on execution and feasibility. Can
   this actually be done with the available time, money, people, and skill?
   What's the simplest version that works? What breaks first in practice?

4. **The Strategist** — takes the long view. How does each option look in 1–5
   years? Does it build or burn optionality? What are the compounding effects,
   lock-in, and reversibility of each path?

5. **The Advocate** — represents the people affected (users, customers,
   teammates, stakeholders). Who bears the cost and who gets the benefit? What
   are the ethical, trust, and human consequences of each option?

## Advisor output format (instruct each subagent to return exactly this)

```
## <Advisor name>

**Recommendation:** <one of the options, or a clear stance>
**Confidence:** <low | medium | high>

**Reasoning:**
- <2–5 concise bullets from this advisor's perspective>

**Key risk / caveat:** <the single thing this advisor most wants flagged>
```

Keep each advisor's response tight — analysis over prose.

## Chairman's synthesis (your final output to the user)

After all advisors return, present:

```
# Council Verdict: <the decision>

**Recommendation:** <your single clear recommendation>
**Confidence:** <low | medium | high>

## Where the council agreed
- <points of consensus>

## Where the council disagreed
- <the real tensions, and how you resolved each on the merits>

## The council, in brief
| Advisor | Recommends | Confidence | Key point |
|---|---|---|---|
| Visionary | ... | ... | ... |
| Skeptic | ... | ... | ... |
| Pragmatist | ... | ... | ... |
| Strategist | ... | ... | ... |
| Advocate | ... | ... | ... |

## What to do next
1. <concrete first step>
2. <next step>
3. <what to watch / what would change the recommendation>
```

Be decisive. The user came for an answer, not a tie. State the recommendation
plainly, acknowledge the strongest dissent, and give them the next action.
