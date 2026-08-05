import { describe, it, expect } from 'vitest';
import { platformMeta, type PlatformMeta } from '../../lib/platformMeta';

describe('platformMeta', () => {
  it('contains all expected platforms', () => {
    const platforms = Object.keys(platformMeta);
    expect(platforms).toContain('instagram_carousel');
    expect(platforms).toContain('linkedin_post');
    expect(platforms).toContain('twitter_thread');
    expect(platforms).toContain('instagram_caption');
    expect(platforms).toContain('video_script');
  });

  it('has correct metadata for instagram_carousel', () => {
    const meta = platformMeta.instagram_carousel;
    expect(meta.label).toBe('Carousel');
    expect(meta.color).toBe('#EC4899');
    expect(meta.badgeClass).toBe('badge-pink');
  });

  it('has correct metadata for linkedin_post', () => {
    const meta = platformMeta.linkedin_post;
    expect(meta.label).toBe('LinkedIn');
    expect(meta.color).toBe('#60A5FA');
    expect(meta.badgeClass).toBe('badge-blue');
  });

  it('has correct metadata for twitter_thread', () => {
    const meta = platformMeta.twitter_thread;
    expect(meta.label).toBe('Twitter');
    expect(meta.color).toBe('#22D3EE');
    expect(meta.badgeClass).toBe('badge-cyan');
  });

  it('has correct metadata for instagram_caption', () => {
    const meta = platformMeta.instagram_caption;
    expect(meta.label).toBe('Caption');
    expect(meta.color).toBe('#A78BFA');
    expect(meta.badgeClass).toBe('badge-purple');
  });

  it('has correct metadata for video_script', () => {
    const meta = platformMeta.video_script;
    expect(meta.label).toBe('Video');
    expect(meta.color).toBe('#F87171');
    expect(meta.badgeClass).toBe('badge-red');
  });

  it('each platform has all required fields', () => {
    Object.values(platformMeta).forEach((meta: PlatformMeta) => {
      expect(meta).toHaveProperty('label');
      expect(meta).toHaveProperty('color');
      expect(meta).toHaveProperty('Icon');
      expect(meta).toHaveProperty('bg');
      expect(meta).toHaveProperty('border');
      expect(meta).toHaveProperty('badgeClass');
    });
  });

  it('all badge classes are unique', () => {
    const badgeClasses = Object.values(platformMeta).map((meta) => meta.badgeClass);
    const uniqueClasses = new Set(badgeClasses);
    expect(uniqueClasses.size).toBe(badgeClasses.length);
  });

  it('all colors are unique', () => {
    const colors = Object.values(platformMeta).map((meta) => meta.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(colors.length);
  });
});
