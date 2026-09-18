# NextSet vs. competitors — UX gap analysis (2026-09-18)

Inputs: `competitor-ux-teardown.md` (Hevy, Strong, Boostcamp, JEFIT, Liftin'; sourced) and `nextset-current-flows.md` (read from `app/`). Verdicts are my proposal for the brainstorm, not decisions.

Legend — **Adopt**: competitors converge, NextSet lacks it, cheap in our stack. **Adapt**: pattern is right, NextSet's version needs reshaping. **Reject / Later**: not table stakes for 1.0 or conflicts with a settled decision.

## A. Core loop — logging a set

| Pattern | Competitors | NextSet today | Verdict |
|---|---|---|---|
| Previous-session shown beside inputs | Hevy, Strong, JEFIT (4/5) | Muted "60×8" column, plus auto pre-fill | **Keep**; add tap-to-copy on the previous cell (cheap) |
| Planned target on the row ("3×8 @ 60") | Boostcamp, Liftin', JEFIT for programs | None; user must remember plan | **Adopt** — templates already carry sets; add reps target to template data |
| Set-type tags (warm-up / drop / failure) | 5/5 | None | **Adapt** — warm-up tag only for 1.0; drop/failure later. Warm-up sets must be excluded from volume (finish sheet and `saveWorkoutHistory` must agree) |
| RPE / RIR per set | Boostcamp, Liftin', JEFIT (paid) | None | **Later** — optional field, hidden by default |
| Plate calculator | 5/5 | `BarLoadingStrip` under next set | **Keep** |
| Replace exercise mid-workout | Boostcamp, Hevy, Strong | Only remove + add | **Adopt** — reuse picker sheet, carry sets over |
| Supersets | Hevy, Strong, Boostcamp | None | **Later** |
| Keyboard accessory (+/− steps, Next) | Hevy, Strong (review) | Plain numeric keyboard | **Adopt** — biggest tap-count win while lifting |
| In-session PR flag | Hevy, Boostcamp, JEFIT | None | **Adopt** — compare to `workout_history` on tick; show on row + finish sheet |
| Lock inputs after tick | — | Locked | **Adapt** — allow edit after tick (untick-edit-retick is 3 taps) |

## B. Rest timer

| Pattern | Competitors | NextSet today | Verdict |
|---|---|---|---|
| Auto-start on tick | 5/5 | Yes | Keep |
| Sticky in-app banner with skip / ±15 s | 5/5 | 10-px badge inside the row | **Adopt** — bottom banner above the keyboard |
| Per-exercise rest duration | Hevy, Boostcamp, JEFIT | Global only | **Adapt** — per-exercise override in template, fall back to global |
| Sound / haptic at zero | 5/5 | None | **Adopt** |
| Lock-screen / Live Activity / notification | Hevy, Strong, Boostcamp, Liftin' | None | **Adapt** — local notification first (works on both OSes in Expo); Live Activity is a native module, post-1.0 |
| Separate interval-timer feature | none of the 5 | `/timer` screens (3 files) | **Reject** — fold into rest timer or cut; two timers behind one icon is a confusion source |

## C. Programs & setup

| Pattern | Competitors | NextSet today | Verdict |
|---|---|---|---|
| Edit routine outside a live workout | 5/5 | Only mid-workout | **Adopt** — program-detail day → editable exercise list (add/remove/reorder/sets×reps/rest) |
| Build your own routine | 5/5 | 5 fixed templates, one active | **Adopt (minimal)** — "Blank program" template + the editor above covers it |
| Empty / freeform workout | Strong, Hevy | None | **Adopt** — "Quick workout" on Home; saves to history without a program |
| Multiple saved routines | 5/5 | One active program, switch clears | **Adapt** — keep single *active*, but stop clearing the previous copy (`user_active_programs` already keyed per template) |
| Template write-back prompt at finish | Strong explicit; Boostcamp silent | Silent, live-synced via `programSync` | **Decide** (open decision 1) |
| Huge library | Boostcamp, JEFIT | 887 exercises, 5 programs | **Reject** — stay curated |

## D. Navigation & orientation

| Pattern | Competitors | NextSet today | Verdict |
|---|---|---|---|
| Persistent "workout in progress" bar / resume | Hevy, Strong | None; restored checkpoint invisible | **Adopt** — bar above tab bar when `isWorkoutActive` |
| Start workout from Programs directly | 5/5 | Programs → detail modal → Start | **Adapt** — Start on each day card in Programs tab |
| Tabs | 3–4, history usually its own tab | Home / Programs / Progress / Profile | **Adapt** — fold "History" into Progress as a list + detail; remove duplicate history on Programs tab |
| Workout as modal | Hevy/Strong minimise to bar | Modal, X hides it | Keep modal + resume bar |

## E. Finish & history

| Pattern | Competitors | NextSet today | Verdict |
|---|---|---|---|
| Summary with PRs and per-exercise recap | Hevy, JEFIT, Boostcamp | Duration · sets · volume + bodyweight/notes | **Adapt** — add PR list and exercise lines; keep the two optional fields |
| Explicit Discard | Strong, Hevy | Only via 0-set path | **Adopt** — Discard in the X/close menu with confirm |
| Workout detail view from history | 5/5 | None (tap does nothing) | **Adopt** — read-only set list from `workout_history.workout_data` |
| Per-exercise progress chart (weight / e1RM over time) | 5/5 | Aggregate volume only | **Adopt** — derive from `workout_data` JSON client-side; no schema change |
| Phase-complete celebration | JEFIT only | None | **Later** — differentiator, not usability |
| Units toggle (lb) | 5/5 | kg only | **Later** unless targeting US at launch |

## F. Onboarding

| Pattern | Competitors | NextSet today | Verdict |
|---|---|---|---|
| Sign-up before use | Strong, Hevy, Boostcamp, JEFIT | Login gate | Keep (online-only decision stands) |
| Guided first run: pick goal → program chosen for you | Hevy, Boostcamp, JEFIT | Blank Home → find Programs tab | **Adapt** — after first login, land on program picker with a "Quick workout" escape |

## Proposed scope tiers (for grilling)

**Tier 1 — friction while lifting (the core loop):** rest-timer banner + sound + notification; keyboard accessory; planned target on row; editable after tick; replace exercise; resume bar; explicit discard; in-session PR flag.

**Tier 2 — setup & orientation:** program editor outside workout; blank program; quick workout; Start from Programs tab; merge history into Progress; guided first run.

**Tier 3 — progress & polish:** per-exercise charts; workout detail view; richer finish sheet; warm-up set tag; per-exercise rest.

**Cut candidates:** standalone `/timer` feature; duplicated history list on Programs tab.

## Open decisions (owner to make)

1. Template write-back at finish: explicit prompt (Strong), silent live sync (current), or never.
2. Rest timer off-app surfacing for 1.0: local notification vs. wait for Live Activity.
3. Kill or keep the standalone interval timer.
4. Single active program stays, or allow several saved with one "current"?
5. Tabs: 4 as-is, or Home / Programs / History / Profile with progress inside History?
6. Which tier is the 1.0 bar, given mid-Oct production target?
7. Units (lb) in 1.0 or not.
