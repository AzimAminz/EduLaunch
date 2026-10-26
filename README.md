<div align="center">

<img src="docs/design/brand/edulaunch-logo.svg" width="88" alt="EduLaunch logo" />

# EduLaunch

**Know what you can study, find what suits you, and see how to get there.**

An education and career planning platform for students in Malaysia, in Bahasa Melayu and English.

<img src="docs/design/brand/edulaunch-campus-world.png" width="720" alt="Rimau, the EduLaunch tiger mascot, standing on an open book with paths leading to a university, science, technology and design" />

[What it does](#what-edulaunch-does) · [How it works](#how-a-recommendation-is-made) · [Get started](docs/setup.md) · [Documentation](docs/README.md)

</div>

---

## Why EduLaunch?

Choosing what to study after school is a big decision, and the information is spread across many university websites, booklets and announcements. Students often ask the same three questions:

1. **What can I study with my results?**
2. **What actually suits me?**
3. **How do I get there from where I am now?**

EduLaunch answers all three in one place. It uses official information, explains every suggestion in plain words, and never leaves a student at a dead end.

---

## Who it is for

<table>
<tr>
<td width="56" valign="top"><img src="docs/design/icons/graduation-cap.svg" width="40" alt="" /></td>
<td><b>Students</b><br />From Form 1 to after Diploma. Add your results, take a short interest quiz, and get a personal list of programmes with the reasons behind each one.</td>
</tr>
<tr>
<td width="56" valign="top"><img src="docs/design/icons/shield-check.svg" width="40" alt="" /></td>
<td><b>Admins</b><br />The people who keep the information correct: universities, programmes and entry requirements. Every change is checked by a second admin before students see it.</td>
</tr>
</table>

---

## What EduLaunch does

*Some features below are still being built. See [Project status](#project-status).*

### For students

<table>
<tr>
<td width="56" valign="top"><img src="docs/design/icons/sparkles.svg" width="40" alt="" /></td>
<td><b>Personal recommendations</b><br />A short list of programmes that match your results <i>and</i> your interests, each with clear reasons such as <i>"Physics A — the minimum is B"</i>.</td>
</tr>
<tr>
<td width="56" valign="top"><img src="docs/design/icons/gauge.svg" width="40" alt="" /></td>
<td><b>Chance of getting an offer</b><br />A simple High / Medium / Low estimate based on past years, and an honest <i>"No data yet"</i> when there is not enough information.</td>
</tr>
<tr>
<td width="56" valign="top"><img src="docs/design/icons/file-scan.svg" width="40" alt="" /></td>
<td><b>Upload your result slip</b><br />EduLaunch reads it for you. You only fix the few lines it is unsure about.</td>
</tr>
<tr>
<td width="56" valign="top"><img src="docs/design/icons/route.svg" width="40" alt="" /></td>
<td><b>A plan for every stage of school</b><br /><b>Form 1–3:</b> which Form 4 stream suits you and what it leads to. <b>Form 4–5:</b> target grades and what they open up. <b>After SPM, STPM or Foundation:</b> programmes you qualify for now. <b>After Diploma:</b> start working, continue to a degree, or both.</td>
</tr>
<tr>
<td width="56" valign="top"><img src="docs/design/icons/signpost.svg" width="40" alt="" /></td>
<td><b>Never a dead end</b><br />If you do not qualify yet, you see other ways forward: a certificate you can apply for now, a step-by-step route upwards, or the one grade that would open the most doors.</td>
</tr>
<tr>
<td width="56" valign="top"><img src="docs/design/icons/message-circle-question.svg" width="40" alt="" /></td>
<td><b>Ask questions</b><br />Answers come only from official sources, with the source shown. No daily limit for normal use.</td>
</tr>
<tr>
<td width="56" valign="top"><img src="docs/design/icons/bell.svg" width="40" alt="" /></td>
<td><b>Stay up to date</b><br />Get a notification when the requirements for a programme you saved change.</td>
</tr>
</table>

### For admins

<table>
<tr>
<td width="56" valign="top"><img src="docs/design/icons/compass.svg" width="40" alt="" /></td>
<td><b>Easy to learn without a manual</b><br />The home screen asks <i>"What do you want to do today?"</i> and guides you step by step.</td>
</tr>
<tr>
<td width="56" valign="top"><img src="docs/design/icons/pencil-line.svg" width="40" alt="" /></td>
<td><b>Write rules like sentences</b><br />For example <i>"Students need at least B in Mathematics"</i>, with no codes or formulas.</td>
</tr>
<tr>
<td width="56" valign="top"><img src="docs/design/icons/flask-conical.svg" width="40" alt="" /></td>
<td><b>Practice mode</b><br />Try real tasks on sample data without affecting students.</td>
</tr>
<tr>
<td width="56" valign="top"><img src="docs/design/icons/users.svg" width="40" alt="" /></td>
<td><b>Two people check every change</b><br />The admin who prepares a change cannot approve it; another admin does.</td>
</tr>
</table>

---

## How a recommendation is made

EduLaunch works in two simple steps: **check, then rank.**

**1. Check your results against the official entry requirements.**
Each programme is marked *Eligible*, *Almost eligible* (one small gap) or *Not yet*.

**2. Rank what is left by how well it fits you.**

| What counts | How much | Where it comes from |
|---|---|---|
| Your interests | 45% | The interest quiz and the activities you enjoyed |
| Your results | 30% | Grades in the subjects that matter for that field |
| Your chance of an offer | 15% | Your merit compared with past offers |
| What you have shown interest in | 10% | Programmes you saved or compared |

Every card explains *why* it was suggested, and the list updates by itself when your results, your interests or the official requirements change.

---

## Keeping information correct

- Only **official sources** are used: university and government websites and booklets.
- EduLaunch checks those sources every week and **skips pages that have not changed**.
- When something changes, the system prepares a draft, but **only admins publish it**, and a second admin must approve.
- Every requirement keeps **the exact sentence it came from**, so anyone can check it.
- Results read from a slip are **always confirmed by the student** before they are used.

EduLaunch does not submit applications, does not guarantee offers, and does not replace official portals or university decisions.

---

## How it is built, in plain words

EduLaunch is split into a few small parts. Each part does one job, so the team can work on them separately and one problem does not stop everything.

| Part | Its job |
|---|---|
| **Website** | What students and admins see and use |
| **Front door** | Checks who you are and sends each request to the right part |
| **Programme catalogue** | Universities, programmes, entry requirements and careers |
| **Student profile** | Your results, interests, saved programmes and plans |
| **Recommendations** | Checks eligibility, ranks programmes and estimates offer chances |
| **Help and updates** | Support requests and notifications |
| **Official content** | Watches official websites for changes and prepares drafts for admins |

Behind the scenes, the parts pass news to each other ("these requirements changed"), so everything stays up to date without anyone waiting.

<details>
<summary>Technologies used</summary>

| Area | Tools |
|---|---|
| Website | Next.js, React, Tailwind CSS |
| Back end | NestJS (TypeScript), FastAPI (Python) |
| Database and sign-in | Supabase (PostgreSQL) |
| Messages between parts | RabbitMQ |
| Fast temporary storage | Redis |
| Running it on your computer | Docker |

The technical overview is in [docs/architecture.md](docs/architecture.md).
</details>

---

## Get started

Want to run EduLaunch on your own computer? Follow the step-by-step guide:

<a href="docs/setup.md"><img src="docs/design/icons/arrow-right.svg" width="32" alt="" align="middle" /></a> &nbsp; <a href="docs/setup.md"><b>Open the setup guide</b></a>

It takes one command once the free tools are installed.

---

## Documentation

| Read this | If you want to |
|---|---|
| [Plain-language guide](docs/edulaunch-guide.md) | Understand the whole system through real student and admin stories |
| [Setup guide](docs/setup.md) | Run EduLaunch on your computer |
| [Working together](CONTRIBUTING.md) | Know how the team shares and reviews work |
| [System design](docs/system-design.md) | See the modules, data and security in detail |
| [AI and cost plan](docs/ai-and-cost-plan.md) | Learn how recommendations, predictions and costs work |
| [Roadmap](docs/roadmap.md) | See what is planned and when |

---

## Project status

<img src="docs/design/icons/hammer.svg" width="28" alt="" align="middle" /> &nbsp; **In development.** This is a university final-year project. The foundation is in place: the database, sign-in, and the parts that check eligibility and rank programmes. Screens and real programme data are being added next. See the [roadmap](docs/roadmap.md).
