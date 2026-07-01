// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import type { ReactNode } from "react";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";

// Shared placeholder for screens that later phases build out, so navigation and
// the auth guard are exercisable now without faking content.
export function PlaceholderScreen({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Box maxW="1100px" mx="auto" px={{ base: "4", md: "6" }} py="12">
      <Stack gap="3" maxW="640px">
        <Heading textStyle="display-md">{title}</Heading>
        <Text textStyle="body" color="fg.muted">
          {description}
        </Text>
        {children}
      </Stack>
    </Box>
  );
}
