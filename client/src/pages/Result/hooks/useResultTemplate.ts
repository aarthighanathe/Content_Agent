// WHY extracted from Result.tsx: template override + brand identity resolution
// (~70 lines) kept the page over the 400-line hard cap.
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { setCarouselTemplate, getProfile } from '../../../api';
import { deriveColorSystem, THEME_ACCENTS } from '../../../lib/colorSystem';
import type { ColorSystem } from '../../../lib/colorSystem';
import type { ContentJob } from '../../../types/job';
import { useCarouselDesignSeed } from './useCarouselDesignSeed';
import type { ResultContent } from '../components/ContentColumn';

export interface ResultTemplateState {
  templateId: string | undefined;
  paletteId: string | undefined;
  brandName: string;
  handle: string;
  colorSystem: ColorSystem;
  designPreset: number;
  onTemplateSwitch: (newTemplateId: string, newPaletteId?: string) => Promise<void>;
}

export function useResultTemplate(
  jobId: string | undefined,
  jobData: ContentJob | null | undefined,
  colorTheme: number,
  isCarousel: boolean,
  content: ResultContent | undefined,
  onSaveError: (message: string) => void,
): ResultTemplateState {
  // Template selection: an in-Result override (set by switching templates
  // post-generation) takes priority; otherwise this reads the template the job
  // was created with. localStorage is only a last-resort fallback for carousels
  // generated before this feature shipped.
  const [templateOverride, setTemplateOverride] = useState<{ templateId: string; paletteId?: string } | null>(null);
  // WHY reset on jobId change: this page's route isn't keyed, so navigating
  // between two jobs' results reuses this component instance.
  useEffect(() => {
    setTemplateOverride(null);
  }, [jobId]);

  const templateId = templateOverride?.templateId ?? jobData?.templateId ?? undefined;
  const paletteId = templateOverride?.paletteId ?? jobData?.paletteId ?? undefined;

  async function onTemplateSwitch(newTemplateId: string, newPaletteId?: string): Promise<void> {
    setTemplateOverride({ templateId: newTemplateId, paletteId: newPaletteId });
    if (!jobId) return;
    try {
      await setCarouselTemplate(jobId, newTemplateId, newPaletteId);
    } catch {
      onSaveError('Couldn’t save template choice — preview updated, but it may not stick after reload.');
    }
  }

  // brandName/handle are ONLY populated from the user's real Brand Voice settings
  // — never fabricated from the topic text.
  const { data: profile } = useQuery({
    queryKey: ['dashboard', 'profile'],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
  });
  const brandName = profile?.brandName?.trim() || '';
  const handle = brandName ? `@${brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '';
  const colorSystem = useMemo(
    () => deriveColorSystem(THEME_ACCENTS[colorTheme] ?? THEME_ACCENTS[0]),
    [colorTheme],
  );
  // WHY !templateId: IGSlide only reads designPreset on the legacy (no-template)
  // render branch — template-system carousels skip the hash/write cycle.
  // WHY Array.isArray: ResultContent is a union; design seed only applies to
  // carousel slide arrays (legacy theme branch), never PlatformContent blobs.
  const designPreset = useCarouselDesignSeed(
    isCarousel && !templateId && Array.isArray(content) ? content : undefined,
  );

  return {
    templateId,
    paletteId,
    brandName,
    handle,
    colorSystem,
    designPreset,
    onTemplateSwitch,
  };
}
