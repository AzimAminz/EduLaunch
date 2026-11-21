import { getDetails, getMe, getNotificationPrefs, getRoadmap, listRecords, listSavedProgrammes } from '@/lib/profile/api';
import { listNotifications, myTickets } from '@/lib/engagement/api';
import { getInterestTest } from '@/lib/interests/api';
import { getAccessToken, getAccount } from '@/lib/supabase/server';

/**
 * "Download my data": everything EduLaunch keeps about the signed-in student, as one JSON file (their right of
 * access under the PDPA). Only their own data, read with their own session.
 */
export async function GET() {
  const [account, token] = await Promise.all([getAccount(), getAccessToken()]);
  if (!account || !token) return new Response('Not signed in', { status: 401 });
  const [me, details, records, saved, notifications, roadmap, interest, questions, notices] = await Promise.all([
    getMe(token),
    getDetails(token).catch(() => null),
    listRecords(token),
    listSavedProgrammes(token).catch(() => []),
    getNotificationPrefs(token).catch(() => null),
    getRoadmap(token).catch(() => null),
    getInterestTest(token).catch(() => null),
    myTickets(token).catch(() => null),
    listNotifications(token).catch(() => null),
  ]);
  const data = {
    exportedAt: new Date().toISOString(),
    account: { id: account.id, email: account.email, name: account.name, avatarUrl: account.avatarUrl },
    profile: { educationLevel: me.educationLevel, formYear: me.formYear, higherQualification: me.higherQualification, ...details },
    academicRecords: records,
    savedProgrammes: saved,
    notificationPreferences: notifications,
    roadmap: roadmap?.steps ?? null,
    // The interest test: the result and the answer given to each question (0 = strongly dislike … 4 = strongly like).
    interestTest: interest ? { result: interest.result, answers: interest.questions.map((q) => ({ question: q.textEn ?? q.text, answer: interest.answers[q.id] ?? null })) } : null,
    supportQuestions: questions?.map((q) => ({ category: q.category, programId: q.programId, message: q.message, status: q.status, reply: q.adminReply, createdAt: q.createdAt, closedAt: q.closedAt })) ?? null,
    notices: notices?.map((n) => ({ type: n.type, programId: n.programId, createdAt: n.createdAt, readAt: n.readAt })) ?? null,
  };
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="edulaunch-data-${day}.json"`,
      'cache-control': 'no-store',
    },
  });
}
