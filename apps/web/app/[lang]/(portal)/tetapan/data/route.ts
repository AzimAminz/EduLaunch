import { getDetails, getMe, getNotificationPrefs, listRecords, listSavedProgrammes } from '@/lib/profile/api';
import { getAccessToken, getAccount } from '@/lib/supabase/server';

/**
 * "Download my data": everything EduLaunch keeps about the signed-in student, as one JSON file (their right of
 * access under the PDPA). Only their own data, read with their own session.
 */
export async function GET() {
  const [account, token] = await Promise.all([getAccount(), getAccessToken()]);
  if (!account || !token) return new Response('Not signed in', { status: 401 });
  const [me, details, records, saved, notifications] = await Promise.all([
    getMe(token),
    getDetails(token).catch(() => null),
    listRecords(token),
    listSavedProgrammes(token).catch(() => []),
    getNotificationPrefs(token).catch(() => null),
  ]);
  const data = {
    exportedAt: new Date().toISOString(),
    account: { id: account.id, email: account.email, name: account.name, avatarUrl: account.avatarUrl },
    profile: { educationLevel: me.educationLevel, formYear: me.formYear, higherQualification: me.higherQualification, ...details },
    academicRecords: records,
    savedProgrammes: saved,
    notificationPreferences: notifications,
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
