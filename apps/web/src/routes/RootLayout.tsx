import { Suspense } from "react";
import { Box, Flex, Spinner } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import { TopBar } from "../components/TopBar";

// App shell: the persistent top bar over the routed content. The Suspense
// boundary covers lazily-loaded route chunks.
export function RootLayout() {
  return (
    <Box minH="100dvh" bg="bg.canvas">
      <TopBar />
      <Box as="main">
        <Suspense
          fallback={
            <Flex minH="60vh" align="center" justify="center">
              <Spinner color="accent" />
            </Flex>
          }
        >
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  );
}
