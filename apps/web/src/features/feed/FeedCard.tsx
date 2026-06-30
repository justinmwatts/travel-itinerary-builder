import { Link as RouterLink } from "react-router-dom";
import { Box, Heading, Text } from "@chakra-ui/react";
import type { FeedItem } from "@travel/shared";
import { CoverImage } from "../../components/CoverImage";
import { ReactionBar } from "../../components/ReactionBar";
import { coverHeight, objectFitFor, objectPositionFor } from "../../lib/layoutStyles";

export function FeedCard({ item }: { item: FeedItem }) {
  // Open at the matched stop when the card came from a search.
  const matched = item.matchedDestinationIds[0];
  const to = matched ? `/itinerary/${item.id}?highlight=${matched}` : `/itinerary/${item.id}`;

  return (
    <RouterLink to={to}>
      <Box
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border"
        rounded="md"
        overflow="hidden"
        h="100%"
        transition="all 160ms ease-out"
        _hover={{ boxShadow: "raised", transform: "translateY(-2px)" }}
      >
        <Box w="100%" h={coverHeight(item.layoutConfig.cardSize)}>
          {item.cover ? (
            <CoverImage
              name={item.cover.name}
              imageUrl={item.cover.imageUrl}
              imageAlt={item.cover.imageAlt}
              credit={item.cover.imageCredit}
              rounded="none"
              fit={objectFitFor(item.layoutConfig.imageCrop)}
              position={objectPositionFor(item.layoutConfig.imageFocus)}
            />
          ) : (
            <Box w="100%" h="100%" bg="paper" />
          )}
        </Box>
        <Box p="4">
          <Heading textStyle="title" lineClamp={1}>
            {item.title || "Untitled itinerary"}
          </Heading>
          <Text textStyle="small" color="fg.muted" mt="1">
            {item.stopCount} {item.stopCount === 1 ? "stop" : "stops"} · by{" "}
            {item.author.displayName}
          </Text>
          <Box mt="3">
            <ReactionBar heartCount={item.heartCount} likeCount={item.likeCount} />
          </Box>
        </Box>
      </Box>
    </RouterLink>
  );
}
