import { Box, Button, Flex, Heading, Text } from "@chakra-ui/react";
import type { Destination } from "@travel/shared";

// Placeholder cover until Phase 6 resolves real Pexels images with the proper
// deterministic fallback. For now a neutral block holds the space.
function CoverPlaceholder({ name }: { name: string }) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <Flex
      w="72px"
      h="72px"
      flexShrink="0"
      rounded="md"
      bg="paper"
      borderWidth="1px"
      borderColor="border"
      align="center"
      justify="center"
      color="fg.subtle"
      fontFamily="heading"
      fontSize="xl"
    >
      {initial}
    </Flex>
  );
}

function DestinationCard({ destination, index }: { destination: Destination; index: number }) {
  return (
    <Box borderBottomWidth="1px" borderColor="border" py="4">
      <Flex gap="3">
        <CoverPlaceholder name={destination.name} />
        <Box flex="1">
          <Text textStyle="small" color="fg.muted">
            {index + 1}
          </Text>
          <Heading textStyle="title">
            {destination.name}
            <Text as="span" textStyle="small" color="fg.muted" ml="2">
              {destination.country}
            </Text>
          </Heading>
          <Text textStyle="body" color="fg" mt="1">
            {destination.description}
          </Text>
          {destination.note ? (
            <Box mt="2" pl="3" borderLeftWidth="2px" borderColor="accent">
              <Text textStyle="small" color="fg.muted">
                Note: {destination.note}
              </Text>
            </Box>
          ) : null}
        </Box>
      </Flex>
    </Box>
  );
}

export function ItineraryPanel({
  title,
  destinations,
}: {
  title: string;
  destinations: Destination[];
}) {
  const hasContent = destinations.length > 0;

  return (
    <Flex direction="column" h="100%">
      <Flex
        align="center"
        justify="space-between"
        px="5"
        py="4"
        borderBottomWidth="1px"
        borderColor="border"
      >
        <Heading textStyle="display-md">{title || "Untitled itinerary"}</Heading>
      </Flex>

      <Box flex="1" overflowY="auto" px="5">
        {hasContent ? (
          destinations.map((d, i) => <DestinationCard key={d.id} destination={d} index={i} />)
        ) : (
          <Flex h="100%" align="center" justify="center" py="16">
            <Text textStyle="body" color="fg.muted" textAlign="center" maxW="320px">
              Your itinerary appears here as you chat. Try asking for a trip on the left.
            </Text>
          </Flex>
        )}
      </Box>

      <Box px="5" py="4" borderTopWidth="1px" borderColor="border">
        <Button w="100%" variant="outline" borderColor="border" color="fg.subtle" disabled>
          Customize and publish (Phase 7)
        </Button>
      </Box>
    </Flex>
  );
}
