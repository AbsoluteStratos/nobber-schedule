import { access, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DateTime, IANAZone } from 'luxon';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = resolve(projectRoot, 'public');
const scheduleFiles = [
  { path: 'src/data/schedule.json', requireSiteExtras: true },
  { path: 'src/data/schedule-2025.json', requireSiteExtras: false },
];
const supportedSocialIcons = new Set(['twitch', 'youtube', 'bluesky']);
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const errors = [];

const addError = (file, field, message) => {
  errors.push(`${file}: ${field} ${message}`);
};

const requireString = (file, field, value) => {
  if (typeof value !== 'string' || !value.trim()) {
    addError(file, field, 'must be a non-empty string.');
    return false;
  }
  return true;
};

const validateUrl = (file, field, value, allowEmpty = false) => {
  if (allowEmpty && (value === '' || value === undefined)) return;
  if (!requireString(file, field, value)) return;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      addError(file, field, 'must use http:// or https://.');
    }
  } catch {
    addError(file, field, 'must be a valid URL.');
  }
};

const validateAsset = async (file, field, value) => {
  if (!requireString(file, field, value)) return;

  const assetPath = resolve(publicRoot, value.replace(/^[/\\]+/, ''));
  const relativePath = relative(publicRoot, assetPath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    addError(file, field, 'must resolve inside public/.');
    return;
  }

  try {
    await access(assetPath);
  } catch {
    addError(file, field, `references missing asset public/${value}.`);
  }
};

const validateTimestamp = (file, field, value, timeZone) => {
  if (!requireString(file, field, value)) return null;
  if (!timestampPattern.test(value)) {
    addError(file, field, 'must use YYYY-MM-DDTHH:mm:ss without an offset.');
    return null;
  }

  const parsed = DateTime.fromISO(value, { zone: timeZone });
  if (!parsed.isValid || parsed.toFormat("yyyy-MM-dd'T'HH:mm:ss") !== value) {
    addError(file, field, `is not a valid wall-clock time in ${timeZone}.`);
    return null;
  }
  return parsed;
};

const validateSchedule = async ({ path: schedulePath, requireSiteExtras }) => {
  const fullPath = resolve(projectRoot, schedulePath);
  let schedule;

  try {
    schedule = JSON.parse(await readFile(fullPath, 'utf8'));
  } catch (error) {
    if (!requireSiteExtras && error.code === 'ENOENT') return;
    addError(schedulePath, 'file', `could not be read as JSON (${error.message}).`);
    return;
  }

  requireString(schedulePath, 'site.eyebrow', schedule.site?.eyebrow);
  requireString(schedulePath, 'site.title', schedule.site?.title);
  requireString(schedulePath, 'site.subtitle', schedule.site?.subtitle);

  const timeZone = schedule['time-zone'];
  if (requireString(schedulePath, 'time-zone', timeZone) && !IANAZone.isValidZone(timeZone)) {
    addError(schedulePath, 'time-zone', `is not a valid IANA timezone (${timeZone}).`);
  }

  if (!Array.isArray(schedule.events) || schedule.events.length === 0) {
    addError(schedulePath, 'events', 'must be a non-empty array.');
  } else if (IANAZone.isValidZone(timeZone)) {
    let previousStart = null;
    for (const [index, event] of schedule.events.entries()) {
      const field = `events[${index}]`;
      requireString(schedulePath, `${field}.title`, event?.title);
      requireString(schedulePath, `${field}.description`, event?.description);
      await validateAsset(schedulePath, `${field}.image`, event?.image);

      const start = validateTimestamp(schedulePath, `${field}.start-time`, event?.['start-time'], timeZone);
      const end = validateTimestamp(schedulePath, `${field}.end-time`, event?.['end-time'], timeZone);
      if (start && end && end <= start) {
        addError(schedulePath, `${field}.end-time`, 'must be later than start-time.');
      }
      if (start && previousStart && start < previousStart) {
        addError(schedulePath, `${field}.start-time`, 'must not be earlier than the preceding event.');
      }
      if (start) previousStart = start;

      if (event?.players !== undefined && (
        !Array.isArray(event.players)
        || event.players.length === 0
        || event.players.some((player) => typeof player !== 'string' || !player.trim())
      )) {
        addError(schedulePath, `${field}.players`, 'must be a non-empty array of non-empty strings when provided.');
      }
    }
  }

  requireString(schedulePath, 'footer.message', schedule.footer?.message);
  if (!Array.isArray(schedule.footer?.['floating-images'])) {
    addError(schedulePath, 'footer.floating-images', 'must be an array.');
  } else {
    for (const [index, decoration] of schedule.footer['floating-images'].entries()) {
      const field = `footer.floating-images[${index}]`;
      await validateAsset(schedulePath, `${field}.image`, decoration?.image);
      if (typeof decoration?.alt !== 'string') addError(schedulePath, `${field}.alt`, 'must be a string.');
      if (!['left', 'right'].includes(decoration?.side)) addError(schedulePath, `${field}.side`, 'must be left or right.');
      for (const property of ['offset', 'size', 'duration', 'delay']) {
        requireString(schedulePath, `${field}.${property}`, decoration?.[property]);
      }
    }
  }

  if (!requireSiteExtras) return;

  requireString(schedulePath, 'merch.label', schedule.merch?.label);
  requireString(schedulePath, 'merch.title', schedule.merch?.title);
  requireString(schedulePath, 'merch.button-label', schedule.merch?.['button-label']);
  validateUrl(schedulePath, 'merch.url', schedule.merch?.url, true);

  if (!Array.isArray(schedule['social-links']) || schedule['social-links'].length === 0) {
    addError(schedulePath, 'social-links', 'must be a non-empty array.');
  } else {
    for (const [index, social] of schedule['social-links'].entries()) {
      const field = `social-links[${index}]`;
      requireString(schedulePath, `${field}.label`, social?.label);
      validateUrl(schedulePath, `${field}.url`, social?.url);
      if (!supportedSocialIcons.has(social?.icon)) {
        addError(schedulePath, `${field}.icon`, `must be one of: ${[...supportedSocialIcons].join(', ')}.`);
      }
    }
    if (!schedule['social-links'].some((social) => social?.icon === 'twitch')) {
      addError(schedulePath, 'social-links', 'must include a twitch entry for Live now links.');
    }
  }
};

for (const scheduleFile of scheduleFiles) {
  await validateSchedule(scheduleFile);
}

if (errors.length) {
  console.error(`Schedule validation failed with ${errors.length} error${errors.length === 1 ? '' : 's'}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Validated ${scheduleFiles.length} schedule files.`);
}
