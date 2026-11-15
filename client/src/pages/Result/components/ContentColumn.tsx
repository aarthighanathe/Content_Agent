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

function isVideoScriptShape(
  content: PlatformContent | VideoScriptContentData,
): content is VideoScriptContentData {
  return 'segments' in content && Array.isArray(content.segments);
}

function asVideoScript(
  content: PlatformContent | VideoScriptContentData,
): VideoScriptContentData {
  // WHY: platform=video_script with a non-script payload still has to render.
  // Missing cta/hook are filled so VideoScriptContent never reads undefined.
  if (isVideoScriptShape(content)) {
    return {
      ...content,
      hook: content.hook ?? {},
      cta: content.cta ?? {},
      segments: content.segments,
    };
  }
  return { hook: {}, segments: [], cta: {} };
}

function renderFallbackCopy(
  content: PlatformContent | VideoScriptContentData,
  onSave: (newContent: SlideData[] | PlatformContent) => Promise<void>,
): React.ReactNode {
  if (isVideoScriptShape(content)) {
    return <VideoScriptContent content={asVideoScript(content)} />;
  }
  if (Array.isArray(content.tweets)) {
    return <TwitterContent content={content} onSave={onSave} />;
  }
  // WHY: empty string is still a caption/hook. Truthy checks hid the whole column.
  if (typeof content.caption === 'string' && content.caption.length > 0) {
    return <InstagramContent content={content} onSave={onSave} />;
  }
  if (typeof content.hook === 'string') {
    return <LinkedInContent content={content} onSave={onSave} />;
  }
  if (typeof content.caption === 'string') {
    return <InstagramContent content={content} onSave={onSave} />;
  }
  return null;
}

function renderCopyBody(
  platform: string | undefined,
  content: PlatformContent | VideoScriptContentData,
  onSave: (newContent: SlideData[] | PlatformContent) => Promise<void>,
): React.ReactNode {
  // WHY: job.platform picks the renderer. Field sniffing treated "" hook/caption
  // as "no content" and left the Result column blank.
  if (platform === 'linkedin_post') {
    return <LinkedInContent content={isVideoScriptShape(content) ? {} : content} onSave={onSave} />;
  }
  if (platform === 'twitter_thread') {
    return <TwitterContent content={isVideoScriptShape(content) ? {} : content} onSave={onSave} />;
  }
  if (platform === 'instagram_caption') {
    const post = isVideoScriptShape(content) ? {} : content;
    return <InstagramContent content={post} onSave={onSave} />;
  }
  if (platform === 'video_script') {
    return <VideoScriptContent content={asVideoScript(content)} />;
  }
  return renderFallbackCopy(content, onSave);
}

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
  /** Prefer the job's platform over sniffing content fields (empty hook/caption). */
  platform?:       string;
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
  multiplyJobs, onMultiply, platform: platformProp, className, slideRefs,
  brandName, handle, colorSystem, designPreset,
  templateId, paletteId, onTemplateChange,
}: Props) {
  const isCarousel = Array.isArray(content);
  const platform = platformProp ?? jobData?.platform;

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

      {/* WHY: Adapt lives inside .rp-copy-stage: keeps caption/thread and Adapt
          on the same full-width column (the old 720px reading cap was removed). */}
      {!isCarousel && (
        <VisibleScroller frameClassName="rp-copy-scroll">
        <div className="rp-copy-stage">
          {renderCopyBody(platform, content, onSave)}
          {multiplier}
        </div>
        </VisibleScroller>
      )}
    </div>
  );
}
