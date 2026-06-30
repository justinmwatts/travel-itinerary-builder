import { Box, Button, Flex, Heading, Menu, Spacer, Text } from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useLogout, useMe } from "../features/auth/api";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

// Persistent top bar: logo to the feed, a Create action, and an avatar menu when
// signed in (My itineraries, Log out) or a Log in button when not. Search and
// the mobile FAB land in later phases.
export function TopBar() {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <Box
      as="header"
      bg="bg.surface"
      borderBottomWidth="1px"
      borderColor="border"
      position="sticky"
      top="0"
      zIndex="10"
    >
      <Flex maxW="1100px" mx="auto" h="64px" px={{ base: "4", md: "6" }} align="center" gap="3">
        <RouterLink to="/">
          <Heading textStyle="title" color="fg">
            TravelItineraryBuilder
          </Heading>
        </RouterLink>
        <Spacer />
        <Button asChild variant="outline" size="sm" borderColor="border" color="fg">
          <RouterLink to="/build">Create</RouterLink>
        </Button>
        {me ? (
          <Menu.Root>
            <Menu.Trigger asChild>
              <Box
                as="button"
                aria-label="Account menu"
                w="36px"
                h="36px"
                rounded="full"
                bg="accent"
                color="paper"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontWeight="600"
                fontSize="sm"
              >
                {initialsOf(me.displayName)}
              </Box>
            </Menu.Trigger>
            <Menu.Positioner>
              <Menu.Content
                bg="bg.surface"
                borderWidth="1px"
                borderColor="border"
                boxShadow="overlay"
                minW="200px"
              >
                <Box px="3" py="2">
                  <Text textStyle="small" color="fg">
                    {me.displayName}
                  </Text>
                  <Text textStyle="micro" color="fg.muted">
                    {me.email}
                  </Text>
                </Box>
                <Menu.Separator />
                <Menu.Item value="me" onClick={() => navigate("/me")}>
                  My itineraries
                </Menu.Item>
                <Menu.Item
                  value="logout"
                  onClick={() => logout.mutate(undefined, { onSuccess: () => navigate("/") })}
                >
                  Log out
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Menu.Root>
        ) : (
          <Button asChild size="sm" bg="ink" color="paper">
            <RouterLink to="/login">Log in</RouterLink>
          </Button>
        )}
      </Flex>
    </Box>
  );
}
