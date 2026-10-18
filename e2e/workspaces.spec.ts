import { test, expect, type Page } from '@playwright/test';
const { Buffer } = require('node:buffer');
import { stagingCredentials } from '../scripts/staging-auth.mjs';
const randomUUID = () => crypto.randomUUID();

const api = process.env.BUBBLE_E2E_API_URL || 'http://localhost:8085';
const bubble = { id: 'test-space', title: 'Test space', description: 'Disposable test data', parentId: null, order: 0, cardImageRatio: 1 };
const original = { id: 'local-original', bubbleId: bubble.id, type: 'NOTE', title: 'Local original', body: 'Local private text', preview: 'Local private text', meta: 'Note', order: 0 };
async function seed(page: Page) {
  await page.goto('/');
  await page.evaluate(({ bubble, original }) => {
    localStorage.setItem('bubble.bubbles.v1', JSON.stringify([bubble]));
    localStorage.setItem('bubble.items.v1', JSON.stringify([original]));
  }, { bubble, original });
  await page.reload();
}
async function register(page: Page) {
  const email = `browser-${randomUUID()}@example.test`;
  const password = `Disposable-${randomUUID()}`;
  await page.goto('/account');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await page.getByRole('textbox', { name: 'Account display name', exact: true }).fill('Browser tester');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account and sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open account and workspace settings' })).toContainText(email);
  return { email, password };
}
async function search(page: Page, query: string) {
  await page.goto('/search');
  await page.getByRole('textbox', { name: 'Search everything' }).fill(query);
}
async function createNote(page: Page, title = 'Browser note') {
  await page.getByRole('button', { name: 'Add content', exact: true }).click();
  await page.getByRole('button', { name: /Note.*Write a thought/ }).click();
  await expect(page.getByRole('button', { name: 'Choose Home or a destination Bubble' })).toContainText('Home');
  await page.getByRole('textbox', { name: 'Note title', exact: true }).fill(title);
  await page.getByRole('textbox', { name: 'Note text', exact: true }).fill('A searchable browser thought');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByRole('button', { name: `Open ${title} note`, exact: true })).toBeVisible();
}
async function edit(page: Page, title: string, kind = 'note') {
  await page.getByRole('button', { name: `Manage ${title} ${kind}`, exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
}

test('account Bubbles and photos sync privately while Home remains the default destination', async ({page})=>{
  await register(page);
  await page.goto('/');
  await page.getByRole('button',{name:'Add content',exact:true}).click();
  await page.getByRole('button',{name:/Bubble.*A collection/}).click();
  await page.getByRole('textbox',{name:'Bubble title',exact:true}).fill('Synthetic cover Bubble');
  await page.getByRole('button',{name:'Create Bubble',exact:true}).click();
  await expect(page.getByRole('alert').last()).toContainText('Choose a cover photo');
  const chooser=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'Choose cover photo',exact:true}).click();
  // Public synthetic one-pixel PNG, never a personal photo.
  await (await chooser).setFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});
  await page.getByRole('button',{name:'Create Bubble',exact:true}).click();
  await expect(page.getByRole('button',{name:'Open Synthetic cover Bubble Bubble',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button',{name:'Open Synthetic cover Bubble Bubble',exact:true})).toBeVisible();
  await createNote(page,'Standalone account thought');
  await expect(page.getByRole('button',{name:'Open Standalone account thought note',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Open Standalone account thought note',exact:true}).click();
  await expect(page).toHaveURL(/\/file\//);
  await expect(page.getByText('A searchable browser thought',{exact:true}).last()).toBeVisible();
  await page.goto('/');
  await page.getByRole('button',{name:'Add content',exact:true}).click();
  await page.getByRole('button',{name:/Photo.*Keep an image/}).click();
  await expect(page.getByRole('button',{name:'Choose Home or a destination Bubble'})).toContainText('Home');
  const photo=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Choose photo',exact:true}).click();
  await (await photo).setFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});
  await page.getByRole('textbox',{name:'Photo title',exact:true}).fill('Synthetic cloud photo');
  await page.getByRole('textbox',{name:'Photo description',exact:true}).fill('Photo keyword orchid');
  await page.getByRole('button',{name:'Save photo',exact:true}).click();
  // Wait for server-confirmed creation before simulating a restart. Reloading
  // immediately after the click can cancel the upload on a slower CI runner.
  await expect(page.getByRole('button',{name:'Open Synthetic cloud photo photo',exact:true})).toBeVisible();
  await page.reload();await search(page,'orchid');
  await expect(page.getByRole('button',{name:'Open Synthetic cloud photo photo',exact:true})).toBeVisible();
});

test('local notes survive offline editing, refresh and a new browser context', async ({ page, browser, baseURL }) => {
  const accountCalls: string[] = [];
  page.on('request', request => { if (request.url().startsWith(api+'/api/v1/')) accountCalls.push(request.url()); });
  await seed(page);
  const beforeDraft = await page.evaluate(() => localStorage.getItem('bubble.items.v1'));
  await page.getByRole('button', { name: 'Add content', exact: true }).click();
  await page.getByRole('button', { name: /Note.*Write a thought/ }).click();
  await page.getByRole('textbox', { name: 'Note text', exact: true }).fill('Keep this unfinished creation');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('Your unsaved creation will be lost.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Note text', exact: true })).toHaveValue('Keep this unfinished creation');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Note text', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('bubble.items.v1'))).toBe(beforeDraft);
  await page.getByRole('button', { name: 'Add content', exact: true }).click();
  await page.getByRole('button', { name: /Note.*Write a thought/ }).click();
  await expect(page.getByRole('textbox', { name: 'Note text', exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('Your unsaved creation will be lost.', { exact: true })).toHaveCount(0);
  await page.goto('/file/local-original');
  await expect(page.getByText('Local private text', { exact: true })).toBeVisible();
  await page.route(`${api}/api/v1/**`, route => route.abort());
  await page.context().setOffline(true);
  await edit(page, 'Local original');
  const savedBeforeFailure = await page.evaluate(() => localStorage.getItem('bubble.items.v1'));
  await page.evaluate(() => {
    const originalSet = Storage.prototype.setItem;
    Object.defineProperty(window, '__restoreBubbleTestStorage', { configurable: true, value: () => { Storage.prototype.setItem = originalSet; } });
    Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
      if (key === 'bubble.items.v1') throw new DOMException('Synthetic storage full', 'QuotaExceededError');
      return originalSet.call(this, key, value);
    };
  });
  await page.getByRole('textbox', { name: 'Note text', exact: true }).fill('Unsaved local draft');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Note text', exact: true })).toHaveValue('Unsaved local draft');
  await expect(page.getByRole('alert').last()).toContainText('Synthetic storage full');
  expect(await page.evaluate(() => localStorage.getItem('bubble.items.v1'))).toBe(savedBeforeFailure);
  await page.evaluate(() => { Object.getOwnPropertyDescriptor(window, '__restoreBubbleTestStorage')!.value(); Reflect.deleteProperty(window, '__restoreBubbleTestStorage'); });
  await page.getByRole('textbox', { name: 'Note text', exact: true }).fill('Edited without internet');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Edited without internet', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Go back' }).click();
  await createNote(page, 'Offline created note');
  await page.context().setOffline(false);
  await page.reload();
  const state = await page.context().storageState();
  const next = await browser.newContext({ baseURL, storageState: state, httpCredentials:stagingCredentials(baseURL??api) });
  const reopened = await next.newPage();
  await reopened.goto('/file/local-original');
  await expect(reopened.getByText('Edited without internet', { exact: true })).toBeVisible();
  await search(reopened, 'Offline created');
  await expect(reopened.getByRole('button', { name: 'Open Offline created note note' })).toBeVisible();
  expect(accountCalls).toEqual([]);
  await next.close();
});

test('registration, invalid credentials, session restoration, expiry and logout', async ({ page }) => {
  const { email, password } = await register(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open account and workspace settings' })).toContainText(email);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert').first()).toContainText('Email or password is incorrect.');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open account and workspace settings' })).toContainText(email);
  await page.context().clearCookies();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open account and workspace settings' })).toContainText('Sign in required');
  await expect(page.getByRole('alert').first()).toContainText('Sign in again');
  await search(page, 'unavailable');
  await expect(page.getByText('No matching thoughts yet', { exact: true })).toHaveCount(0);
});

test('account note create, edit, pin, search, direct refresh and delete', async ({ page }) => {
  await register(page);
  await createNote(page);
  await page.getByRole('button', { name: 'Open Browser note note' }).click();
  await edit(page, 'Browser note');
  await page.getByRole('textbox', { name: 'Note text', exact: true }).fill('UNIQUE edited body');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.reload();
  await expect(page.getByText('UNIQUE edited body', { exact: true })).toBeVisible();
  await search(page, 'unique EDITED');
  const card = page.getByRole('button', { name: 'Open Browser note note' });
  await card.click({ button: 'right' });
  await page.getByRole('button', { name: 'Pin to top', exact: true }).click();
  await card.click({ button: 'right' });
  await page.getByRole('button', { name: 'Unpin', exact: true }).click();
  await page.getByRole('button', { name: 'Lists', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lists', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(card).toHaveCount(0);
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await card.click();
  await page.getByRole('button', { name: 'Manage Browser note note' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete note', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open Browser note note' })).toHaveCount(0);
});

test('checklist items, completion and deletion persist through the editor', async ({ page }) => {
  await register(page);
  await page.getByRole('button', { name: 'Add content', exact: true }).click();
  await page.getByRole('button', { name: /Checklist.*A list to work/ }).click();
  await page.getByRole('button', { name: /Add title/ }).click();
  await page.getByRole('textbox', { name: 'Checklist title', exact: true }).fill('Browser list');
  await page.getByRole('textbox', { name: 'Checklist item 1', exact: true }).fill('Tea');
  await page.getByRole('button', { name: 'Add checklist item' }).click();
  await page.getByRole('textbox', { name: 'Checklist item 2', exact: true }).fill('Milk');
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save checklist', exact: true }).click();
  await page.getByRole('button', { name: 'Open Browser list checklist' }).click();
  await page.getByRole('checkbox', { name: 'Tea', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Tea', exact: true })).toBeChecked();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Tea', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Tea', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Tea', exact: true })).not.toBeChecked();
  await edit(page, 'Browser list', 'checklist');
  await expect(page.getByRole('checkbox', { name: 'Checklist item 1: Tea', exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'Remove item 1', exact: true }).click();
  await page.getByRole('button', { name: 'Add checklist item' }).click();
  await page.getByRole('textbox', { name: 'Checklist item 2', exact: true }).fill('Bread');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('checkbox')).toHaveCount(2);
  await expect(page.getByRole('checkbox').first()).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Milk', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Bread', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Tea', exact: true })).toHaveCount(0);
});

test('profile and account light, dark, system and accent preferences persist', async ({ page }) => {
  await register(page);
  await page.goto('/you');
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByRole('textbox', { name: 'Display name', exact: true }).fill('Updated tester');
  await page.getByRole('textbox', { name: 'Short bio', exact: true }).fill('A browser-tested bio');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Profile updated.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Updated tester', { exact: true })).toBeVisible();
  await expect(page.getByText('A browser-tested bio', { exact: true })).toBeVisible();
  for (const mode of ['Dark', 'Light', 'System']) {
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await page.getByRole('radio', { name: new RegExp(`^${mode}`) }).click();
    await expect(page.getByRole('radio', { name: new RegExp(`^${mode}`) })).toBeChecked();
    await page.getByRole('radio', { name: 'Sky blue app color', exact: true }).click();
    await expect(page.getByRole('radio', { name: 'Sky blue app color', exact: true })).toBeChecked();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await expect(page.getByRole('radio', { name: new RegExp(`^${mode}`) })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Sky blue app color', exact: true })).toBeChecked();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
  }
});

test('backend outage retains failed draft and local originals; selected copy is explicit', async ({ page }) => {
  await seed(page);
  const localBefore = await page.evaluate(() => localStorage.getItem('bubble.items.v1'));
  await register(page);
  await page.goto('/search');
  await expect(page.getByRole('button', { name: 'Open Local original note' })).toHaveCount(0);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Review local notes and lists' }).click();
  await page.getByRole('checkbox', { name: 'Copy Local original' }).click();
  await expect(page.getByRole('checkbox', { name: 'Copy Local original' })).toBeChecked();
  await page.getByRole('button', { name: 'Copy 1 selected items to my account' }).click();
  await expect(page.getByRole('alert').first()).toContainText('Copied 1 new items');
  expect(await page.evaluate(() => localStorage.getItem('bubble.items.v1'))).toBe(localBefore);
  await search(page, 'Local private');
  await page.getByRole('button', { name: 'Open Local original note' }).click();
  await edit(page, 'Local original');
  await page.getByRole('textbox', { name: 'Note text', exact: true }).fill('Unsaved offline account draft');
  await page.route(`${api}/api/v1/**`, route => route.abort());
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Note text', exact: true })).toHaveValue('Unsaved offline account draft');
  await expect(page.getByRole('alert').last()).toContainText(/Connection lost|Cannot reach your account/);
  expect(await page.evaluate(() => localStorage.getItem('bubble.items.v1'))).toBe(localBefore);
});

test('mobile navigation, empty search, clear action and validation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Search tab' }).click();
  await expect(page.getByRole('button', { name: 'Search tab' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('A little space waiting to be filled', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search everything' }).fill('missing');
  await expect(page.getByText('No matching thoughts yet', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Search everything' })).toHaveValue('');
  await page.getByRole('button', { name: 'You tab' }).click();
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByRole('textbox', { name: 'Display name', exact: true }).fill('');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('alert').last()).toBeVisible();
  await page.getByRole('textbox', { name: 'Display name', exact: true }).fill('Local browser tester');
  await page.getByRole('button', { name: 'Use 🐱 avatar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use 🐱 avatar', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Profile updated.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Local browser tester', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use 🐱 avatar', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test('pending and failed account searches do not claim there are no matches', async ({ page }) => {
  await register(page);
  let release: (() => void) | undefined;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`${api}/api/v1/notes?q=**`, async route => { await gate; await route.abort(); });
  await search(page, 'pending');
  await expect(page.getByText('Searching…', { exact: true })).toBeVisible();
  await expect(page.getByText('No matching thoughts yet', { exact: true })).toHaveCount(0);
  release!();
  await expect(page.getByText('Search could not finish. Check your connection and try again.', { exact: true })).toBeVisible();
  await expect(page.getByText('No matching thoughts yet', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(page.getByText('Searching…', { exact: true })).toHaveCount(0);
});

test('card options support keyboard pinning at mobile, tablet and desktop widths', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page);
  await page.goto(`/bubble/${bubble.id}`);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const options = page.getByRole('button', { name: 'Options for Local original note', exact: true });
    await expect(options).toBeVisible();
    await options.focus();
    await expect(options).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Pin to top', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Options for Local original note', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Pin to top', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Options for pinned Local original note', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Options for pinned Local original note', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unpin', exact: true })).toBeVisible();
});
