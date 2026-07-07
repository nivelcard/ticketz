import React, { Suspense, lazy } from "react";

export { buildMediaGalleryData } from "./galleryData";

const LazyLightboxView = lazy(() => import("./LightboxView"));

const MediaGalleryLightbox = props => {
  if (!props.open) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyLightboxView {...props} />
    </Suspense>
  );
};

export default MediaGalleryLightbox;
