'use client';

import { useEffect } from 'react';
import { ARABIC_FONTS, URDU_FONTS, ENGLISH_FONTS, getFontFamily } from '@/lib/fonts';

export type TextAlignment = 'auto' | 'left' | 'center' | 'right' | 'justify';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  arabicFont: string;
  urduFont: string;
  englishFont: string;
  fontScale: number;
  spacingScale: number;
  textAlign: TextAlignment;
  onArabicFontChange: (id: string) => void;
  onUrduFontChange: (id: string) => void;
  onEnglishFontChange: (id: string) => void;
  onFontScaleChange: (val: number) => void;
  onSpacingScaleChange: (val: number) => void;
  onTextAlignChange: (val: TextAlignment) => void;
}

const ALIGN_OPTIONS: { value: TextAlignment; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
];

export default function SettingsPanel({
  open,
  onClose,
  arabicFont,
  urduFont,
  englishFont,
  fontScale,
  spacingScale,
  textAlign,
  onArabicFontChange,
  onUrduFontChange,
  onEnglishFontChange,
  onFontScaleChange,
  onSpacingScaleChange,
  onTextAlignChange,
}: SettingsPanelProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function applyFont(id: string): string {
    const family = getFontFamily(id);
    return family;
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-background border-l border-border/40 z-50 shadow-xl transform transition-transform duration-300 ease-out overflow-y-auto ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/20 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-sans text-foreground tracking-wide">Settings</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground p-1 cursor-pointer transition-colors"
            aria-label="Close settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          <Section label="Arabic Font">
            <select
              value={arabicFont}
              onChange={(e) => onArabicFontChange(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground border border-border/40 rounded px-3 py-2 focus:outline-none focus:border-border cursor-pointer"
            >
              {ARABIC_FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <div
              className="mt-2 p-3 rounded bg-background-secondary border border-border/20 text-right text-lg leading-[2]"
              dir="rtl"
              style={{ fontFamily: applyFont(arabicFont) }}
            >
              بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
            </div>
          </Section>

          <Section label="Urdu Font">
            <select
              value={urduFont}
              onChange={(e) => onUrduFontChange(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground border border-border/40 rounded px-3 py-2 focus:outline-none focus:border-border cursor-pointer"
            >
              {URDU_FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <div
              className="mt-2 p-3 rounded bg-background-secondary border border-border/20 text-right text-base leading-[2]"
              dir="rtl"
              style={{ fontFamily: applyFont(urduFont) }}
            >
              شروع اللہ کے نام سے جو بڑا مہربان نہایت رحم والا ہے
            </div>
          </Section>

          <Section label="English Font">
            <select
              value={englishFont}
              onChange={(e) => onEnglishFontChange(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground border border-border/40 rounded px-3 py-2 focus:outline-none focus:border-border cursor-pointer"
            >
              {ENGLISH_FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <div
              className="mt-2 p-3 rounded bg-background-secondary border border-border/20 text-sm leading-relaxed"
              dir="ltr"
              style={{ fontFamily: applyFont(englishFont) }}
            >
              In the Name of Allah, the All-beneficent, the All-merciful.
            </div>
          </Section>

          <Section label="Font Size">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted shrink-0">0.5×</span>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.1}
                value={fontScale}
                onChange={(e) => onFontScaleChange(parseFloat(e.target.value))}
                aria-label="Font size"
                className="flex-1 h-1 accent-foreground cursor-pointer"
              />
              <span className="text-xs text-muted shrink-0">2.5×</span>
            </div>
            <div className="text-center text-xs text-muted mt-1">{fontScale.toFixed(1)}×</div>
          </Section>

          <Section label="Line Spacing">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted shrink-0">0.5×</span>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={spacingScale}
                onChange={(e) => onSpacingScaleChange(parseFloat(e.target.value))}
                aria-label="Line spacing"
                className="flex-1 h-1 accent-foreground cursor-pointer"
              />
              <span className="text-xs text-muted shrink-0">2.0×</span>
            </div>
            <div className="text-center text-xs text-muted mt-1">{spacingScale.toFixed(1)}×</div>
          </Section>

          <Section label="Text Alignment">
            <div className="flex flex-wrap gap-1.5">
              {ALIGN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onTextAlignChange(opt.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors duration-200 cursor-pointer ${
                    textAlign === opt.value
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'border-border/40 text-muted hover:border-border/70'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted mt-1.5 leading-relaxed">
              Auto follows language direction (RTL → right, LTR → left). Override to force alignment for all text.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-sans text-muted tracking-wider uppercase mb-2">{label}</h3>
      {children}
    </div>
  );
}
