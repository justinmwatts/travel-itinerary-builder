import { useState } from "react";
import { Box, Flex } from "@chakra-ui/react";

// Deterministic fallback colour keyed to the location name, so a missing or
// broken image always shows the same warm block rather than a broken-image
// glyph (design.md section 9).
function fallbackColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360} 30% 82%)`;
}

// Renders the resolved Pexels cover, or the deterministic fallback on a miss or
// load error. Fills its parent, which must reserve width and height so there is
// no layout shift when the image arrives. The photographer credit is exposed to
// assistive tech via the title; the visible "Photo by ... on Pexels" line lives
// on the detail view (Phase 8).
export function CoverImage({
  name,
  imageUrl,
  imageAlt,
  credit,
  rounded = "md",
}: {
  name: string;
  imageUrl: string | null;
  imageAlt: string | null;
  credit?: string | null;
  rounded?: string;
}) {
  const [errored, setErrored] = useState(false);
  const showImage = Boolean(imageUrl) && !errored;
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  const title = credit ? `Photo by ${credit} on Pexels` : undefined;

  return (
    <Box position="relative" w="100%" h="100%" overflow="hidden" rounded={rounded} bg="paper">
      {showImage ? (
        <img
          src={imageUrl ?? undefined}
          alt={imageAlt ?? name}
          title={title}
          loading="lazy"
          onError={() => setErrored(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <Flex
          w="100%"
          h="100%"
          align="center"
          justify="center"
          bg={fallbackColor(name)}
          color="ink"
          fontFamily="heading"
          fontSize="2xl"
        >
          {initial}
        </Flex>
      )}
    </Box>
  );
}
