import { FRONTEND_URL } from './config.js';

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateTime = (value) => {
  if (!value) return 'No expiry date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No expiry date';
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
};

const renderEmailShell = ({ eyebrow, title, intro, sections, ctaLabel, ctaUrl, footer }) => `
  <div style="background:#020617;padding:32px 16px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e2e8f0;">
    <div style="max-width:640px;margin:0 auto;border:1px solid rgba(148,163,184,0.18);border-radius:24px;background:#0f172a;overflow:hidden;">
      <div style="padding:32px;border-bottom:1px solid rgba(148,163,184,0.14);background:linear-gradient(180deg,rgba(30,41,59,0.98),rgba(15,23,42,0.98));">
        <div style="display:inline-block;padding:8px 12px;border-radius:999px;border:1px solid rgba(59,130,246,0.28);background:rgba(59,130,246,0.12);color:#60a5fa;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">${escapeHtml(
          eyebrow
        )}</div>
        <h1 style="margin:18px 0 0;font-size:30px;line-height:1.15;color:#f8fafc;">${escapeHtml(title)}</h1>
        <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#cbd5e1;">${escapeHtml(intro)}</p>
      </div>
      <div style="padding:28px 32px;">
        ${sections
          .map(
            (section) => `
              <div style="margin-bottom:18px;padding:18px 20px;border:1px solid rgba(148,163,184,0.14);border-radius:18px;background:rgba(15,23,42,0.68);">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">${escapeHtml(
                  section.label
                )}</div>
                <div style="margin-top:8px;font-size:15px;line-height:1.7;color:#f8fafc;">${section.value}</div>
              </div>
            `
          )
          .join('')}
        ${
          ctaLabel && ctaUrl
            ? `<div style="margin-top:28px;">
                <a href="${escapeHtml(
                  ctaUrl
                )}" style="display:inline-block;padding:14px 20px;border-radius:16px;background:#3b82f6;color:#eff6ff;text-decoration:none;font-size:14px;font-weight:700;">${escapeHtml(
                  ctaLabel
                )}</a>
              </div>`
            : ''
        }
        <p style="margin:26px 0 0;font-size:13px;line-height:1.8;color:#94a3b8;">${escapeHtml(footer)}</p>
      </div>
    </div>
  </div>
`;

export const buildLeadNotificationEmail = (leadEntry) => {
  const adminUrl = `${FRONTEND_URL}/app?section=account`;
  const subject = `New Codhak lead: ${leadEntry.company} (${leadEntry.intent.replace(/_/g, ' ')})`;
  const text = [
    'A new Codhak sales lead was submitted.',
    '',
    `Company: ${leadEntry.company}`,
    `Name: ${leadEntry.name}`,
    `Email: ${leadEntry.email}`,
    `Intent: ${leadEntry.intent}`,
    `Source: ${leadEntry.source}`,
    `Team size: ${leadEntry.team_size}`,
    `Use case: ${leadEntry.use_case}`,
    '',
    'Objective:',
    leadEntry.objective || 'No objective provided.',
    '',
    `Open pipeline: ${adminUrl}`,
  ].join('\n');

  const html = renderEmailShell({
    eyebrow: 'Sales lead',
    title: 'A new pilot or pricing lead came in.',
    intro: 'Codhak captured a new lead that should be reviewed quickly while intent is still warm.',
    sections: [
      { label: 'Company', value: escapeHtml(leadEntry.company) },
      { label: 'Contact', value: `${escapeHtml(leadEntry.name)}<br /><span style="color:#94a3b8;">${escapeHtml(leadEntry.email)}</span>` },
      {
        label: 'Intent',
        value: `${escapeHtml(leadEntry.intent.replace(/_/g, ' '))}<br /><span style="color:#94a3b8;">Source: ${escapeHtml(
          leadEntry.source
        )}</span>`,
      },
      {
        label: 'Team shape',
        value: `Team size: ${escapeHtml(leadEntry.team_size)}<br />Use case: ${escapeHtml(leadEntry.use_case)}`,
      },
      {
        label: 'Objective',
        value: escapeHtml(leadEntry.objective || 'No objective provided.').replace(/\n/g, '<br />'),
      },
    ],
    ctaLabel: 'Open sales pipeline',
    ctaUrl: adminUrl,
    footer: 'Review the lead, assign an owner, and capture the next step while the request is still fresh.',
  });

  return { subject, text, html };
};

export const buildTeamInviteEmail = ({ teamName, inviteCode, inviteRole, inviteLabel, expiresAt, joinUrl }) => {
  const resolvedJoinUrl = joinUrl || `${FRONTEND_URL}/app?section=teams`;
  const subject = `You were invited to join ${teamName} on Codhak`;
  const expiryLabel = formatDateTime(expiresAt);
  const text = [
    `You were invited to join ${teamName} on Codhak.`,
    '',
    `Role: ${inviteRole}`,
    `Invite label: ${inviteLabel}`,
    `Invite code: ${inviteCode}`,
    `Expires: ${expiryLabel}`,
    '',
    `Open Codhak: ${resolvedJoinUrl}`,
    'If the invite code is not prefilled, paste it into the Teams workspace to join the cohort.',
  ].join('\n');

  const html = renderEmailShell({
    eyebrow: 'Team invite',
    title: `You were invited to join ${teamName}.`,
    intro: 'This invite gives you access to a Codhak team workspace with benchmarks, assignments, and cohort progress tracking.',
    sections: [
      { label: 'Role', value: escapeHtml(inviteRole) },
      { label: 'Invite label', value: escapeHtml(inviteLabel) },
      {
        label: 'Invite code',
        value: `<div style="font-size:22px;font-weight:700;letter-spacing:0.08em;">${escapeHtml(inviteCode)}</div>`,
      },
      { label: 'Expires', value: escapeHtml(expiryLabel) },
    ],
    ctaLabel: 'Open Codhak teams',
    ctaUrl: resolvedJoinUrl,
    footer: 'If you are not signed in yet, log in first and then paste the invite code into the Teams workspace.',
  });

  return { subject, text, html };
};
