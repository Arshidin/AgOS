import { useEffect, useRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

export interface ProjectPopupData {
  sticker: string;
  name: string;
  description: string;
  features: string[];
  metrics: { value: string; label: string }[];
  image: string;
  link?: string;
}

interface ProjectOverlayProps {
  projects: ProjectPopupData[];
  activeIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const ProjectOverlay = ({
  projects,
  activeIndex,
  isOpen,
  onClose,
  onNavigate,
}: ProjectOverlayProps) => {
  const { t } = useTranslation();
  const backdropRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  /* Track a "content key" that changes on every navigate to trigger cross-fade */
  const [displayIndex, setDisplayIndex] = useState(activeIndex);
  const [transitioning, setTransitioning] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const project = projects[displayIndex];
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < projects.length - 1;

  /* Smooth cross-fade when activeIndex changes */
  useEffect(() => {
    if (activeIndex === displayIndex) return;
    setTransitioning(true);
    setImgLoaded(false);
    const t = setTimeout(() => {
      setDisplayIndex(activeIndex);
      setTransitioning(false);
    }, 120); // half of the 250ms cross-fade
    return () => clearTimeout(t);
  }, [activeIndex, displayIndex]);

  /* Sync displayIndex on open */
  useEffect(() => {
    if (isOpen) {
      setDisplayIndex(activeIndex);
      setImgLoaded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /* Preload adjacent images for instant navigation */
  useEffect(() => {
    if (!isOpen) return;
    const toPreload: string[] = [];
    if (activeIndex > 0) toPreload.push(projects[activeIndex - 1]!.image);
    if (activeIndex < projects.length - 1) toPreload.push(projects[activeIndex + 1]!.image);
    toPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [isOpen, activeIndex, projects]);

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(activeIndex - 1);
  }, [hasPrev, activeIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(activeIndex + 1);
  }, [hasNext, activeIndex, onNavigate]);

  /* Lock body scroll */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  /* Keyboard: ← → Esc */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, goPrev, goNext, onClose]);

  /* Touch swipe for mobile */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchEndX.current = null;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 60;
    if (diff > threshold) goNext();
    else if (diff < -threshold) goPrev();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  /* Click backdrop to close */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (!isOpen || !project) return null;

  return (
    <div
      ref={backdropRef}
      className="pm-backdrop"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label={project.name}
    >
      {/* Navigation arrows — on backdrop, outside modal */}
      {hasPrev && (
        <button
          onClick={goPrev}
          className="pm-nav pm-nav--prev"
          aria-label={t('hero.projectOverlay.prevProject')}
        >
          <span className="icon-box"><ChevronLeft /></span>
        </button>
      )}
      {hasNext && (
        <button
          onClick={goNext}
          className="pm-nav pm-nav--next"
          aria-label={t('hero.projectOverlay.nextProject')}
        >
          <span className="icon-box"><ChevronRight /></span>
        </button>
      )}

      {/* Modal window */}
      <div className="pm-modal">
        {/* Close button — inside modal */}
        <button
          onClick={onClose}
          className="pm-close"
          aria-label={t('hero.projectOverlay.close')}
        >
          <span className="icon-box--sm icon-box"><X /></span>
        </button>

        {/* Split layout */}
        <div className="pm-split">
          {/* Left — image panel */}
          <div className="pm-image-wrap">
            {/* Shimmer skeleton — visible until image loads */}
            <div
              className="pm-image-skeleton"
              style={{ opacity: imgLoaded ? 0 : 1 }}
            />
            {/* Actual image */}
            <img
              key={project.image}
              src={project.image}
              alt={project.name}
              className={`pm-image ${transitioning ? "pm-image--fade" : ""}`}
              style={{ opacity: imgLoaded ? 1 : 0 }}
              onLoad={() => setImgLoaded(true)}
              draggable={false}
            />
          </div>

          {/* Right — content panel */}
          <div className="pm-content-scroll">
            <div
              className={`pm-content ${transitioning ? "pm-content--fade-out" : "pm-content--fade-in"}`}
            >
              {/* Sticker */}
              <span className="pm-sticker">{project.sticker}</span>

              {/* Title */}
              <h2 className="pm-title">{project.name}</h2>

              {/* Description */}
              <p className="pm-desc">{project.description}</p>

              {/* Features */}
              <div className="pm-features">
                {project.features.map((f, i) => (
                  <div key={i} className="pm-feature">
                    <span className="pm-feature-marker" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Metrics */}
              <div className="pm-metrics">
                {project.metrics.map((m, i) => (
                  <div key={i} className="pm-metric">
                    <span className="pm-metric-value">{m.value}</span>
                    <span className="pm-metric-label">{m.label}</span>
                  </div>
                ))}
              </div>

              {/* Link */}
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pm-link"
                >
                  {t('hero.projectOverlay.goToWebsite')}
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectOverlay;
