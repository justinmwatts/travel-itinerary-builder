import { Box, Heading, Text } from "@chakra-ui/react";
import { DEFAULT_LAYOUT_CONFIG } from "@travel/shared";

// A minimal screen that imports from the shared contract, proving the inferred
// types and values resolve in the web app too. The router, feed, builder and
// auth screens arrive in later phases per design.md section 17.
export function App() {
  return (
    <Box p="8">
      <Heading textStyle="display-md">TravelItineraryBuilder</Heading>
      <Text textStyle="body" color="fg.muted" mt="2">
        Shared contract is in place. Default text density: {DEFAULT_LAYOUT_CONFIG.textDensity}.
      </Text>
    </Box>
  );
}
