'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { TourStepConfig } from '@/constants/tutorial';

const HIGHLIGHT_Z_INDEX = 9999;
const POPOVER_Z_INDEX = 10000;

interface CitizenTourOverlayProps {
  isActive: boolean;
  currentIndex: number;
  steps: TourStepConfig[];
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

function getTargetRect(selector: string): DOMRect | null {
  if (typeof document === 'undefined') return null;
  const el = selector === 'body' ? document.body : document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

/**
 * In-app guided tour overlay: backdrop, highlight ring around target element, and popover card.
 * Rendered via portal so it sits above the rest of the app. Responsive and interactive.
 */
export function CitizenTourOverlay({
  isActive,
  currentIndex,
  steps,
  onNext,
  onPrev,
  onClose,
}: CitizenTourOverlayProps): React.ReactElement | null {
  const step = steps[currentIndex] ?? null;
  const [highlightRect, setHighlightRect] = React.useState<DOMRect | null>(null);
  const isBodyStep = step !== null && step.element === 'body';

  const updateRect = React.useCallback(() => {
    if (!step) return;
    const rect = getTargetRect(step.element);
    setHighlightRect(rect);
  }, [step]);

  React.useEffect(() => {
    if (!isActive || !step) return;
    setHighlightRect(null);
    updateRect();
    const raf = requestAnimationFrame(updateRect);
    const t = window.setTimeout(updateRect, 80);
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [isActive, step, updateRect]);

  if (!isActive || !step || typeof document === 'undefined') return null;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;
  const progressLabel = `${currentIndex + 1} / ${steps.length}`;

  const overlay = (
    <div
      className="fixed inset-0 z-[9998]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-description"
    >
      {/* Backdrop for body steps; for element steps the “hole” is the highlight div’s box-shadow cut-out */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60 touch-none"
        onClick={onClose}
        aria-label="Close tour"
      />

      {/* Highlight: cut-out overlay (box-shadow) + ring. For body steps we only show a full overlay, no ring. */}
      {!isBodyStep && highlightRect && (
        <div
          className="fixed rounded-lg pointer-events-none border-2 border-indigo-500 bg-transparent"
          style={{
            left: highlightRect.x,
            top: highlightRect.y,
            width: highlightRect.width,
            height: highlightRect.height,
            zIndex: HIGHLIGHT_Z_INDEX,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
          }}
        />
      )}

      {/* Popover */}
      <div
        id="tour-popover"
        className="fixed w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-4 shadow-xl"
        style={{ ...getPopoverPosition(isBodyStep, highlightRect), zIndex: POPOVER_Z_INDEX }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 id="tour-title" className="text-base font-semibold text-gray-900">
              {step.title}
            </h2>
            <p id="tour-description" className="mt-1 text-sm text-gray-600 leading-relaxed">
              {step.description}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 rounded-lg"
            onClick={onClose}
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500 tabular-nums">{progressLabel}</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={onPrev}
              disabled={isFirst}
              aria-label="Previous step"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-1 bg-indigo-600 hover:bg-indigo-700"
              onClick={onNext}
              aria-label={isLast ? 'Finish tour' : 'Next step'}
            >
              {isLast ? 'Finish' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function getPopoverPosition(
  isBodyStep: boolean,
  highlightRect: DOMRect | null
): React.CSSProperties {
  const padding = 16;
  if (isBodyStep || !highlightRect) {
    return {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }
  const spaceBelow = window.innerHeight - highlightRect.bottom;
  const spaceRight = window.innerWidth - highlightRect.left;
  const popoverHeight = 180;
  const popoverWidth = 352;

  if (spaceBelow >= popoverHeight + padding) {
    return {
      left: Math.max(padding, Math.min(highlightRect.left, window.innerWidth - popoverWidth - padding)),
      top: highlightRect.bottom + padding,
    };
  }
  if (highlightRect.top >= popoverHeight + padding) {
    return {
      left: Math.max(padding, Math.min(highlightRect.left, window.innerWidth - popoverWidth - padding)),
      top: highlightRect.top - popoverHeight - padding,
    };
  }
  if (spaceRight >= popoverWidth + padding) {
    return {
      left: highlightRect.right + padding,
      top: Math.max(padding, highlightRect.top),
    };
  }
  return {
    left: Math.max(padding, highlightRect.left - popoverWidth - padding),
    top: Math.max(padding, highlightRect.top),
  };
}
