// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { useEffect } from "react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";
import {
  AspectRatio,
  Box,
  Button,
  Flex,
  Heading,
  Skeleton,
  SkeletonText,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { Destination, Itinerary } from "@travel/shared";
import { CoverImage } from "../../components/CoverImage";
import { PexelsCredit } from "../../components/PexelsCredit";
import { ReactionBar } from "../../components/ReactionBar";
import { densityStyle, objectFitFor, objectPositionFor } from "../../lib/layoutStyles";
import { sanitizeText } from "../../lib/sanitize";
import { useMe } from "../auth/api";
import { useItinerary } from "../itineraries/api";
import { useReactionToggle } from "../reactions/api";

function DestinationBlock({
  destination,
  index,
  itinerary,
  highlighted,
}: {
  destination: Destination;
  index: number;
  itinerary: Itinerary;
  highlighted: boolean;
}) {
  const density = densityStyle(itinerary.layoutConfig.textDensity);
  return (
    <Box
      id={`stop-${destination.id}`}
      borderTopWidth="1px"
      borderColor="border"
      py="8"
      px={highlighted ? "4" : "0"}
      mx={highlighted ? "-4" : "0"}
      rounded={highlighted ? "md" : "none"}
      bg={highlighted ? "rgba(15,111,106,0.06)" : "transparent"}
      transition="background 200ms ease-out"
    >
      <Heading textStyle="display-md" mb="3">
        {index + 1}. {sanitizeText(destination.name)}
        <Text as="span" textStyle="small" color="fg.muted" ml="3">
          {sanitizeText(destination.country)}
        </Text>
      </Heading>

      <AspectRatio ratio={16 / 9} mb="2">
        <CoverImage
          name={destination.name}
          imageUrl={destination.imageUrl}
          imageAlt={destination.imageAlt}
          credit={destination.imageCredit}
          fit={objectFitFor(itinerary.layoutConfig.imageCrop)}
          position={objectPositionFor(itinerary.layoutConfig.imageFocus)}
        />
      </AspectRatio>
      <PexelsCredit credit={destination.imageCredit} creditUrl={destination.imageCreditUrl} />

      <Text
        color="fg"
        mt="4"
        style={{ fontSize: density.fontSize, lineHeight: density.lineHeight }}
      >
        {sanitizeText(destination.description)}
      </Text>

      {destination.note ? (
        <Box mt="4" pl="3" borderLeftWidth="2px" borderColor="accent">
          <Text textStyle="small" color="fg.muted">
            <Text as="span" fontWeight="600" color="fg">
              Creator note:
            </Text>{" "}
            {sanitizeText(destination.note)}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

export function DetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const { data: me } = useMe();
  const { data: itinerary, isPending, isError } = useItinerary(id);
  const { toggle, isPending: reacting } = useReactionToggle();

  // Open at the matched stop when arriving from a search.
  useEffect(() => {
    if (!itinerary || !highlightId) return;
    const el = document.getElementById(`stop-${highlightId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [itinerary, highlightId]);

  if (isPending) {
    return (
      <Box maxW="760px" mx="auto" px={{ base: "4", md: "6" }} py="10">
        <Skeleton h="32px" w="60%" mb="6" />
        <Skeleton h="240px" mb="4" />
        <SkeletonText noOfLines={3} />
      </Box>
    );
  }

  if (isError || !itinerary) {
    return (
      <Stack maxW="760px" mx="auto" px="6" py="20" gap="4" align="center" textAlign="center">
        <Heading textStyle="display-md">Itinerary not found</Heading>
        <Text textStyle="body" color="fg.muted">
          It may have been removed, or never existed.
        </Text>
        <Button asChild variant="outline" borderColor="border">
          <RouterLink to="/">Back to feed</RouterLink>
        </Button>
      </Stack>
    );
  }

  const isOwner = me?.id === itinerary.ownerId;

  return (
    <Box maxW="760px" mx="auto" px={{ base: "4", md: "6" }} py="8">
      <Flex justify="space-between" align="center" mb="2">
        <Button asChild variant="ghost" size="sm" color="fg.muted" px="0">
          <RouterLink to="/">← Back to feed</RouterLink>
        </Button>
        {isOwner ? (
          <Button asChild variant="outline" size="sm" borderColor="border" color="fg">
            <RouterLink to={`/build/${itinerary.id}`}>Edit</RouterLink>
          </Button>
        ) : null}
      </Flex>

      <Heading textStyle="display-lg">
        {sanitizeText(itinerary.title) || "Untitled itinerary"}
      </Heading>
      <Flex align="center" justify="space-between" mt="2" gap="4" wrap="wrap">
        <Text textStyle="small" color="fg.muted">
          {itinerary.destinations.length} {itinerary.destinations.length === 1 ? "stop" : "stops"} ·
          by {sanitizeText(itinerary.author.displayName)}
        </Text>
        <ReactionBar
          heartCount={itinerary.heartCount}
          likeCount={itinerary.likeCount}
          myReactions={itinerary.myReactions}
          disabled={reacting}
          onToggle={(type) => toggle(itinerary.id, type, itinerary.myReactions.includes(type))}
        />
      </Flex>

      <Box mt="2">
        {itinerary.destinations.map((d, i) => (
          <DestinationBlock
            key={d.id}
            destination={d}
            index={i}
            itinerary={itinerary}
            highlighted={d.id === highlightId}
          />
        ))}
      </Box>
    </Box>
  );
}
