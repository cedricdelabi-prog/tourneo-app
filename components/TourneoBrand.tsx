"use client";

import type { CSSProperties } from "react";

export default function TourneoBrand({
  compact = false,
}: {
  compact?: boolean;
  showName?: boolean;
}) {
  return (
    <img
      src="/tourneo-logo.png"
      alt="Tourneo"
      style={compact ? styles.compact : styles.full}
    />
  );
}

const styles: Record<string, CSSProperties> = {
  full: {
    width: 280,
    maxWidth: "100%",
    height: "auto",
    display: "block",
    objectFit: "contain",
  },
  compact: {
    width: 178,
    maxWidth: "min(46vw, 178px)",
    height: 58,
    display: "block",
    objectFit: "contain",
    objectPosition: "left center",
    flex: "0 0 auto",
  },
};
