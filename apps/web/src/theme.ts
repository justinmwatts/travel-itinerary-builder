import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Design tokens and theme from ux-flows.md section 7. Editorial travel direction:
// warm paper surfaces, near-black warm ink, one teal accent, two distinct
// reaction colors, a serif for titles (Fraunces) and a sans for UI (Inter).
// v1 is light mode only; the tokens are semantic so a dark theme is additive.
const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        paper: { value: "#FAF8F4" },
        surface: { value: "#FFFFFF" },
        ink: { value: "#1B1714" },
        muted: { value: "#6E665B" },
        subtle: { value: "#9C9488" },
        hairline: { value: "#E8E2D8" },
        accent: { value: "#0F6F6A" },
        accentEmphasis: { value: "#0B5A56" },
        heart: { value: "#E0244E" },
        danger: { value: "#B23A2E" },
        success: { value: "#2F7D55" },
      },
      fonts: {
        heading: { value: "'Fraunces Variable', Georgia, serif" },
        body: { value: "'Inter', system-ui, sans-serif" },
      },
      radii: {
        sm: { value: "4px" },
        md: { value: "8px" },
        lg: { value: "12px" },
      },
      shadows: {
        raised: { value: "0 2px 8px rgba(27,23,20,0.08)" },
        overlay: { value: "0 12px 32px rgba(27,23,20,0.16)" },
      },
    },
    semanticTokens: {
      colors: {
        "bg.canvas": { value: "{colors.paper}" },
        "bg.surface": { value: "{colors.surface}" },
        fg: { value: "{colors.ink}" },
        "fg.muted": { value: "{colors.muted}" },
        "fg.subtle": { value: "{colors.subtle}" },
        border: { value: "{colors.hairline}" },
        accent: { value: "{colors.accent}" },
      },
    },
    // The type scale from ux-flows.md section 7. Components reference named
    // styles rather than raw sizes.
    textStyles: {
      "display-lg": { value: { fontFamily: "heading", fontSize: "2.5rem", lineHeight: "1.1" } },
      "display-md": { value: { fontFamily: "heading", fontSize: "1.75rem", lineHeight: "1.15" } },
      title: { value: { fontFamily: "heading", fontSize: "1.25rem", lineHeight: "1.3" } },
      body: { value: { fontFamily: "body", fontSize: "1rem", lineHeight: "1.55" } },
      small: { value: { fontFamily: "body", fontSize: "0.875rem", lineHeight: "1.5" } },
      micro: { value: { fontFamily: "body", fontSize: "0.75rem", lineHeight: "1.4" } },
    },
  },
  globalCss: {
    "html, body": {
      background: "{colors.paper}",
      color: "{colors.ink}",
      fontFamily: "body",
    },
  },
});

export const system = createSystem(defaultConfig, config);
