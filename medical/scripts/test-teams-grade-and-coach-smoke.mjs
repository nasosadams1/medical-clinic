import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(rootDir, '.tmp_smoke');
const envPath = path.join(rootDir, '.env');
const seedPath = process.env.TEAMS_SMOKE_SEED_FILE || path.join(outputDir, 'teams-smoke-seed.json');
const appUrl = process.env.TEAMS_SMOKE_APP_URL || 'http://localhost:5173/app';

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
        description: 'Seeded team for grade-and-coach smoke coverage.',
        use_case: 'bootcamps',
        seat_limit: 25,
        created_by: owner.id,
      })
      .select('id,name')
      .single();
    if (error || !data) throw new Error(error?.message || 'Could not create smoke team.');
    team = data;
  }

  const { error: ownerMembershipError } = await adminSupabase.from('skill_team_memberships').upsert(
    {
      team_id: team.id,
      user_id: owner.id,
      role: 'owner',
      status: 'active',
    },
    { onConflict: 'team_id,user_id' }
  );
  if (ownerMembershipError) throw ownerMembershipError;

  const { error: learnerMembershipError } = await adminSupabase.from('skill_team_memberships').upsert(
    {
      team_id: team.id,
      user_id: learner.id,
      role: 'learner',
      status: 'active',
    },
    { onConflict: 'team_id,user_id' }
  );
  if (learnerMembershipError) throw learnerMembershipError;

  const { error: learnerBMembershipError } = await adminSupabase.from('skill_team_memberships').upsert(
    {
      team_id: team.id,
      user_id: learnerB.id,
      role: 'learner',
      status: 'active',
    },
    { onConflict: 'team_id,user_id' }
  );
  if (learnerBMembershipError) throw learnerBMembershipError;

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
        description: 'Seeded assignment for grade-and-coach smoke coverage.',
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

  const { data: existingSubmission } = await adminSupabase
    .from('skill_team_submissions')
    .select('id')
    .eq('team_id', team.id)
    .eq('member_user_id', learner.id)
    .eq('assignment_id', assignment.id)
    .limit(1)
    .maybeSingle();

  if (!existingSubmission) {
    const { error } = await adminSupabase.from('skill_team_submissions').insert({
      team_id: team.id,
      assignment_id: assignment.id,
      member_user_id: learner.id,
      submitted_by_user_id: learner.id,
      submission_type: 'written',
      title: 'Smoke attempt 1',
      body: 'The learner solution is attached for grade-and-coach smoke coverage.',
      external_url: null,
      code_language: null,
      status: 'submitted',
      rubric_score: null,
      attempt_number: 1,
    });
    if (error) throw error;
  }

  const { data: existingSubmissionB } = await adminSupabase
    .from('skill_team_submissions')
    .select('id')
    .eq('team_id', team.id)
    .eq('member_user_id', learnerB.id)
    .eq('assignment_id', assignment.id)
    .limit(1)
    .maybeSingle();

  if (!existingSubmissionB) {
    const { error } = await adminSupabase.from('skill_team_submissions').insert({
      team_id: team.id,
      assignment_id: assignment.id,
      member_user_id: learnerB.id,
      submitted_by_user_id: learnerB.id,
      submission_type: 'written',
      title: 'Smoke attempt 2',
      body: 'The second learner solution is attached for queue navigation smoke coverage.',
      external_url: null,
      code_language: null,
      status: 'submitted',
      rubric_score: null,
      attempt_number: 1,
    });
    if (error) throw error;
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

const draftSummary = `Draft summary baseline for smoke test ${Date.now()}.`;

const noteStep = (step, extra = {}) => {
  result.steps.push({ step, ...extra });
};

const { data, error } = await supabase.auth.signInWithPassword({
  email: seed.ownerEmail,
  password: seed.password,
});

if (error) {
  throw error;
}

if (!data.session) {
  throw new Error('No Supabase session returned for Teams smoke user.');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });

await context.addInitScript((sessionValue) => {
  window.localStorage.setItem('codhak-auth', JSON.stringify(sessionValue));
  window.localStorage.setItem('codhak-taskbar-visible', '1');
}, data.session);

const page = await context.newPage();

page.on('pageerror', (pageError) => {
  result.pageErrors.push(String(pageError));
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

const getBodyText = () => page.locator('body').innerText();
const extractFocusedLearner = (bodyText) => {
  const match = bodyText.match(/Learner\s*\n([^\n]+)/);
  return match?.[1]?.trim() || null;
};

const expectBodyIncludes = async (text) => {
  const bodyText = await getBodyText();
  if (!bodyText.includes(text)) {
    throw new Error(`Expected body to include: ${text}`);
  }
  return bodyText;
};

const composerSummary = () => page.locator('textarea').nth(0);
const composerStrengths = () => page.locator('textarea').nth(1);
const composerFocusAreas = () => page.locator('textarea').nth(2);
const composerCoachNotes = () => page.locator('textarea').nth(3);
const rubricInputs = () => page.locator('input[type=range]');
const closeComposerButton = () => page.getByRole('button', { name: 'Close Grade and coach' });
const confirmDialog = () => page.locator('[role="alertdialog"]');
const composerActionButton = (label) =>
  page.locator('button.inline-flex').filter({ hasText: label }).last();
const setRubricScore = async (index, value) => {
  await rubricInputs()
    .nth(index)
    .evaluate((element, nextValue) => {
      const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      valueSetter?.call(element, String(nextValue));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
};

try {
  await page.goto(appUrl, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForTimeout(4_000);
  noteStep('opened app');

  await page.locator('aside button').nth(4).click();
  await page.waitForURL(/section=teams/, { timeout: 10_000 });
  await page.waitForTimeout(1_500);
  noteStep('opened teams section');

  await page.locator('select').first().selectOption(seed.teamId);
  await page.waitForTimeout(2_500);
  await expectBodyIncludes(seed.teamName);
  noteStep('selected smoke team');

  const gradeAndCoachButton = page.getByRole('button', { name: /Grade and coach/i }).first();
  await gradeAndCoachButton.waitFor({ state: 'visible', timeout: 10_000 });
  await gradeAndCoachButton.click();
  await closeComposerButton().waitFor({ state: 'visible', timeout: 10_000 });
  noteStep('opened grade and coach');

  result.details.closeButtonLabel = await closeComposerButton().getAttribute('aria-label');
  noteStep('verified accessible close label');

  let bodyText = await getBodyText();
  const learnerBeforeJ = extractFocusedLearner(bodyText);
  await page.keyboard.press('j');
  await page.waitForTimeout(800);
  bodyText = await getBodyText();
  const learnerAfterJ = extractFocusedLearner(bodyText);
  if (!learnerBeforeJ || !learnerAfterJ || learnerBeforeJ === learnerAfterJ) {
    throw new Error('Keyboard J did not move the focused learner.');
  }
  noteStep('keyboard j changed focused learner', { from: learnerBeforeJ, to: learnerAfterJ });

  await page.keyboard.press('k');
  await page.waitForTimeout(800);
  bodyText = await getBodyText();
  const learnerAfterK = extractFocusedLearner(bodyText);
  if (!learnerAfterK || learnerAfterK === learnerAfterJ) {
    throw new Error('Keyboard K did not move the focused learner back.');
  }
  noteStep('keyboard k changed focused learner again', { to: learnerAfterK });

  await page.getByRole('button', { name: /Smoke Learner A/ }).first().click();
  await page.waitForTimeout(800);
  noteStep('returned to learner A for review');

  const startReviewButton = page.getByRole('button', { name: 'Start review' }).last();
  const editReviewButton = page.getByRole('button', { name: 'Edit review' }).first();
  const openedExistingDraft = (await startReviewButton.count()) === 0 && (await editReviewButton.count()) > 0;

  if (openedExistingDraft) {
    await editReviewButton.click();
  } else {
    await startReviewButton.click();
  }
  await page.waitForTimeout(1_200);
  await expectBodyIncludes('1. Scope and evidence');
  noteStep(openedExistingDraft ? 'opened existing review composer' : 'opened review composer');

  await composerSummary().fill(draftSummary);
  await closeComposerButton().click();
  await confirmDialog().waitFor({ state: 'visible', timeout: 10_000 });
  result.details.discardPromptText = await confirmDialog().innerText();
  await page.getByRole('button', { name: 'Cancel' }).last().click();
  await page.waitForTimeout(700);

  const summaryAfterDismiss = await composerSummary().inputValue();
  if (summaryAfterDismiss !== draftSummary) {
    throw new Error('Unsaved summary was not preserved after dismissing discard dialog.');
  }
  noteStep('dismissed in-app discard dialog and kept draft');

  await setRubricScore(0, 8);
  await setRubricScore(1, 7);
  await setRubricScore(2, 7);
  await setRubricScore(3, 6);
  await composerStrengths().fill('Readable structure and a workable baseline approach.');
  await composerFocusAreas().fill('Edge cases still need more consistent handling.');
  await composerCoachNotes().fill('Use the next session to review boundary checks and final output polish.');
  await page.getByRole('button', { name: 'Save draft' }).first().click();
  noteStep('filled rubric and note fields');

  await composerActionButton(openedExistingDraft ? 'Save draft' : 'Save review').click();
  await page.getByText('Latest coaching note').first().waitFor({ state: 'visible', timeout: 15_000 });
  await expectBodyIncludes('Latest coaching note');
  await expectBodyIncludes(draftSummary);
  noteStep(openedExistingDraft ? 'updated draft feedback' : 'created draft feedback');

  await page.getByRole('button', { name: 'Edit review' }).first().click();
  await page.waitForTimeout(1_200);

  const learnerSelectDisabled = await page.locator('select').nth(1).isDisabled();
  const assignmentSelectDisabled = await page.locator('select').nth(2).isDisabled();
  result.details.editTargetLocked = {
    learner: learnerSelectDisabled,
    assignment: assignmentSelectDisabled,
  };

  if (!learnerSelectDisabled || !assignmentSelectDisabled) {
    throw new Error('Edit mode did not lock learner and assignment fields.');
  }

  await composerSummary().fill(`${draftSummary} UNSAVED CHANGE`);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await confirmDialog().waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByRole('button', { name: 'Discard draft' }).click();
  await page.getByText('Latest coaching note').first().waitFor({ state: 'visible', timeout: 15_000 });
  await expectBodyIncludes('Latest coaching note');
  noteStep('accepted in-app discard dialog from edit mode');

  await page.getByRole('button', { name: 'Edit review' }).first().click();
  await page.waitForTimeout(1_000);

  const summaryAfterReopen = await composerSummary().inputValue();
  result.details.summaryAfterReopen = summaryAfterReopen;
  if (summaryAfterReopen.includes('UNSAVED CHANGE')) {
    throw new Error('Discarded edit was still present after reopening review.');
  }
  noteStep('discarded edit did not persist');

  await page.getByRole('button', { name: 'Share to learner' }).click();
  await page.waitForTimeout(300);
  await composerActionButton('Share to learner').click();
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('Shared') && text.includes('Smoke Learner A');
  });
  bodyText = await getBodyText();
  if (!bodyText.includes('Shared\nSmoke Learner A')) {
    throw new Error('Shared state was not visible after sharing review.');
  }
  noteStep('shared feedback');

  await page.getByRole('button', { name: 'Edit review' }).first().click();
  await page.waitForTimeout(1_000);
  await page.getByRole('button', { name: 'Mark resolved' }).click();
  await page.waitForTimeout(300);
  await composerActionButton('Resolve review').click();
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('Resolved') && text.includes('Smoke Learner A');
  });
  bodyText = await getBodyText();
  if (!bodyText.includes('Resolved\nSmoke Learner A')) {
    throw new Error('Resolved state was not visible after resolving review.');
  }
  noteStep('resolved feedback');

  await page.getByRole('button', { name: 'Delete' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await page.getByRole('button', { name: 'Start review' }).last().waitFor({ state: 'visible', timeout: 15_000 });
  bodyText = await getBodyText();
  if (!bodyText.includes('Start review')) {
    throw new Error('Start review did not return after deleting feedback.');
  }
  if (bodyText.includes('Latest coaching note')) {
    throw new Error('Feedback detail still visible after delete.');
  }
  noteStep('deleted feedback and returned to queue state');

  await page.screenshot({ path: path.join(outputDir, 'teams-grade-coach-smoke-success.png'), fullPage: true });
  result.success = true;
} catch (runError) {
  result.error = String(runError?.stack || runError);
  try {
    await page.screenshot({ path: path.join(outputDir, 'teams-grade-coach-smoke-failure.png'), fullPage: true });
  } catch {}
} finally {
  await browser.close();
  fs.writeFileSync(path.join(outputDir, 'teams-grade-coach-smoke-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
