// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { Box, Flex, Text } from "@chakra-ui/react";

// A small labeled segmented control for the customize editor.
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <Box>
      <Text textStyle="small" color="fg.muted" mb="1">
        {label}
      </Text>
      <Flex borderWidth="1px" borderColor="border" rounded="md" overflow="hidden" w="fit-content">
        {options.map((opt, i) => {
          const active = opt.value === value;
          return (
            <Box
              as="button"
              key={opt.value}
              px="3"
              py="1.5"
              fontSize="sm"
              bg={active ? "ink" : "transparent"}
              color={active ? "paper" : "fg"}
              borderLeftWidth={i > 0 ? "1px" : "0"}
              borderColor="border"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
            >
              {opt.label}
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}
