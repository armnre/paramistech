import { describe, expect, it } from 'vitest';
import { isPubliclyVisible, isSettingsVisible, placeholdersAllowed } from './visibility';

const placeholder = { published: true, isPlaceholder: true };
const real = { published: true, isPlaceholder: false };

describe('placeholder visibility', () => {
  it('hides placeholder rows in production unless explicitly allowed', () => {
    const production = { NODE_ENV: 'production' } as NodeJS.ProcessEnv;
    expect(placeholdersAllowed(production)).toBe(false);
    expect(isPubliclyVisible(placeholder, production)).toBe(false);
    expect(isPubliclyVisible(real, production)).toBe(true);
    expect(isPubliclyVisible(placeholder, { ...production, ALLOW_PLACEHOLDERS: 'true' })).toBe(true);
  });

  it('keeps unpublished rows hidden everywhere', () => {
    expect(isPubliclyVisible({ published: false, isPlaceholder: false }, { NODE_ENV: 'development' })).toBe(false);
  });

  it('hides placeholder contact settings in production', () => {
    expect(isSettingsVisible({ isPlaceholder: true }, { NODE_ENV: 'production' })).toBe(false);
    expect(isSettingsVisible(null, { NODE_ENV: 'development' })).toBe(false);
  });
});
