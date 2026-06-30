import type { ComponentType } from "react";
import { Box, HStack, chakra } from "@chakra-ui/react";
import type { ReactionType } from "@travel/shared";
import { HeartIcon, LikeIcon } from "./icons";

// Heart and like with counts. Display-only by default (Phase 8); pass onToggle to
// make the reactions interactive (Phase 9). Heart rose and like teal stay far
// apart in hue so the two never read as the same control.
interface ReactionBarProps {
  heartCount: number;
  likeCount: number;
  myReactions?: ReactionType[];
  onToggle?: (type: ReactionType) => void;
  disabled?: boolean;
}

export function ReactionBar({
  heartCount,
  likeCount,
  myReactions = [],
  onToggle,
  disabled = false,
}: ReactionBarProps) {
  const interactive = Boolean(onToggle);

  function reaction(
    type: ReactionType,
    count: number,
    active: boolean,
    activeColor: string,
    Icon: ComponentType<{ filled?: boolean }>,
  ) {
    const inner = (
      <HStack gap="1.5" color={active ? activeColor : "fg.muted"} fontSize="sm">
        <Box fontSize="md" lineHeight="0">
          <Icon filled={active} />
        </Box>
        <span>{count}</span>
      </HStack>
    );

    if (!interactive) {
      return (
        <Box key={type} aria-label={`${count} ${type}`}>
          {inner}
        </Box>
      );
    }

    return (
      <chakra.button
        key={type}
        disabled={disabled}
        aria-pressed={active}
        aria-label={`${active ? "Remove" : "Add"} ${type} reaction`}
        _hover={{ color: activeColor }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle?.(type);
        }}
      >
        {inner}
      </chakra.button>
    );
  }

  return (
    <HStack gap="4">
      {reaction("heart", heartCount, myReactions.includes("heart"), "heart", HeartIcon)}
      {reaction("like", likeCount, myReactions.includes("like"), "accent", LikeIcon)}
    </HStack>
  );
}
