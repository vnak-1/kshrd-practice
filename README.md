# KSHRD Practice

Offline practice questions for the Korea Software HRD Center IT scholarship
written test. It is a small web app: open it on a phone, add it to the home
screen, and practise with no account and no internet.

**Live:** https://vnak-1.github.io/kshrd-practice/

On an iPhone, open that link in **Safari**, tap the Share button, then
**Add to Home Screen**. Open it from the new icon and it works offline.

## What is in it

| Section | Topics |
|---|---|
| Aptitude | logic, numbers, analytical (tables and puzzles) |
| Technical | Java, JavaScript, SQL, AI basics |

Practice is either **Learn** (the answer and the reason after each question)
or **Timed** (exam style, answers only at the end). Wrong answers go on a
mistakes list you can practise again.

Everything is saved in the browser on your own device. Nothing is sent
anywhere. There is no AI inside the app, so it keeps working forever.

## Every answer is proved by running code

A practice app with a wrong answer key is worse than no app. So no answer here
is typed from memory:

- a **Java** question is written to `Main.java`, compiled with `javac` and run;
- a **JavaScript** question is run with `node`;
- a **SQL** question is run in `sqlite3`;
- an **aptitude** question is worked out by `python3`;
- where a puzzle's answer is a word (seating, ranking, syllogisms, word codes),
  the program tries **every** possible answer and accepts one only if exactly
  one fits.

The checker also proves that **no wrong option** matches the real output, and
that the code shown on screen is the code that was run.

Sixteen bugs were planted on purpose to test these checks. All sixteen were
caught.

## Running it yourself

```bash
npm install
npm run dev
```

| Command | What it does |
|---|---|
| `npm run validate` | Checks every question file against the rules in `src/types.ts` |
| `npm run verify` | **Runs the code** in every question and checks the answer key |
| `npm test` | Unit tests |
| `npm run build` | Type-check and production build |
| `npm run check` | All of the above, in order. This must pass before anything is published |
| `npm run count` | How many questions there are, per topic and per difficulty |

`npm run verify` needs a JDK 17 (`javac` and `java`), `node`, `python3` and
`sqlite3` on your machine. The same check runs in GitHub Actions on every
push, so a bad question can never reach the live site.

## Adding your own questions

Questions are plain JSON in `src/content/questions/*.json`. Any `.json` file
in that folder is picked up automatically, so you can add a new topic file or
append to an existing one.

A question looks like this:

```json
{
  "id": "java-int-division-basic",
  "section": "technical",
  "topic": "java",
  "subtopic": "Integer division",
  "difficulty": 1,
  "kind": "output",
  "prompt": "What does this Java code print?",
  "code": {
    "lang": "java",
    "source": "int a = 7;\nint b = 2;\nSystem.out.println(a / b);"
  },
  "options": [
    { "text": "3", "correct": true, "why": "Both sides are int, so Java throws the remainder away." },
    { "text": "3.5", "correct": false, "why": "You only get 3.5 if one side is a double, e.g. 7 / 2.0." },
    { "text": "4", "correct": false, "why": "Integer division cuts the decimal off, it does not round up." }
  ],
  "hint": "Both numbers are int. What type must the answer be?",
  "verify": { "runner": "java" }
}
```

The rules, in short:

- **one** option may be `"correct": true`, and there must be 3 to 5 options;
- every option needs a `why`, including the wrong ones. A wrong `why` must
  name the **mistake that produces it** ("this divides by the new price"), not
  just say the answer is wrong;
- a code line is at most **34 characters**, and a code answer at most **29**.
  That is what fits on a 375px phone without wrapping. Wrapped code looks like
  an extra line, which is unfair in a "what does this print?" question;
- for Java you do **not** write the program. Put the top-level classes first,
  then a line `// inside main:`, then the body. The checker builds the file and
  always adds `import java.util.*;`;
- `verify.expect` may be `exception:<ClassName>` or
  `compile_error:<part of the javac message>`;
- for a fill-the-blank, put `____` in the code and the wanted output in
  `verify.output`. Every option is dropped into the gap and run.

Then run `npm run check`. It will tell you exactly what is wrong.

### Writing questions with a free Claude chat

Paste this, then paste the rules above:

> Write N multiple-choice questions about `<topic>` for the KSHRD IT
> scholarship written test, as a JSON array matching the example below.
> Rules: exactly one correct option; 3 to 5 options; every option needs a
> `why`, and a wrong option's `why` must name the mistake that produces it;
> code lines at most 34 characters and code answers at most 29; plain simple
> English, short sentences, for a reader whose first language is not English.
> Do not copy questions from any website or textbook. Write original ones.
> Output JSON only.

Then run `npm run check` on what it gives you. Do not trust the answer key
until `verify` has run the code.

## Licence

The code and the questions here are original work, written for this repo.
