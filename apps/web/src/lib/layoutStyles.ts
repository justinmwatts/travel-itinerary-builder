import type { CardSize, ImageCrop, ImageFocus, TextDensity } from "@travel/shared";

// Maps the layoutConfig controls to concrete values (ux-flows.md section 7).
// Shared by the customize preview and the public feed/detail views so the
// preview matches exactly what gets rendered.

export interface DensityStyle {
  fontSize: string;
  lineHeight: number;
  clamp: number;
}

export function densityStyle(density: TextDensity): DensityStyle {
  switch (density) {
    case "compact":
      return { fontSize: "0.9375rem", lineHeight: 1.45, clamp: 2 };
    case "spacious":
      return { fontSize: "1.0625rem", lineHeight: 1.65, clamp: 4 };
    default:
      return { fontSize: "1rem", lineHeight: 1.55, clamp: 3 };
  }
}

// Cover height by card size: sm shorter, lg taller (the grid column count is a
// feed-level concern handled in Phase 8).
export function coverHeight(size: CardSize): string {
  switch (size) {
    case "sm":
      return "150px";
    case "lg":
      return "240px";
    default:
      return "190px";
  }
}

export function objectFitFor(crop: ImageCrop): "cover" | "contain" {
  return crop === "fit" ? "contain" : "cover";
}

export function objectPositionFor(focus: ImageFocus): string {
  switch (focus) {
    case "top":
      return "center top";
    case "bottom":
      return "center bottom";
    default:
      return "center center";
  }
}

// CSS for line-clamping a description to the density's line count.
export function clampStyle(lines: number): React.CSSProperties {
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}
