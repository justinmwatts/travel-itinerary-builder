import { Box, Heading, Text } from "@chakra-ui/react";
import { SHARED_OK } from "@travel/shared";

// Phase 0 boot: a minimal screen that imports from the shared package, proving
// the workspace import resolves in the web app too. The router, feed, builder
// and auth screens arrive in later phases per design.md section 17.
export function App() {
  return (
    <Box p="8">
      <Heading textStyle="display-md">TravelItineraryBuilder</Heading>
      <Text textStyle="body" color="fg.muted" mt="2">
        Phase 0 scaffold is up. Shared package status: {SHARED_OK}.
      </Text>
    </Box>
  );
}
