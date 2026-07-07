import React, { useEffect, useState } from "react";
import Lightbox, {
  IconButton as YarlIconButton
} from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Download from "yet-another-react-lightbox/plugins/download";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";

const RotateLeftIcon = props => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <polyline points="3 4 3 10 9 10" />
  </svg>
);

const RotateRightIcon = props => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <polyline points="21 4 21 10 15 10" />
  </svg>
);

const normalizeRotation = value => ((value % 360) + 360) % 360;

const LightboxView = ({ open, index, slides, onClose, onViewIndexChange }) => {
  const [currentIndex, setCurrentIndex] = useState(index || 0);
  const [rotationBySlide, setRotationBySlide] = useState({});

  useEffect(() => {
    setCurrentIndex(index || 0);
  }, [index]);

  useEffect(() => {
    if (!open) {
      setRotationBySlide({});
    }
  }, [open]);

  const rotateCurrentSlide = degrees => {
    const currentSlide = slides[currentIndex];
    const slideKey = currentSlide?.key;
    if (!slideKey) {
      return;
    }

    setRotationBySlide(previous => ({
      ...previous,
      [slideKey]: normalizeRotation((previous[slideKey] || 0) + degrees)
    }));
  };

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={slides}
      on={{
        view: ({ index: viewedIndex }) => {
          setCurrentIndex(viewedIndex);
          if (onViewIndexChange) {
            onViewIndexChange(viewedIndex);
          }
        }
      }}
      render={{
        slideContainer: ({ slide, children }) => {
          const rotation = rotationBySlide[slide?.key] || 0;
          return (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `rotate(${rotation}deg)`
              }}
            >
              {children}
            </div>
          );
        }
      }}
      captions={{
        descriptionTextAlign: "start",
        descriptionMaxLines: 4
      }}
      thumbnails={{
        position: "bottom",
        width: 120,
        height: 88,
        border: 1,
        borderRadius: 8,
        padding: 2,
        gap: 10,
        vignette: false
      }}
      toolbar={{
        buttons: [
          "zoom",
          "download",
          <YarlIconButton
            key="rotate-left"
            label="Rotate left"
            icon={RotateLeftIcon}
            onClick={() => rotateCurrentSlide(-90)}
            disabled={!slides.length}
          />,
          <YarlIconButton
            key="rotate-right"
            label="Rotate right"
            icon={RotateRightIcon}
            onClick={() => rotateCurrentSlide(90)}
            disabled={!slides.length}
          />,
          "close"
        ]
      }}
      plugins={[Video, Zoom, Download, Thumbnails, Captions]}
    />
  );
};

export default LightboxView;
