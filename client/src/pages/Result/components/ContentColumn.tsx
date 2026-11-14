import React from 'react';
import { IGCarouselPreview }   from './content/carousel/IGCarouselPreview';
import type { SlideData }      from './content/carousel/IGSlide';
import { LinkedInContent }     from './content/LinkedInContent';
import { TwitterContent }      from './content/TwitterContent';
import { InstagramContent }    from './content/InstagramContent';
import { VideoScriptContent }  from './content/VideoScriptContent';
import { ContentMultiplier }   from './ContentMultiplier';
import { CarouselTemplateSwitcher } from './content/carousel/CarouselTemplateSwitcher';
import { VisibleScroller } from '../../../components/VisibleScroller';
import type { ColorSystem } from '../../../lib/colorSystem';
import type { MultiplyEntry }  from '../hooks/useMultiplier';
import type { ContentJob, PlatformContent, VideoScriptContentData } from '../../../types/job';

// WHY: union — this column picks a renderer from the fields present (slides,
// PlatformContent, or VideoScriptContentData).
// WHY: exported here (not types/job.ts) — SlideData lives under carousel/IGSlide;
// shared types must not import down into page components. Result + ExportModal
// import this alias so all three stay identical.
export type ResultContent = SlideData[] | PlatformContent | VideoScriptContentData;

interface Props {
  jobData:         ContentJob | null;
  content:         ResultContent;
  currentSlide:    number;
  setCurrentSlide: (n: number) => void;
  touchStartX:     React.MutableRefObject<number | null>;
  onSave:          (newContent: SlideData[] | PlatformContent) => Promise<void>;
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
  // WHY: optional — pre-template carousels have no templateId/paletteId.
  templateId?:     string;
  paletteId?:      string;
  onTemplateChange?: (templateId: string, paletteId?: string) => void;
}

export function ContentColumn({
  jobData, content, currentSlide, setCurrentSlide,
  onSave,
  multiplyJobs, onMultiply, className, slideRefs,
  brandName, handle, colorSystem, designPreset,
  templateId, paletteId, onTemplateChange,
}: Props) {
  const isCarousel = Array.isArray(content);

  // NOTE: the "Render with AI theme" flow was removed here. It asked Gemini to invent a
  // slide design and replaced this preview with it — a different look from both the
  // preview and the PNG download. The export now renders these same components
  // server-side, so the preview is already what you get.

  const multiplier = (
    <ContentMultiplier
      jobData={jobData}
      multiplyJobs={multiplyJobs}
      onMultiply={onMultiply}
    />
  );

  return (
    <div className={['rp-main', className].filter(Boolean).join(' ')}>
      {isCarousel && slideRefs && (
        <div className="rp-carousel-layout">
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
          <div className="rp-carousel-side">
            {onTemplateChange && (
              <CarouselTemplateSwitcher
                templateId={templateId}
                paletteId={paletteId}
                onChange={onTemplateChange}
              />
            )}
            {multiplier}
          </div>
        </div>
      )}

      {/* WHY: cast to PlatformContent per branch: `content` is a ResultContent union once
          !isCarousel narrows out SlideData[]; the four platform components below are
          distinguished by which fields the writer/formatter agents actually populated
          (segments => video script, tweets => thread, etc.) rather than a discriminant
          tag in the data itself — same runtime check the pre-typing JSX already used. */}
      {/* WHY: Adapt lives inside .rp-copy-stage: keeps caption/thread and Adapt
          on the same full-width column (the old 720px reading cap was removed). */}
      {!isCarousel && (
        <VisibleScroller frameClassName="rp-copy-scroll">
        <div className="rp-copy-stage">
          {!('segments' in content) && content.hook && !content.tweets && !content.caption && (
            <LinkedInContent content={content} onSave={onSave} />
          )}
          {!('segments' in content) && content.tweets && (
            <TwitterContent content={content} onSave={onSave} />
          )}
          {!('segments' in content) && content.caption && (
            <InstagramContent content={content} onSave={onSave} />
          )}
          {'segments' in content && content.hook && content.segments && (
            <VideoScriptContent content={content} />
          )}
          {multiplier}
        </div>
        </VisibleScroller>
      )}
    </div>
  );
}
