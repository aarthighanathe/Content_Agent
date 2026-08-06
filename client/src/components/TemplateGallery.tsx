import { useState } from 'react';
import { Check } from 'lucide-react';
import type { TemplateId } from '../lib/templateSystem';
import { TEMPLATES, getDefaultPalette } from '../lib/templateSystem';

interface TemplateGalleryProps {
  selectedTemplateId: TemplateId;
  onTemplateSelect: (templateId: TemplateId) => void;
}

export function TemplateGallery({ selectedTemplateId, onTemplateSelect }: TemplateGalleryProps) {
  const [hoveredTemplate, setHoveredTemplate] = useState<TemplateId | null>(null);

  const templates = Object.values(TEMPLATES);

  return (
    <div
      role="group"
      aria-label="Template gallery"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
      }}
    >
      {templates.map((template) => {
        const isSelected = template.id === selectedTemplateId;
        const isHovered = template.id === hoveredTemplate;
        const defaultPalette = getDefaultPalette(template.id);

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onTemplateSelect(template.id)}
            onMouseEnter={() => setHoveredTemplate(template.id)}
            onMouseLeave={() => setHoveredTemplate(null)}
            aria-pressed={isSelected}
            title={template.name}
            style={{
              background: isSelected ? 'color-mix(in srgb, var(--text-primary) 5%, transparent)' : 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
              border: `2px solid ${isSelected ? (defaultPalette?.colors.primary || 'var(--accent)') : 'var(--rule)'}`,
              borderRadius: 12,
              padding: 12,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              transition: 'all .2s',
              textAlign: 'left',
              position: 'relative',
              transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: isHovered ? '0 8px 24px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            {/* Mini preview area */}
            <div
              style={{
                aspectRatio: '4/5',
                background: defaultPalette?.colors.background || '#f5f5f5',
                borderRadius: 8,
                overflow: 'hidden',
                position: 'relative',
                border: `1px solid ${defaultPalette?.colors.primary || 'var(--rule)'}20`,
              }}
            >
              {/* Template preview placeholder - shows template characteristics */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 12,
                  gap: 8,
                }}
              >
                {/* Header area */}
                <div
                  style={{
                    height: 20,
                    background: defaultPalette?.colors.primary || 'var(--accent)',
                    borderRadius: 4,
                    opacity: 0.8,
                  }}
                />
                
                {/* Content lines */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      height: 12,
                      width: '80%',
                      background: defaultPalette?.colors.secondary || 'var(--rule)',
                      borderRadius: 2,
                      opacity: 0.6,
                    }}
                  />
                  <div
                    style={{
                      height: 8,
                      width: '100%',
                      background: defaultPalette?.colors.text || 'var(--text-secondary)',
                      borderRadius: 2,
                      opacity: 0.4,
                    }}
                  />
                  <div
                    style={{
                      height: 8,
                      width: '90%',
                      background: defaultPalette?.colors.text || 'var(--text-secondary)',
                      borderRadius: 2,
                      opacity: 0.4,
                    }}
                  />
                </div>

                {/* Decorative element based on template */}
                <div style={{ marginTop: 'auto' }}>
                  {template.layout.decorativeElements.includes('numbered-steps') && (
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: defaultPalette?.colors.accent || 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#fff',
                      }}
                    >
                      1
                    </div>
                  )}
                  {template.layout.decorativeElements.includes('geometric-shapes') && (
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        background: defaultPalette?.colors.accent || 'var(--accent)',
                        transform: 'rotate(45deg)',
                        opacity: 0.7,
                      }}
                    />
                  )}
                  {template.layout.decorativeElements.includes('emoji-accents') && (
                    <div style={{ fontSize: 20 }}>✨</div>
                  )}
                </div>
              </div>
            </div>

            {/* Template info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 600,
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{template.name}</span>
                {isSelected && <Check size={12} style={{ flexShrink: 0 }} />}
              </div>
              
              {/* Category badge */}
              <div
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: 'var(--text-muted)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'var(--rule)',
                  display: 'inline-block',
                  width: 'fit-content',
                }}
              >
                {template.category}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
