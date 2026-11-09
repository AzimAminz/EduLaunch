import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { createEvent, DomainError } from '@edulaunch/ddd';
import { DRIZZLE, EventBus, type Caller, type Database } from '@edulaunch/nest-kit';
import { Events } from '@edulaunch/contracts';
import * as schema from '../../../infrastructure/db/schema.js';
import { GetOrCreateMe } from '../../students/application/student.use-cases.js';
import { MINI_IP_VERSION, hollandCode, scoreInterestTest, type RiasecScores } from '../domain/mini-ip.js';

const { questions, assessments, students } = schema;

/**
 * The interest test (O*NET Mini-IP): its questions, the student's answers saved as they go (so they can stop and carry
 * on), and the result, worked out when every question is answered and kept on the student for recommendations.
 */
@Injectable()
export class InterestTestService {
  constructor(
    private readonly me: GetOrCreateMe,
    @Inject(DRIZZLE) private readonly db: Database<typeof schema>,
    @Inject(EventBus) private readonly events: EventBus,
  ) {}

  private activeQuestions() {
    return this.db
      .select({ id: questions.id, text: questions.questionText, textEn: questions.questionTextEn, riasecType: questions.riasecType })
      .from(questions)
      .where(and(eq(questions.isActive, true), eq(questions.testVersion, MINI_IP_VERSION)))
      .orderBy(asc(questions.displayOrder));
  }

  /** The questions in order (without the type each one measures), the answers saved so far, and the last result. */
  async get(caller: Caller) {
    const { studentId } = await this.me.execute(caller);
    const [list, saved, [student]] = await Promise.all([
      this.activeQuestions(),
      this.db.select({ questionId: assessments.questionId, answer: assessments.answer }).from(assessments).where(eq(assessments.studentId, studentId)),
      this.db.select({ scores: students.riasecScores, at: students.interestTestAt }).from(students).where(eq(students.id, studentId)),
    ]);
    const ids = new Set(list.map((q) => q.id));
    const result = student?.scores ? { scores: student.scores, code: hollandCode(student.scores), completedAt: student.at } : null;
    return {
      questions: list.map(({ id, text, textEn }) => ({ id, text, textEn })),
      answers: Object.fromEntries(saved.filter((a) => ids.has(a.questionId)).map((a) => [a.questionId, a.answer])),
      result,
    };
  }

  /** Saves some answers (one step of the test); unknown questions and answers outside 0–4 are refused. */
  async saveAnswers(caller: Caller, answers: Array<{ questionId: string; answer: number }>) {
    const { studentId } = await this.me.execute(caller);
    if (answers.length === 0) return { saved: 0 };
    const known = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(and(inArray(questions.id, answers.map((a) => a.questionId)), eq(questions.isActive, true)));
    if (known.length !== new Set(answers.map((a) => a.questionId)).size) throw new DomainError('invalid_question', 'That question is not part of the test');
    const now = new Date();
    for (const a of answers) {
      await this.db
        .insert(assessments)
        .values({ studentId, questionId: a.questionId, answer: a.answer, answeredAt: now })
        .onConflictDoUpdate({ target: [assessments.studentId, assessments.questionId], set: { answer: a.answer, answeredAt: now } });
    }
    return { saved: answers.length };
  }

  /** Works out the result from the saved answers, keeps it on the student and tells the other services. */
  async submit(caller: Caller) {
    const { studentId } = await this.me.execute(caller);
    const [list, saved] = await Promise.all([
      this.activeQuestions(),
      this.db.select({ questionId: assessments.questionId, answer: assessments.answer }).from(assessments).where(eq(assessments.studentId, studentId)),
    ]);
    if (list.length === 0) throw new DomainError('test_unavailable', 'The interest test is not set up yet');
    const scores: RiasecScores = scoreInterestTest(list, new Map(saved.map((a) => [a.questionId, a.answer])));
    const completedAt = new Date();
    await this.db.update(students).set({ riasecScores: scores, interestTestAt: completedAt }).where(eq(students.id, studentId));
    await this.events.publish([createEvent(Events.AssessmentCompleted, { studentId })]);
    return { scores, code: hollandCode(scores), completedAt };
  }

  /** Starts again: clears the answers; the last result stays until the new one is worked out. */
  async restart(caller: Caller) {
    const { studentId } = await this.me.execute(caller);
    await this.db.delete(assessments).where(eq(assessments.studentId, studentId));
  }
}
