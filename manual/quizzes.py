#!/usr/bin/env python3
"""The handbook's official quizzes — the question bank's build check (handbook app HB3.1).

The bank is data/quizzes.json, written here in the repo beside the sections it
tests, so a quiz changes in the same commit as its section:

    {"quizzes": [
      {"id": "q-oxygen-basics", "title": "Oxygen basics", "section": "§8-2",
       "passPct": 80,
       "questions": [
         {"type": "single", "q": "…?", "options": ["…", "…"], "correct": 1,
          "explain": "Why — shown when this question is answered wrongly.",
          "section": "§8-2.3"},
         {"type": "multi", "q": "…? (choose all that apply)", "options": [...],
          "correct": [0, 2], "explain": "…", "section": "§8-4"},
         {"type": "truefalse", "q": "…", "correct": 0, "explain": "…",
          "section": "§8-5"}]}]}

`type` is single (the default — `correct` one option index), multi (`correct`
every right index; all of them and nothing else is right) or truefalse (the
options are True and False, `correct` 0 or 1). `section` is a section token as
the chapters write it, on the quiz (the section or chapter it is attached to)
and on EVERY question (where a wrong answer sends the reader back to).

export_reference.py calls check() with its section index: a section that does
not resolve, or any other problem below, FAILS the export like a broken
cross-reference — nothing is written. The checked quizzes ride manual.json as
`quizzes`, each section resolved to the app's {id, anchor}, and Team Tools'
Import stores them (kbImportManual, the ManualQuizzes tab), checking them again
with the app's own quiz engine (quizValidate_ in web-app/80_training.js).

The limits below MIRROR web-app/00_config.js — the Node harness pins them equal.
Standard library only. `--check` runs the built-in self-test (CI does).
"""
import json
import re
import sys

MAX_QUESTIONS = 50       # TRAIN_QUIZ_MAX_QUESTIONS
MAX_OPTIONS = 6          # TRAIN_QUIZ_MAX_OPTIONS
TEXT_MAX = 500           # QUIZ_TEXT_MAX
OPTION_MAX = 200         # QUIZ_OPTION_MAX
TITLE_MAX = 120          # QUIZ_TITLE_MAX
EXPLAIN_MAX = 600        # QUIZ_EXPLAIN_MAX
QUIZ_JSON_MAX = 45000    # TRAIN_QUIZ_JSON_MAX — one stored quiz, one cell
TYPES = ("single", "multi", "truefalse")    # QUIZ_TYPES
TF_OPTIONS = ["True", "False"]              # QUIZ_TF_OPTIONS
ID_RE = re.compile(r"^q-[a-z0-9]+(?:-[a-z0-9]+)*$")   # KB_MANUAL_QUIZ_ID_RE
ID_MAX = 48


def _text(v):
    return v.strip() if isinstance(v, str) else ""


def _int(v):
    return v if isinstance(v, int) and not isinstance(v, bool) else None


def check(bank, resolve):
    """bank — the parsed quizzes.json; resolve(token) — a section token to
    {id, anchor, num}, or None. Returns (quizzes, errors): the export shape,
    and every problem found (each names the quiz and question)."""
    errors, out, seen = [], [], set()
    if not isinstance(bank, dict) or not isinstance(bank.get("quizzes"), list):
        return [], ["quizzes.json: expected {\"quizzes\": [...]}"]
    for qi, qz in enumerate(bank["quizzes"]):
        if not isinstance(qz, dict):
            errors.append(f"quiz {qi + 1}: not an object")
            continue
        qid = _text(qz.get("id"))
        where = f"quiz {qid or qi + 1}"
        if not ID_RE.match(qid) or len(qid) > ID_MAX:
            errors.append(f"{where}: id must look like q-oxygen-basics (lowercase, hyphens, {ID_MAX} at most)")
        elif qid in seen:
            errors.append(f"{where}: id used twice")
        seen.add(qid)
        title = _text(qz.get("title"))
        if not title or len(title) > TITLE_MAX:
            errors.append(f"{where}: a title is required ({TITLE_MAX} characters at most)")
        pass_pct = _int(qz.get("passPct"))
        if pass_pct is None or not 0 <= pass_pct <= 100:
            errors.append(f"{where}: passPct must be a whole number 0–100")
        home = resolve(_text(qz.get("section")))
        if not home:
            errors.append(f"{where}: section {qz.get('section')!r} is not a section of the handbook")
        qs = qz.get("questions")
        if not isinstance(qs, list) or not 1 <= len(qs) <= MAX_QUESTIONS:
            errors.append(f"{where}: needs 1–{MAX_QUESTIONS} questions")
            continue
        questions = []
        for i, q in enumerate(qs):
            w = f"{where}, question {i + 1}"
            if not isinstance(q, dict):
                errors.append(f"{w}: not an object")
                continue
            typ = q.get("type", "single")
            if typ not in TYPES:
                errors.append(f"{w}: type must be one of {', '.join(TYPES)}")
                continue
            text = _text(q.get("q"))
            if not text or len(text) > TEXT_MAX:
                errors.append(f"{w}: the question text is required ({TEXT_MAX} characters at most)")
            if typ == "truefalse":
                opts = q.get("options", TF_OPTIONS)
                if opts != TF_OPTIONS:
                    errors.append(f"{w}: a true/false question's options are True and False (or leave them out)")
                opts = list(TF_OPTIONS)
            else:
                opts = q.get("options")
                if not isinstance(opts, list) or not 2 <= len(opts) <= MAX_OPTIONS:
                    errors.append(f"{w}: needs 2–{MAX_OPTIONS} options")
                    continue
                if any(not _text(o) or len(_text(o)) > OPTION_MAX for o in opts):
                    errors.append(f"{w}: every option needs text ({OPTION_MAX} characters at most)")
                opts = [_text(o) for o in opts]
                if len(set(o.lower() for o in opts)) != len(opts):
                    errors.append(f"{w}: two options read the same")
            corr = q.get("correct")
            if typ == "multi":
                ok = (isinstance(corr, list) and corr and all(_int(c) is not None and 0 <= c < len(opts) for c in corr)
                      and len(set(corr)) == len(corr))
                if not ok:
                    errors.append(f"{w}: correct must list the right option numbers (from 0), each once")
                    continue
                corr = sorted(corr)
            elif _int(corr) is None or not 0 <= corr < len(opts):
                errors.append(f"{w}: correct must be the right option's number (from 0)")
                continue
            explain = _text(q.get("explain"))
            if not explain:
                errors.append(f"{w}: an explanation is required — it is what a wrong answer is shown")
            elif len(explain) > EXPLAIN_MAX:
                errors.append(f"{w}: the explanation is longer than {EXPLAIN_MAX} characters")
            target = resolve(_text(q.get("section")))
            if not target:
                errors.append(f"{w}: section {q.get('section')!r} is not a section of the handbook")
                continue
            questions.append({"type": typ, "q": text, "options": opts, "correct": corr, "explain": explain,
                              "section": target["id"], "anchor": target["anchor"], "num": target["num"]})
        if home and title and pass_pct is not None:
            quiz = {"id": qid, "title": title, "section": home["id"], "anchor": home["anchor"], "num": home["num"],
                    "passPct": pass_pct, "questions": questions}
            if len(json.dumps(questions, ensure_ascii=False)) > QUIZ_JSON_MAX:
                errors.append(f"{where}: its questions are too large to store ({QUIZ_JSON_MAX:,} characters)")
            out.append(quiz)
    return out, errors


# ----------------------------------------------------------------- self-test ---
def _selftest():
    secs = {"§8-2": {"id": "man-8-2", "anchor": "", "num": "8.2"},
            "§8-2.3": {"id": "man-8-2", "anchor": "8.2.3", "num": "8.2.3"},
            "§8-4": {"id": "man-8-4", "anchor": "", "num": "8.4"}}
    resolve = secs.get

    def q(**kw):
        base = {"q": "Which?", "options": ["a", "b", "c"], "correct": 1, "explain": "Because.", "section": "§8-2.3"}
        base.update(kw)
        return base

    def quiz(*questions, **kw):
        base = {"id": "q-oxygen", "title": "Oxygen", "section": "§8-2", "passPct": 80, "questions": list(questions)}
        base.update(kw)
        return {"quizzes": [base]}

    fails = []

    def expect(bank, needle, label):
        _, errs = check(bank, resolve)
        if needle is None:
            if errs:
                fails.append(f"{label}: expected no errors, got {errs}")
        elif not any(needle in e for e in errs):
            fails.append(f"{label}: expected an error containing {needle!r}, got {errs}")

    good = quiz(q(), q(type="multi", correct=[2, 0], section="§8-4"), q(type="truefalse", options=None, correct=0))
    good["quizzes"][0]["questions"][2].pop("options")
    out, errs = check(good, resolve)
    if errs or len(out) != 1:
        fails.append(f"good bank: {errs}")
    else:
        qs = out[0]["questions"]
        if (out[0]["section"], out[0]["anchor"]) != ("man-8-2", ""):
            fails.append("the quiz's section resolves to the app's id")
        if (qs[0]["section"], qs[0]["anchor"], qs[0]["num"]) != ("man-8-2", "8.2.3", "8.2.3"):
            fails.append("a question's section resolves to its anchor")
        if qs[1]["correct"] != [0, 2]:
            fails.append("multi correct is sorted")
        if qs[2]["options"] != TF_OPTIONS:
            fails.append("true/false options are filled in")
    expect({"quizzes": []}, None, "an empty bank")
    expect({}, "expected {", "not a bank")
    expect(quiz(q(), id="Oxygen Quiz"), "id must look like", "a bad id")
    expect({"quizzes": quiz(q())["quizzes"] * 2}, "id used twice", "a duplicate id")
    expect(quiz(q(), section="§9-9"), "'§9-9' is not a section", "a quiz on a missing section")
    expect(quiz(q(section="§8-9.9")), "'§8-9.9' is not a section", "a question on a missing section")
    expect(quiz(q(section="")), "is not a section", "a question with no section")
    expect(quiz(q(explain="")), "an explanation is required", "no explanation")
    expect(quiz(q(explain="x" * (EXPLAIN_MAX + 1))), "longer than", "a long explanation")
    expect(quiz(q(correct=3)), "correct must be the right option", "correct out of range")
    expect(quiz(q(correct=True)), "correct must be the right option", "a boolean is not an index")
    expect(quiz(q(type="multi", correct=[1, 1])), "each once", "a repeated multi answer")
    expect(quiz(q(type="multi", correct=[])), "each once", "no multi answer")
    expect(quiz(q(type="truefalse", options=["Yes", "No"])), "True and False", "true/false options")
    expect(quiz(q(type="essay")), "type must be one of", "an unknown type")
    expect(quiz(q(options=["a"])), "needs 2–", "one option")
    expect(quiz(q(options=["a", "A"])), "two options read the same", "duplicate options")
    expect(quiz(q(), passPct=101), "passPct", "a pass mark over 100")
    expect(quiz(q(), passPct="80"), "passPct", "a pass mark as text")
    expect(quiz(*[q()] * (MAX_QUESTIONS + 1)), "needs 1–", "too many questions")
    expect(quiz(q(q="")), "question text is required", "no question text")
    if fails:
        print("quizzes.py self-test FAILED:")
        for f in fails:
            print("  ✗", f)
        return 1
    print("quizzes.py self-test: ok (the good bank, and 20 refusals)")
    return 0


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--check":
        sys.exit(_selftest())
    sys.stderr.write("usage: quizzes.py --check   (export_reference.py runs check() on data/quizzes.json)\n")
    sys.exit(2)
