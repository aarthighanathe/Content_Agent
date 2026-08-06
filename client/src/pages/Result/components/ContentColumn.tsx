import React from 'react';
import { platNames, platIcons } from '../constants';
import { IGCarouselPreview }   from './content/carousel/IGCarouselPreview';
import type { SlideData }      from './content/carousel/IGSlide';
import { LinkedInContent }     from './content/LinkedInContent';
import { TwitterContent }      from './content/TwitterContent';
import { InstagramContent }    from './content/InstagramContent';
import { VideoScriptContent }  from './content/VideoScriptContent';
import { ContentMultiplier }   from './ContentMultiplier';
import { CarouselTemplateSwitcher } from './content/carousel/CarouselTemplateSwitcher';
import type { ColorSystem } from '../../../lib/colorSystem';
import type { MultiplyEntry }  from '../hooks/useMultiplier';
import type { ContentJob, PlatformContent, VideoScriptContentData } from '../../../types/job';

// WHY union instead of a single shape: this column dispatches to one of five renderers
// (carousel slide array, LinkedIn/Twitter/Instagram's PlatformContent, or the structurally
// distinct VideoScriptContentData) based on which fields are present — same discriminated-
// by-field-presence pattern the JSX below already used before typing existed.
// WHY exported from here (not types/job.ts): SlideData is owned by the carousel/IGSlide
// module (page-specific, currently mid-split into carousel/igslide/ by a concurrent change);
// types/job.ts is the generic shared-types module and shouldn't import back down into a
// page's component tree. Result.tsx and ExportModal.tsx both import this alias rather than
// redefining an equivalent union, so the three stay structurally identical.
export type ResultContent = SlideData[] | PlatformContent | VideoScriptContentData;

interface Props {
  jobData:         ContentJob | null;
  content:         ResultContent;
  currentSlide:    number;
  setCurrentSlide: (n: number) => void;
  touchStartX:     React.MutableRefObject<number | null>;
  onSave:          (newContent: SlideData[] | PlatformContent) => Promise<void>;
  showMultiplier:  boolean;
  setShowMultiplier: (v: boolean) => void;
  multiplyJobs:    Record<string, MultiplyEntry>;
  onMultiply:      (platform: string) => void;
  className?:      string;
  slideRefs?:      React.MutableRefObject<(HTMLDivElement | null)[]>;
  /** Brand identity + palette + design preset are resolved in Result.tsx so the
   *  PNG export and this preview render from exactly the same inputs. */
  brandName:       string;
  handle:          string;
  colorSystem:     ColorSystem;
  designPreset:    number;
  // New template system fields — optional for backward compatibility with
  // carousels created before this feature shipped.
  templateId?:     string;
  paletteId?:      string;
  onTemplateChange?: (templateId: string, paletteId?: string) => void;
}

export function ContentColumn({
  jobData, content, currentSlide, setCurrentSlide,
  onSave, showMultiplier, setShowMultiplier,
  multiplyJobs, onMultiply, className, slideRefs,
  brandName, handle, colorSystem, designPreset,
  templateId, paletteId, onTemplateChange,
}: Props) {
  const isCarousel  = Array.isArray(content);
  const Icon        = jobData?.platform ? platIcons[jobData.platform] : undefined;
  const totalSlides = isCarousel ? content.length : (content as PlatformContent).tweets?.length ?? 0;

  // NOTE: the "Render with AI theme" flow was removed here. It asked Gemini to invent a
  // slide design and replaced this preview with it — a different look from both the
  // preview and the PNG download. The export now renders these same components
  // server-side, so the preview is already what you get.

  return (
    <div className={['rp-main', className].filter(Boolean).join(' ')}>
      {/* Platform header pill */}
      <div className="rp-plat-hd" style={{ borderBottom: '1px solid var(--rule)', paddingBottom: 14, marginBottom: 16 }}>
        <div className="rp-platform-pill">
          {Icon && <Icon size={18} style={{ color: 'var(--color-text-secondary)' }} />}
          <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: 0.2 }}>
            {(jobData?.platform && platNames[jobData.platform]) || jobData?.platform}
          </span>
          {totalSlides > 0 && (
            <>
              <div className="rp-platform-pill-sep" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: 'var(--text-muted)' }}>
                {isCarousel
                  ? <>Slide <strong style={{ color: 'var(--text-secondary)' }}>{currentSlide + 1}</strong> / {totalSlides}</>
                  : <>{totalSlides} tweets</>
                }
              </span>
            </>
          )}
        </div>
      </div>

      {/* Instagram Carousel — full visual preview */}
      {isCarousel && slideRefs && (
        <IGCarouselPreview
          slides={content}
          colors={colorSystem}
          brandName={brandName}
          handle={handle}
          currentSlide={currentSlide}
          setCurrentSlide={setCurrentSlide}
          onSave={onSave}
          slideRefs={slideRefs}
          designPreset={designPreset}
          templateId={templateId}
          paletteId={paletteId}
        />
      )}

      {isCarousel && onTemplateChange && (
        <CarouselTemplateSwitcher
          templateId={templateId}
          paletteId={paletteId}
          onChange={onTemplateChange}
        />
      )}

      {/* WHY cast to PlatformContent per branch: `content` is a ResultContent union once
          !isCarousel narrows out SlideData[]; the four platform components below are
          distinguished by which fields the writer/formatter agents actually populated
          (segments => video script, tweets => thread, etc.) rather than a discriminant
          tag in the data itself — same runtime check the pre-typing JSX already used. */}
      {!isCarousel && !('segments' in content) && content.hook && !content.tweets && !content.caption && (
        <LinkedInContent content={content} onSave={onSave} />
      )}
      {!isCarousel && !('segments' in content) && content.tweets && (
        <TwitterContent content={content} onSave={onSave} />
      )}
      {!isCarousel && !('segments' in content) && content.caption && (
        <InstagramContent content={content} onSave={onSave} />
      )}
      {!isCarousel && 'segments' in content && content.hook && content.segments && (
        <VideoScriptContent content={content} />
      )}

      {/* Content Multiplier */}
      <ContentMultiplier
        jobData={jobData}
        multiplyJobs={multiplyJobs}
        onMultiply={onMultiply}
        show={showMultiplier}
        onToggle={() => setShowMultiplier(!showMultiplier)}
      />
    </div>
  );
}
