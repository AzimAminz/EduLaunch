#!/usr/bin/env node
// Builds the Supabase Auth e-mail templates in supabase/templates/ from one shared layout,
// in the EduLaunch theme (navy, yellow, Rimau) and in Bahasa Melayu and English.
//   pnpm email:build              write the templates (commit them; Supabase reads them on start)
//   pnpm email:build --preview    also write filled-in samples to supabase/templates/preview/ to open in a browser
//
// Supabase fills in {{ .ConfirmationURL }}, {{ .Email }}, {{ .SiteURL }} and {{ .Data }} (the user's metadata).
// The language comes from user_metadata.locale, which the web app sets when people sign up or log in.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const outDir = join(root, 'supabase/templates');

const C = { navy: '#142747', muted: '#657186', line: '#e2e7ef', bg: '#f5f6fa', yellow: '#ffd84d', blue: '#e3ecff' };
const FONT = "Outfit, 'Segoe UI', Helvetica, Arial, sans-serif";

// Greeting with the name when we have one: "Hai Aina," / "Hi Aina,".
const greeting = (word) => `${word}{{ with .Data }}{{ with .full_name }} {{ . }}{{ end }}{{ end }},`;

const EMAILS = {
  recovery: {
    subject: 'Tetapkan kata laluan baharu · Reset your EduLaunch password',
    image: 'rimau-shield',
    button: true,
    ms: {
      eyebrow: 'BANTUAN LOG MASUK',
      title: 'Tetapkan kata laluan baharu',
      intro: `${greeting('Hai')} kami menerima permintaan untuk menetapkan semula kata laluan akaun EduLaunch anda.`,
      button: 'Tetapkan kata laluan baharu',
      note: 'Pautan ini sah selama 1 jam dan hanya boleh digunakan sekali.',
      safety: 'Bukan anda yang meminta? Abaikan e-mel ini. Kata laluan anda tidak akan berubah.',
    },
    en: {
      eyebrow: 'LOGIN HELP',
      title: 'Set a new password',
      intro: `${greeting('Hi')} we received a request to reset the password of your EduLaunch account.`,
      button: 'Set a new password',
      note: 'This link works for 1 hour and can be used once.',
      safety: 'Did not ask for this? Ignore this email. Your password will not change.',
    },
  },
  confirmation: {
    subject: 'Sahkan e-mel anda · Confirm your EduLaunch email',
    image: 'rimau-waving',
    button: true,
    ms: {
      eyebrow: 'SELAMAT DATANG',
      title: 'Sahkan e-mel anda',
      intro: `${greeting('Hai')} terima kasih kerana mendaftar. Sahkan alamat e-mel ini untuk mula merancang pendidikan anda bersama EduLaunch.`,
      button: 'Sahkan e-mel',
      note: 'Pautan ini sah selama 1 jam.',
      safety: 'Tidak mendaftar di EduLaunch? Abaikan e-mel ini. Tiada akaun akan diaktifkan.',
    },
    en: {
      eyebrow: 'WELCOME',
      title: 'Confirm your email',
      intro: `${greeting('Hi')} thank you for signing up. Confirm this email address to start planning your education with EduLaunch.`,
      button: 'Confirm email',
      note: 'This link works for 1 hour.',
      safety: 'Did not sign up for EduLaunch? Ignore this email. No account will be activated.',
    },
  },
  email_change: {
    subject: 'Sahkan e-mel baharu · Confirm your new EduLaunch email',
    image: 'rimau-shield',
    button: true,
    ms: {
      eyebrow: 'TETAPAN AKAUN',
      title: 'Sahkan e-mel baharu anda',
      intro: `${greeting('Hai')} anda meminta untuk menukar e-mel akaun daripada <strong>{{ .Email }}</strong> kepada <strong>{{ .NewEmail }}</strong>.`,
      button: 'Sahkan e-mel baharu',
      note: 'Pautan ini sah selama 1 jam.',
      safety: 'Bukan anda yang meminta? Abaikan e-mel ini dan tukar kata laluan anda.',
    },
    en: {
      eyebrow: 'ACCOUNT SETTINGS',
      title: 'Confirm your new email',
      intro: `${greeting('Hi')} you asked to change your account email from <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>.`,
      button: 'Confirm new email',
      note: 'This link works for 1 hour.',
      safety: 'Did not ask for this? Ignore this email and change your password.',
    },
  },
  password_changed_notification: {
    subject: 'Kata laluan anda telah ditukar · Your EduLaunch password was changed',
    image: 'rimau-shield',
    button: false,
    ms: {
      eyebrow: 'NOTIS KESELAMATAN',
      title: 'Kata laluan anda telah ditukar',
      intro: `${greeting('Hai')} kata laluan akaun EduLaunch untuk <strong>{{ .Email }}</strong> baru sahaja ditukar.`,
      note: 'Jika anda yang menukarnya, tiada apa-apa lagi perlu dibuat.',
      safety: 'Bukan anda? Gunakan "Lupa kata laluan?" di halaman log masuk dengan segera untuk mendapatkan semula akaun anda.',
    },
    en: {
      eyebrow: 'SECURITY NOTICE',
      title: 'Your password was changed',
      intro: `${greeting('Hi')} the password of the EduLaunch account for <strong>{{ .Email }}</strong> was just changed.`,
      note: 'If you changed it, there is nothing else to do.',
      safety: 'Was it not you? Use "Forgot password?" on the log in page straight away to recover your account.',
    },
  },
};

const FOOTER = {
  ms: {
    sentTo: 'E-mel ini dihantar ke {{ .Email }} kerana ia didaftarkan di EduLaunch.',
    disclaimer: 'EduLaunch ialah platform bebas untuk merancang pendidikan dan kerjaya. Ia bukan portal permohonan rasmi.',
    copyLink: 'Butang tidak berfungsi? Salin pautan ini ke pelayar anda:',
  },
  en: {
    sentTo: 'This email was sent to {{ .Email }} because it is registered with EduLaunch.',
    disclaimer: 'EduLaunch is an independent platform for planning education and careers. It is not an official application portal.',
    copyLink: 'Button not working? Copy this link into your browser:',
  },
};

/** Table-based layout with inline styles: the form email programs (Gmail, Outlook, phones) display reliably. */
function body(email, lang) {
  const t = email[lang];
  const f = FOOTER[lang];
  const button = email.button
    ? `
          <tr><td align="center" style="padding:8px 40px 4px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td align="center" bgcolor="${C.navy}" style="border-radius:10px">
                <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${t.button} &rarr;</a>
              </td>
            </tr></table>
          </td></tr>`
    : '';
  const copyLink = email.button
    ? `
          <tr><td style="padding:16px 40px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted}">
            ${f.copyLink}<br><a href="{{ .ConfirmationURL }}" style="color:#2f5bd3;word-break:break-all">{{ .ConfirmationURL }}</a>
          </td></tr>`
    : '';
  return `
          <tr><td align="center" style="padding:32px 40px 8px">
            <img src="{{ .SiteURL }}/email/${email.image}.png" width="160" height="160" alt="" style="display:block;width:160px;height:160px;border:0">
          </td></tr>
          <tr><td style="padding:8px 40px 0;font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.5px;color:${C.muted}">${t.eyebrow}</td></tr>
          <tr><td style="padding:8px 40px 0;font-family:${FONT};font-size:26px;line-height:32px;font-weight:700;color:${C.navy}">${t.title}</td></tr>
          <tr><td style="padding:12px 40px 20px;font-family:${FONT};font-size:15px;line-height:23px;color:${C.navy}">${t.intro}</td></tr>${button}${copyLink}
          <tr><td style="padding:24px 40px 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="background:${C.bg};border-radius:12px;padding:14px 16px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.navy}">
                ${t.note}<br><span style="color:${C.muted}">${t.safety}</span>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:28px 40px 32px;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};border-top:1px solid ${C.line}">
            ${f.sentTo}<br>${f.disclaimer}<br>&copy; 2026 EduLaunch
          </td></tr>`;
}

function template(email) {
  return `<!doctype html>
<!-- Generated by tools/scripts/build-email-templates.mjs. Edit that file, then run pnpm email:build. -->
{{ $en := false }}{{ with .Data }}{{ if eq (printf "%v" .locale) "en" }}{{ $en = true }}{{ end }}{{ end }}
<html lang="{{ if $en }}en{{ else }}ms{{ end }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>EduLaunch</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.bg}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg}">
    <tr><td align="center" style="padding:32px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">
        <tr><td style="background:${C.navy};padding:18px 40px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:10px"><img src="{{ .SiteURL }}/email/logo.png" width="36" height="36" alt="" style="display:block;border:0;border-radius:8px"></td>
            <td style="font-family:${FONT};font-size:20px;font-weight:700;color:#ffffff">EduLaunch</td>
          </tr></table>
        </td></tr>
        <tr><td style="height:4px;line-height:4px;font-size:0;background:${C.yellow}">&nbsp;</td></tr>
        {{ if $en }}${body(email, 'en')}
        {{ else }}${body(email, 'ms')}
        {{ end }}
      </table>
    </td></tr>
  </table>
</body>
</html>
`;
}

mkdirSync(outDir, { recursive: true });
for (const [name, email] of Object.entries(EMAILS)) writeFileSync(join(outDir, `${name}.html`), template(email));
console.log(`Wrote ${Object.keys(EMAILS).length} templates to supabase/templates/`);

if (process.argv.includes('--preview')) {
  // Fills the Go template the simple way, enough to look at the design in a browser.
  const previewDir = join(outDir, 'preview');
  mkdirSync(previewDir, { recursive: true });
  for (const [name, email] of Object.entries(EMAILS)) {
    for (const lang of ['ms', 'en']) {
      const html = template(email)
        .replace(/\{\{ \$en := false \}\}.*\n/, '')
        .replace(/\{\{ if \$en \}\}en\{\{ else \}\}ms\{\{ end \}\}/, lang)
        .replace(/\{\{ if \$en \}\}([\s\S]*?)\{\{ else \}\}([\s\S]*?)\{\{ end \}\}\n/, (_, en, ms) => (lang === 'en' ? en : ms))
        .replace(/\{\{ with \.Data \}\}\{\{ with \.full_name \}\} \{\{ \. \}\}\{\{ end \}\}\{\{ end \}\}/g, ' Aina')
        .replaceAll('{{ .SiteURL }}', 'http://localhost:3000')
        .replaceAll('{{ .ConfirmationURL }}', 'http://127.0.0.1:54321/auth/v1/verify?token=contoh&type=recovery&redirect_to=http://localhost:3000/ms/auth/callback')
        .replaceAll('{{ .Email }}', 'aina@contoh.com')
        .replaceAll('{{ .NewEmail }}', 'aina.baharu@contoh.com');
      writeFileSync(join(previewDir, `${name}.${lang}.html`), html);
    }
  }
  console.log('Previews in supabase/templates/preview/ (not committed)');
}
