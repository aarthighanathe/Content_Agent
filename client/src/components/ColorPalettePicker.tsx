import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import type { ColorPalette } from '../lib/templateSystem';

interface ColorPalettePickerProps {
  palettes: ColorPalette[];
  selectedPaletteId: string;
  onPaletteSelect: (paletteId: string) => void;
  onCustomColor?: () => void;
  showCustomOption?: boolean;
}

export function ColorPalettePicker({
  palettes,
  selectedPaletteId,
  onPaletteSelect,
  onCustomColor,
  showCustomOption = true,
}: ColorPalettePickerProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const handleCustomClick = () => {
    if (onCustomColor) {
      onCustomColor();
    } else {
      setShowCustomPicker(!showCustomPicker);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Template-specific color palettes */}
      <div
        role="group"
        aria-label="Color palette"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 8,
        }}
      >
        {palettes.map((palette) => {
          const isSelected = palette.id === selectedPaletteId;
          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => onPaletteSelect(palette.id)}
              aria-pressed={isSelected}
              title={palette.name}
              style={{
                background: isSelected ? 'color-mix(in srgb, var(--text-primary) 5%, transparent)' : 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                border: `1px solid ${isSelected ? palette.colors.primary : 'var(--rule)'}`,
                borderRadius: 8,
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'all .15s',
                textAlign: 'left',
                position: 'relative',
              }}
            >
              {/* Color swatches */}
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  height: 24,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    background: palette.colors.primary,
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    background: palette.colors.secondary,
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    background: palette.colors.accent,
                  }}
                />
              </div>
              
              {/* Palette name */}
              <div
                style={{
                  fontSize: 11,
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{palette.name}</span>
                {isSelected && <Check size={12} style={{ flexShrink: 0 }} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom color option */}
      {showCustomOption && (
        <button
          type="button"
          onClick={handleCustomClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            background: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
            border: '1px dashed var(--rule)',
            color: 'var(--text-secondary)',
            fontSize: 11.5,
            transition: 'all .15s',
          }}
        >
          <Plus size={14} style={{ flexShrink: 0 }} />
          <span>Custom color</span>
        </button>
      )}

      {/* Custom color picker (expanded) */}
      {showCustomPicker && !onCustomColor && (
        <div
          style={{
            padding: 12,
            background: 'var(--bg-card)',
            border: '1px solid var(--rule)',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Custom color picker coming soon
          </div>
          <button
            type="button"
            onClick={() => setShowCustomPicker(false)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              background: 'var(--rule)',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 11,
              alignSelf: 'flex-start',
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
