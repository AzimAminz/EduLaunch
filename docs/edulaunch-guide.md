# EduLaunch — A Plain-Language Guide

This guide explains what EduLaunch does and how it behaves in real situations. It is written for anyone: supervisors, testers, students and new team members. For technical detail, see [system-design.md](system-design.md) and [ai-and-cost-plan.md](ai-and-cost-plan.md).

---

## 1. EduLaunch in one minute

EduLaunch helps Malaysian students answer three questions:

1. **What can I study with my results?**
2. **What suits my interests?**
3. **How do I get there from where I am now?**

A student adds their results, takes a short interest test, and gets a short list of programmes. Each programme comes with the reasons it was suggested, whether the student qualifies, and an estimate of the chance of an offer. If the student does not qualify yet, EduLaunch shows other ways to get there instead of a dead end.

It works on the web and on mobile, with the same account.

---

## 2. Who uses it

| Who | What they do |
|---|---|
| **Student** | Adds results, takes the interest test, explores programmes, sees recommendations, plans a study path, asks questions. |
| **Admin** | Keeps the information correct: universities, programmes, entry requirements, merit formulas and official sources. Answers support tickets. |

There are no parent, guardian or counsellor accounts. Students under 18 tick a box to confirm a parent or guardian agreed before they upload documents.

---

## 3. How a recommendation is made

Think of it as two steps: **filter, then rank.**

**Step 1 — Filter by results.** EduLaunch checks the student's results against each programme's official entry requirements.
- *Eligible:* meets every requirement.
- *Almost eligible:* misses just one requirement, by a small gap.
- *Not yet eligible:* not suggested as a programme, but used to plan other routes (see section 4).

**Step 2 — Rank by fit.** Each remaining programme gets a score out of 100:

| What counts | Weight | Where it comes from |
|---|---|---|
| Interest fit | 45% | The interest test (and how much the student enjoyed the activities they tried) |
| Academic strength | 30% | Grades in the subjects that matter for that field |
| Offer chance | 15% | The student's merit compared with past offers |
| What the student showed interest in | 10% | Programmes they saved, compared or searched for |

Every card says **why** it was suggested, in plain words, for example: "Physics A — the minimum is B" or "Your interests match Engineering."

The list updates by itself whenever results, interests or official requirements change.

---

## 4. When a student does not qualify yet

EduLaunch never shows an empty page and never pushes students to apply where the minimum requirements are clearly not met. Instead it shows four kinds of help:

1. **Apply now** — programmes at a lower level the student already qualifies for, such as a certificate at a community college or a skills (SKM) programme.
2. **Stepping stone** — a path upwards, such as Certificate → Diploma → Degree, in a field that suits their interests.
3. **Improve a result** — the one subject that would open the most doors: "If Mathematics goes from D to C, 14 more programmes open."
4. **Almost eligible** — programmes that miss one requirement, with the exact gap.

Official routes that allow a try, such as interviews or APEL for adult learners, are labelled "You can try — subject to the institution's decision."

The tone is always supportive: *"Not yet eligible for this diploma — here are three ways to get there."*

---

## 5. Scenarios — students

### Scenario 1: Aiman, Form 2, does not know what he likes
- Aiman signs up and chooses **Form 1–3**.
- He takes the interest test and tries two short activities (a logic puzzle and a design task).
- He can add his school exam grades if he wants. They are optional.
- His roadmap opens with **"Which stream suits you?"**: Pure Science 86/100, Technical STEM 78, Social Science/Arts 55, Vocational College 52.
- Each stream shows why, for example "Science A and Mathematics A — core subjects of this stream" and "You rated the circuit activity 5/5".
- The score is 50% interests, 40% strength in the stream's key school subjects and 10% activities he enjoyed.
- He taps "What if I choose Arts?" and sees that Medicine and Engineering become harder to reach, while Law and Economics stay open.
- Below that is the path for Pure Science: Form 4–5 → SPM target grades → Foundation/Matriculation/Diploma → fields → example careers.
- It does not suggest university programmes yet, and it does not calculate merit. Merit Lab and eligibility checks stay hidden until Form 4. The suggestion is for discussion with his school, not an official decision.

### Scenario 2: Nurul, Form 5, before SPM
- Nurul enters her SPM subjects with **current grades** (from school tests) and **target grades**.
- She removes Moral (she takes Islamic Education) and adds Additional Mathematics from the subject list.
- Recommendations and offer chances are labelled **"based on targets"**.
- Merit Lab shows what her merit would be if she reaches her targets.
- When SPM results are announced, EduLaunch asks: "Have you received your SPM results?" Her targets are kept as history so she can compare.

### Scenario 3: Hafiz, after SPM, good results
- Hafiz uploads a photo of his result slip.
- EduLaunch reads it and fills in all nine subjects. Seven are marked **confident**. Two are highlighted: one grade was blurry, and one subject name was shortened on the slip.
- He fixes only those two rows and confirms. Nothing is saved until he confirms.
- The dashboard shows **"Top recommendation for you"**: Foundation in Engineering — Eligible — High offer chance — with three reasons.
- He saves two programmes and compares them side by side.

### Scenario 4: Danial, after SPM, weak Mathematics
- Danial's results do not meet most diploma requirements. He has a D in Mathematics.
- EduLaunch switches to **alternative pathways**:
  - *Apply now:* a Certificate in Graphic Design at a community college, which matches his creative interests.
  - *Stepping stone:* Certificate → Diploma in Graphic Design, with the CGPA needed.
  - *Improve a result:* "A C in Mathematics opens 14 more programmes", with information on resitting.
  - *Almost eligible:* Diploma in Multimedia, which needs a credit in Mathematics.
- He builds a roadmap from the certificate path and saves it.

### Scenario 5: Siti, after Diploma, wants a degree
- Siti chooses **after Diploma**, picks her institution and field from searchable lists, and enters her CGPA and MUET band.
- Degrees in **related fields** appear first (Computer Science, Software Engineering, Information Systems).
- Credit transfer and entry into a later semester are shown as **estimates**, because the university decides.
- A degree in an unrelated field can still be explored, labelled "unrelated field".
- Her roadmap asks **"Work first or continue studying?"** and shows three routes:
  - *A. Work now:* careers that usually accept a Diploma in her field, such as junior web developer or IT support technician, sorted by her interests.
  - *B. Degree:* careers that usually need a degree, such as software engineer or data scientist, each next to a degree she is eligible for.
  - *C. Work first, study later:* part-time or distance learning.
- Careers are options to explore, not a job guarantee. Salaries appear only when there is an official source.

### Scenario 6: Hafiz again — requirements change
- A university updates its prospectus. The weekly check finds the change, an admin approves it, and Hafiz gets a notification: "Requirements for Diploma in Computer Science have changed."
- His recommendations are recalculated automatically.

### Scenario 7: Nurul asks a question
- Nurul asks: "Does the Foundation in Science at University A accept Biology instead of Chemistry?"
- EduLaunch answers using **only official sources** and shows where the answer came from.
- If no source covers the question, it says so and suggests contacting the university. It does not guess.
- Asking questions is free and has **no daily limit**. If many people are asking at once, the student may see "AI is busy — please try again shortly".

### Scenario 8: A student wants their data removed
- From Privacy & settings, the student can download their data or delete their account.
- Deleting removes their results, uploaded files and history.

---

## 6. Scenarios — admins

Most admins are not IT staff, so the admin console is built to be learned without a manual:
- The home screen asks **"What do you want to do today?"** and starts each task as numbered steps.
- Rules are written as sentences, for example "Students need at least B in Mathematics", not as code or AND/OR logic.
- Every screen has a **Help for this screen** panel. Unfamiliar terms are underlined and explained on tap.
- **Practice mode** lets a new admin try real tasks on sample data. Nothing is saved or shown to students.
- Big actions show who will be affected before anything is published, and changes can be undone.

### A new admin's first day
- Aina logs in for the first time. A short tour shows her the home screen and the task inbox.
- She switches on **Practice mode** and completes two missions: approving a simple draft and returning one with a reason.
- She switches practice mode off, opens a real draft from the home screen, and follows the on-screen steps. She never opens a manual.

### Scenario 9: The weekly content update
- Every week, EduLaunch checks the list of official university pages.
- Pages that have not changed are skipped.
- For a changed page, AI prepares a **draft** of the new requirements, with the exact sentence each value came from.
- Admin Aina opens the draft and sees the old version, the new version and the source quote side by side.
- Aina **cannot approve her own draft**. A different admin reviews it and publishes it, or sends it back with a reason.

### Scenario 10: A student reports wrong data
- A student taps "Report wrong data" on a programme page.
- A ticket opens, linked to that programme.
- An admin checks the official source, fixes the record as a new draft, and another admin approves it.
- The student is told when the ticket is closed.

### Scenario 11: Adding past admission data
- An admin enters last year's lowest and average merit for a programme, with the official source.
- Offer-chance estimates for that programme become available.
- Where no data exists, students see "No data yet" instead of a guess.

### Scenario 12: Adding a pathway
- An admin records that "Certificate in IT at College B leads to Diploma in IT at Polytechnic C with CGPA 2.50 or above", with the source.
- Students who do not qualify for the diploma now see this as a stepping stone.

---

## 7. Offer chance, explained simply

EduLaunch compares the student's merit with the **lowest merit that received an offer** in recent years.

| Result | Meaning |
|---|---|
| **High** | At least 3 points above the usual lowest offer |
| **Medium** | Around the usual lowest offer (2 below to 3 above) |
| **Low** | More than 2 points below |
| **No data** | Not enough past data to estimate |

It is an estimate, not a promise. The card always shows which years the estimate is based on.

---

## 8. Keeping information correct

- Only **official sources** are used: university and agency websites and prospectuses.
- AI can **draft**, but only **admins publish**, and a second admin must approve.
- Every requirement keeps the **sentence it came from** as evidence.
- Results read from slips are **always confirmed by the student**.

---

## 9. Keeping costs near zero

- Most features use rules and simple maths, not AI: eligibility, ranking, reasons, offer chance and alternative pathways.
- AI is only used to read documents and to answer questions.
- Personal data (slips, grades) is processed on our own machine, never by free online AI services.
- Pages that have not changed are never sent to AI again.
- Hosting uses free tiers. Expected running cost during development: **RM0 per month**.

---

## 10. What EduLaunch does not do

- It does not submit applications on a student's behalf.
- It does not guarantee an offer.
- It does not replace official portals or university decisions.
- It does not suggest applying where the minimum requirements are clearly not met.
- It does not invent requirements: if there is no source, it says so.

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **Eligible / Almost eligible** | Meets every requirement / misses exactly one, by a small gap |
| **Merit** | A score calculated from results (and co-curriculum) used in admissions |
| **Offer chance** | Estimate of how likely an offer is, from past admission data |
| **Interest test (RIASEC)** | A short questionnaire that groups interests into six types |
| **Target grades** | The grades a Form 4–5 student aims for, used before real results exist |
| **Stepping stone** | A lower-level programme that leads to the level the student wants |
| **What-if** | "If this grade improves, these programmes open" |
| **Draft / Publish** | AI or an admin prepares a draft; another admin approves and publishes it |

---

## 12. Frequently asked questions

**Is the chat really unlimited?**
Yes for normal use. There is no daily limit. A short pause only happens if one account sends a very large number of questions within a minute, to protect the free service for everyone.

**What if my slip is blurry?**
Unclear rows are highlighted with the reason. Fix them, or enter results by hand.

**Why do I see "based on targets"?**
You are in Form 4–5. Your recommendations use the grades you aim for until your real results arrive.

**Why does a programme say "No data" for offer chance?**
There is not enough past admission data for it yet. Eligibility and reasons still work.

**Can I change my education level later?**
Yes, in your profile. EduLaunch also asks at the start of each year and when exam results are announced.
