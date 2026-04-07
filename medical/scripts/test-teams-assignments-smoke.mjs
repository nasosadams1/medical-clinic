import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(rootDir, '.tmp_smoke');
const envPath = path.join(rootDir, '.env');
const seedPath = process.env.TEAMS_SMOKE_SEED_FILE || path.join(outputDir, 'teams-smoke-seed.json');
const appUrl = process.env.TEAMS_SMOKE_APP_URL || 'http://localhost:5173/app?section=teams';

const parseEnvFile = (raw) =>
  Object.fromEntries(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      })
  );

const requireFile = (filePath, label) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found at ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf8');
};

const env = parseEnvFile(requireFile(envPath, '.env'));
const initialSeed = fs.existsSync(seedPath) ? JSON.parse(fs.readFileSync(seedPath, 'utf8')) : null;
const adminSupabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: false },
});

const listAuthUsers = async () => {
  const allUsers = [];
  let page = 1;

  for (;;) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const pageUsers = data?.users || [];
    allUsers.push(...pageUsers);
    if (pageUsers.length < 200) break;
    page += 1;
  }

  return allUsers;
};

const ensureAuthUser = async ({ email, password, name }) => {
  const existing = (await listAuthUsers()).find((entry) => entry.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    const { data, error } = await adminSupabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        name,
      },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw error;
  return data.user;
};

const ensureProfile = async ({ id, email, name }) => {
  const { error } = await adminSupabase.from('user_profiles').upsert(
    {
      id,
      email,
      name,
      current_avatar: '',
      current_streak: 0,
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
};

const ensureSmokeSeed = async (seed) => {
  const stamp = Date.now();
  const ownerEmail = seed?.ownerEmail || `teams-owner-${stamp}@example.com`;
  const learnerEmail = seed?.learnerEmail || `teams-learner-${stamp}@example.com`;
  const learnerBEmail = seed?.learnerBEmail || `teams-learner-b-${stamp}@example.com`;
  const password = seed?.password || 'SmokePass123!';
  const teamName = seed?.teamName || `Smoke Team ${stamp}`;

  const owner = await ensureAuthUser({ email: ownerEmail, password, name: 'Smoke Owner' });
  const learner = await ensureAuthUser({ email: learnerEmail, password, name: 'Smoke Learner A' });
  const learnerB = await ensureAuthUser({ email: learnerBEmail, password, name: 'Smoke Learner B' });

  await Promise.all([
    ensureProfile({ id: owner.id, email: ownerEmail, name: 'Smoke Owner' }),
    ensureProfile({ id: learner.id, email: learnerEmail, name: 'Smoke Learner A' }),
    ensureProfile({ id: learnerB.id, email: learnerBEmail, name: 'Smoke Learner B' }),
  ]);

  let team = null;
  if (seed?.teamId) {
    const { data } = await adminSupabase.from('skill_teams').select('id,name').eq('id', seed.teamId).maybeSingle();
    team = data;
  }

  if (!team) {
    const { data, error } = await adminSupabase
      .from('skill_teams')
      .insert({
        name: teamName,
        slug: `smoke-team-${stamp}`,
        description: 'Seeded team for assignment workspace smoke coverage.',
        use_case: 'bootcamps',
        seat_limit: 150,
        created_by: owner.id,
      })
      .select('id,name')
      .single();
    if (error || !data) throw new Error(error?.message || 'Could not create smoke team.');
    team = data;
  }

  const { error: teamPlanError } = await adminSupabase
    .from('skill_teams')
    .update({ seat_limit: 150 })
    .eq('id', team.id);
  if (teamPlanError) throw teamPlanError;

  const memberships = [
    { team_id: team.id, user_id: owner.id, role: 'owner', status: 'active' },
    { team_id: team.id, user_id: learner.id, role: 'learner', status: 'active' },
    { team_id: team.id, user_id: learnerB.id, role: 'learner', status: 'active' },
  ];

  for (const membership of memberships) {
    const { error } = await adminSupabase.from('skill_team_memberships').upsert(membership, {
      onConflict: 'team_id,user_id',
    });
    if (error) throw error;
  }

  let assignment = null;
  if (seed?.assignmentId) {
    const { data } = await adminSupabase.from('skill_team_assignments').select('id,title').eq('id', seed.assignmentId).maybeSingle();
    assignment = data;
  }

  if (!assignment) {
    const { data, error } = await adminSupabase
      .from('skill_team_assignments')
      .insert({
        team_id: team.id,
        title: 'Smoke benchmark assignment',
        description: 'Seeded assignment for assignment workspace smoke coverage.',
        assignment_type: 'benchmark',
        benchmark_language: 'python',
        track_id: null,
        due_at: null,
        created_by: owner.id,
        metadata: { seeded: true },
      })
      .select('id,title')
      .single();
    if (error || !data) throw new Error(error?.message || 'Could not create smoke assignment.');
    assignment = data;
  }

  const seededSubmissions = [
    {
      memberUserId: learner.id,
      submittedByUserId: learner.id,
      title: 'Smoke attempt 1',
      body: 'The learner solution is attached for assignment workspace smoke coverage.',
      status: 'submitted',
    },
    {
      memberUserId: learnerB.id,
      submittedByUserId: learnerB.id,
      title: 'Smoke attempt 2',
      body: 'The second learner solution is attached for queue navigation smoke coverage.',
      status: 'needs_revision',
    },
  ];

  for (const submission of seededSubmissions) {
    const { data: existingSubmission } = await adminSupabase
      .from('skill_team_submissions')
      .select('id')
      .eq('team_id', team.id)
      .eq('member_user_id', submission.memberUserId)
      .eq('assignment_id', assignment.id)
      .limit(1)
      .maybeSingle();

    if (!existingSubmission) {
      const { error } = await adminSupabase.from('skill_team_submissions').insert({
        team_id: team.id,
        assignment_id: assignment.id,
        member_user_id: submission.memberUserId,
        submitted_by_user_id: submission.submittedByUserId,
        submission_type: 'written',
        title: submission.title,
        body: submission.body,
        external_url: null,
        code_language: null,
        status: submission.status,
        rubric_score: null,
        attempt_number: 1,
      });
      if (error) throw error;
    }
  }

  const nextSeed = {
    ownerEmail,
    learnerEmail,
    learnerBEmail,
    password,
    teamName: team.name,
    teamId: team.id,
    assignmentId: assignment.id,
  };

  fs.mkdirSync(path.dirname(seedPath), { recursive: true });
  fs.writeFileSync(seedPath, JSON.stringify(nextSeed, null, 2));
  return nextSeed;
};

const seed = await ensureSmokeSeed(initialSeed);
const runStamp = Date.now();
const dueAt = new Date();
dueAt.setDate(dueAt.getDate() + 1);
dueAt.setHours(12, 0, 0, 0);
const dueAtInputValue = `${dueAt.getFullYear()}-${String(dueAt.getMonth() + 1).padStart(2, '0')}-${String(dueAt.getDate()).padStart(
  2,
  '0'
)}T${String(dueAt.getHours()).padStart(2, '0')}:${String(dueAt.getMinutes()).padStart(2, '0')}`;

const createdTitle = `Smoke workspace assignment ${runStamp} for queue title truncation coverage`;
const updatedTitle = `${createdTitle} updated`;
const duplicateTitle = `${updatedTitle} (Copy)`;
const cleanupTitles = [createdTitle, updatedTitle, duplicateTitle];
const createdInviteLabel = `Smoke access invite ${runStamp}`;
const updatedInviteLabel = `${createdInviteLabel} updated`;
const cleanupInviteLabels = [createdInviteLabel, updatedInviteLabel];

const result = {
  success: false,
  seed: {
    teamName: seed.teamName,
    teamId: seed.teamId,
    assignmentId: seed.assignmentId,
  },
  steps: [],
  apiFailures: [],
  pageErrors: [],
  details: {},
};

const noteStep = (step, extra = {}) => {
  result.steps.push({ step, ...extra });
};

const { data, error } = await supabase.auth.signInWithPassword({
  email: seed.ownerEmail,
  password: seed.password,
});

if (error) throw error;
if (!data.session) throw new Error('No Supabase session returned for Teams assignment smoke user.');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });

await context.addInitScript((sessionValue) => {
  window.localStorage.setItem('codhak-auth', JSON.stringify(sessionValue));
  window.localStorage.setItem('codhak-taskbar-visible', '1');
}, data.session);

const page = await context.newPage();
page.on('pageerror', (pageError) => {
  result.pageErrors.push(String(pageError));
});
page.on('dialog', async (dialog) => {
  await dialog.accept();
});

page.on('response', async (response) => {
  const url = response.url();
  if (!url.includes('/api/teams') || response.status() < 400) return;

  let body = '';
  try {
    body = await response.text();
  } catch {
    body = '';
  }

  result.apiFailures.push({
    url,
    status: response.status(),
    body: body.slice(0, 500),
  });
});

const assignmentsDialog = () => page.getByRole('dialog', { name: /Assignments/i });
const accessDialog = () => page.getByRole('dialog', { name: /Access/i });
const analyticsDialog = () => page.getByRole('dialog', { name: /Team health and progress/i });
const accessInviteCard = (label) =>
  accessDialog().getByText(label, { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]');
const modalSearchInput = () => assignmentsDialog().getByPlaceholder('Search title, track, type, or rule');
const modalButtons = (label) => assignmentsDialog().getByRole('button', { name: label });
const assignmentQueueTable = () => assignmentsDialog().getByRole('table', { name: /Assignments queue/i });
const assignmentTabs = () => assignmentsDialog().getByRole('tablist', { name: /Assignment states/i });
const assignmentSummary = () => assignmentsDialog().getByRole('region', { name: /Queue health/i });
const assignmentRowButton = (title) => assignmentQueueTable().locator('button').filter({ hasText: title }).first();
const selectedDetailTitle = () => assignmentsDialog().locator('aside[aria-label="Assignment inspector"] h3').first();

const expectNoVisibleText = async (locator, text) => {
  const match = locator.getByText(text, { exact: true });
  if ((await match.count()) > 0 && (await match.first().isVisible())) {
    throw new Error(`Expected "${text}" to stay hidden.`);
  }
};

try {
  await page.goto(appUrl, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForTimeout(4_000);
  noteStep('opened app');

  if (!page.url().includes('section=teams')) {
    await page.getByRole('button', { name: /^Teams$/i }).click();
    await page.waitForURL(/section=teams/, { timeout: 10_000 });
  }
  noteStep('opened teams workspace');

  await page.locator('select').first().selectOption(seed.teamId);
  await page.waitForTimeout(2_500);
  await page.waitForFunction((teamId) => {
    const select = document.querySelector('select');
    return select instanceof HTMLSelectElement && select.value === teamId;
  }, seed.teamId);
  await page.getByRole('button', { name: /Assignments/i }).first().waitFor({ state: 'visible', timeout: 15_000 });
  noteStep('selected smoke team');

  await page.getByRole('button', { name: /Assignments/i }).first().click();
  await assignmentsDialog().waitFor({ state: 'visible', timeout: 10_000 });
  noteStep('opened assignments workspace');

  await expectNoVisibleText(assignmentsDialog(), 'Current work');
  await assignmentTabs().waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentSummary().waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentQueueTable().waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentsDialog().getByRole('columnheader', { name: 'Assignment' }).waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentsDialog().getByRole('columnheader', { name: 'Audience' }).waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentsDialog().getByRole('columnheader', { name: 'Due' }).waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentsDialog().getByRole('columnheader', { name: 'Status' }).waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentsDialog().getByRole('columnheader', { name: 'Progress' }).waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentsDialog().getByRole('columnheader', { name: 'Action' }).waitFor({ state: 'visible', timeout: 10_000 });
  if ((await assignmentSummary().getByRole('button').count()) !== 0) {
    throw new Error('Queue summary should be passive, but interactive buttons were found.');
  }
  if ((await assignmentsDialog().locator('select').count()) !== 2) {
    throw new Error('Assignments queue should only expose Type and Sort selects.');
  }
  if ((await assignmentsDialog().getByRole('button', { name: /^Board$/i }).count()) !== 0) {
    throw new Error('Assignments workspace still exposes a Board view control.');
  }
  if ((await assignmentsDialog().getByRole('button', { name: /^Calendar$/i }).count()) !== 0) {
    throw new Error('Assignments workspace still exposes a Calendar view control.');
  }
  await selectedDetailTitle().waitFor({ state: 'visible', timeout: 10_000 });
  noteStep('verified queue-first assignments layout');

  await modalButtons(/^New assignment$/).click();
  await assignmentsDialog().locator('input[placeholder="Class benchmark"]').waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentsDialog().getByRole('button', { name: /Class benchmark/i }).click();
  await assignmentsDialog().locator('input[placeholder="Class benchmark"]').fill(createdTitle);
  await assignmentsDialog().locator('input[data-datetime-locale="en-US"]').first().waitFor({ state: 'visible', timeout: 10_000 });
  if ((await assignmentsDialog().locator('input[data-datetime-locale="en-US"]').first().getAttribute('lang')) !== 'en-US') {
    throw new Error('Assignments due date input should be pinned to en-US.');
  }
  await assignmentsDialog().locator('input[type="datetime-local"]').fill(dueAtInputValue);
  await assignmentsDialog().locator('textarea').fill('Smoke assignment created by the assignment workspace verification pass.');
  await assignmentsDialog().getByRole('button', { name: /^Create assignment$/ }).click();
  await assignmentsDialog().getByText(createdTitle, { exact: true }).first().waitFor({ state: 'visible', timeout: 15_000 });
  result.details.detailAfterCreate = ((await selectedDetailTitle().textContent()) || '').trim();
  if (result.details.detailAfterCreate !== createdTitle) {
    await assignmentRowButton(createdTitle).click();
    await page.waitForTimeout(500);
    result.details.detailAfterCreate = ((await selectedDetailTitle().textContent()) || '').trim();
  }
  noteStep('created assignment');

  await modalButtons(/^Edit$/).click();
  await assignmentsDialog().getByRole('button', { name: /^Save assignment$/ }).waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentsDialog().locator('input[placeholder="Class benchmark"]').fill(updatedTitle);
  await assignmentsDialog().locator('textarea').fill('Updated brief from the assignments smoke test.');
  await assignmentsDialog().getByRole('button', { name: /^Save assignment$/ }).click();
  await assignmentsDialog().getByText(updatedTitle, { exact: true }).first().waitFor({ state: 'visible', timeout: 15_000 });
  result.details.detailAfterEdit = ((await selectedDetailTitle().textContent()) || '').trim();
  if (result.details.detailAfterEdit !== updatedTitle) {
    await assignmentRowButton(updatedTitle).click();
    await page.waitForTimeout(500);
    result.details.detailAfterEdit = ((await selectedDetailTitle().textContent()) || '').trim();
  }
  noteStep('edited assignment');

  await modalButtons(/^Duplicate$/).click();
  await assignmentsDialog().getByText(duplicateTitle, { exact: true }).first().waitFor({ state: 'visible', timeout: 15_000 });
  result.details.detailAfterDuplicate = ((await selectedDetailTitle().textContent()) || '').trim();
  if (result.details.detailAfterDuplicate !== duplicateTitle) {
    await assignmentRowButton(duplicateTitle).click();
    await page.waitForTimeout(500);
    result.details.detailAfterDuplicate = ((await selectedDetailTitle().textContent()) || '').trim();
  }
  noteStep('duplicated assignment');

  await assignmentsDialog().locator(`table [title="${duplicateTitle}"]`).first().waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentsDialog().getByRole('tab', { name: /Needs action/i }).waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentsDialog().getByRole('tab', { name: /Awaiting review/i }).waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentsDialog().getByRole('tab', { name: /Overdue/i }).waitFor({ state: 'visible', timeout: 10_000 });
  noteStep('verified primary tabs and title accessibility');

  await modalSearchInput().fill(duplicateTitle);
  await page.waitForTimeout(500);
  await expectNoVisibleText(assignmentsDialog(), 'Current work');
  await assignmentRowButton(duplicateTitle).waitFor({ state: 'visible', timeout: 10_000 });
  noteStep('returned to list and filtered duplicate');

  await modalButtons(/^Archive$/).click();
  await page.getByRole('alertdialog', { name: /Archive /i }).waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByRole('button', { name: 'Confirm archive' }).click();
  await assignmentsDialog().getByRole('button', { name: /^Restore$/ }).waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentsDialog().locator('tr[data-assignment-archived="true"]').first().waitFor({ state: 'visible', timeout: 10_000 });
  noteStep('archived duplicate assignment');

  await assignmentsDialog().getByRole('tab', { name: /Archived/i }).click();
  await page.waitForTimeout(600);
  await assignmentRowButton(duplicateTitle).waitFor({ state: 'visible', timeout: 10_000 });
  await assignmentsDialog().locator('tr[data-assignment-archived="true"]').filter({ hasText: duplicateTitle }).first().waitFor({ state: 'visible', timeout: 10_000 });
  noteStep('filtered archived assignments');

  await modalButtons(/^Restore$/).click();
  await assignmentsDialog().getByRole('tab', { name: /^Active/i }).click();
  await page.waitForTimeout(600);
  await assignmentRowButton(duplicateTitle).waitFor({ state: 'visible', timeout: 10_000 });
  noteStep('restored duplicate assignment');

  await page.getByRole('button', { name: /Close Assignments workspace/i }).click();
  await assignmentsDialog().waitFor({ state: 'hidden', timeout: 10_000 });
  await page.getByRole('button', { name: /Access/i }).first().click();
  await accessDialog().waitFor({ state: 'visible', timeout: 10_000 });
  await accessDialog().getByText('Join policy', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  await accessDialog().getByText('Invite codes', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  noteStep('opened access workspace');

  await accessDialog().locator('input[placeholder="General learner access"]').fill(createdInviteLabel);
  await accessDialog().getByRole('button', { name: /^Create invite$/ }).click();
  await accessDialog().getByText(createdInviteLabel, { exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
  noteStep('created access invite');

  await accessInviteCard(createdInviteLabel).getByRole('button', { name: /^Edit$/ }).click();
  await accessDialog().locator('input[placeholder="General learner access"]').fill(updatedInviteLabel);
  await accessDialog().getByRole('button', { name: /^Save invite$/ }).click();
  await accessDialog().getByText(updatedInviteLabel, { exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
  noteStep('edited access invite');

  await page.getByRole('button', { name: /Close Access/i }).click();
  await accessDialog().waitFor({ state: 'hidden', timeout: 10_000 });

  await page.getByRole('button', { name: /Analytics/i }).first().click();
  await analyticsDialog().waitFor({ state: 'visible', timeout: 10_000 });
  await analyticsDialog().getByText('What needs action now', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  await analyticsDialog().getByText('Learners who need follow-up', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  await analyticsDialog().getByText('Assignments drifting', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  await analyticsDialog().getByText('Performance movement', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  noteStep('opened analytics workspace');

  if (result.pageErrors.length > 0) {
    throw new Error(`Page errors detected: ${result.pageErrors.join(' | ')}`);
  }
  if (result.apiFailures.length > 0) {
    throw new Error(`API failures detected: ${JSON.stringify(result.apiFailures, null, 2)}`);
  }

  await page.screenshot({ path: path.join(outputDir, 'teams-assignments-smoke-success.png'), fullPage: true });
  result.success = true;
} catch (runError) {
  result.error = String(runError?.stack || runError);
  try {
    await page.screenshot({ path: path.join(outputDir, 'teams-assignments-smoke-failure.png'), fullPage: true });
  } catch {}
} finally {
  await browser.close();

  try {
    const { data: cleanupAssignments } = await adminSupabase
      .from('skill_team_assignments')
      .select('id,title')
      .eq('team_id', seed.teamId)
      .in('title', cleanupTitles);

    if (cleanupAssignments?.length) {
      const cleanupIds = cleanupAssignments.map((assignment) => assignment.id);
      const { error: cleanupError } = await adminSupabase
        .from('skill_team_assignments')
        .delete()
        .in('id', cleanupIds);
      if (cleanupError) throw cleanupError;
      result.details.cleanedUpAssignments = cleanupAssignments.map((assignment) => assignment.title);
    }
  } catch (cleanupError) {
    result.details.cleanupError = String(cleanupError?.message || cleanupError);
  }

  try {
    const { data: cleanupInvites } = await adminSupabase
      .from('skill_team_invites')
      .select('id,label')
      .eq('team_id', seed.teamId)
      .in('label', cleanupInviteLabels);

    if (cleanupInvites?.length) {
      const cleanupIds = cleanupInvites.map((invite) => invite.id);
      const { error: cleanupInviteError } = await adminSupabase
        .from('skill_team_invites')
        .delete()
        .in('id', cleanupIds);
      if (cleanupInviteError) throw cleanupInviteError;
      result.details.cleanedUpInvites = cleanupInvites.map((invite) => invite.label);
    }
  } catch (cleanupError) {
    result.details.inviteCleanupError = String(cleanupError?.message || cleanupError);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'teams-assignments-smoke-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
