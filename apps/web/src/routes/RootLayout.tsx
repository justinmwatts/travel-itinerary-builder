import { Box } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import { TopBar } from "../components/TopBar";

// App shell: the persistent top bar over the routed content.
export function RootLayout() {
  return (
    <Box minH="100dvh" bg="bg.canvas">
      <TopBar />
      <Box as="main">
        <Outlet />
      </Box>
    </Box>
  );
}
