// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { Box, Heading, Text } from "@chakra-ui/react";
import type { Destination, LayoutConfig } from "@travel/shared";
import { CoverImage } from "../../components/CoverImage";
import { sanitizeText } from "../../lib/sanitize";
import {
  clampStyle,
  coverHeight,
  densityStyle,
  objectFitFor,
  objectPositionFor,
} from "../../lib/layoutStyles";

// A representative public card that honors the live layoutConfig, so the editor
// preview matches what the feed and detail views will render (Phase 8 reuses the
// same layoutStyles helpers).
export function LayoutPreview({
  title,
  author,
  destinations,
  config,
}: {
  title: string;
  author: string;
  destinations: Destination[];
  config: LayoutConfig;
}) {
  const first = destinations[0];
  const density = densityStyle(config.textDensity);

  return (
    <Box
      maxW="360px"
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border"
      rounded="md"
      overflow="hidden"
      boxShadow="raised"
    >
      <Box w="100%" h={coverHeight(config.cardSize)}>
        {first ? (
          <CoverImage
            name={first.name}
            imageUrl={first.imageUrl}
            imageAlt={first.imageAlt}
            credit={first.imageCredit}
            rounded="none"
            fit={objectFitFor(config.imageCrop)}
            position={objectPositionFor(config.imageFocus)}
          />
        ) : (
          <Box w="100%" h="100%" bg="paper" />
        )}
      </Box>
      <Box p="4">
        <Heading textStyle="title">{sanitizeText(title) || "Untitled itinerary"}</Heading>
        <Text textStyle="small" color="fg.muted" mt="1">
          {destinations.length} {destinations.length === 1 ? "stop" : "stops"} ·{" "}
          {`by ${sanitizeText(author)}`}
        </Text>
        {first ? (
          <Text
            color="fg"
            mt="2"
            style={{
              fontSize: density.fontSize,
              lineHeight: density.lineHeight,
              ...clampStyle(density.clamp),
            }}
          >
            {sanitizeText(first.description)}
          </Text>
        ) : null}
        {first?.note ? (
          <Box mt="2" pl="3" borderLeftWidth="2px" borderColor="accent">
            <Text textStyle="small" color="fg.muted">
              <Text as="span" fontWeight="600" color="fg">
                Note:
              </Text>{" "}
              {sanitizeText(first.note)}
            </Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
