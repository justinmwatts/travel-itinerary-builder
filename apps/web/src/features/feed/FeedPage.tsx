import { useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  SimpleGrid,
  Skeleton,
  SkeletonText,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useFeed } from "./api";
import { FeedCard } from "./FeedCard";

function CardSkeleton() {
  return (
    <Box bg="bg.surface" borderWidth="1px" borderColor="border" rounded="md" overflow="hidden">
      <Skeleton h="190px" />
      <Box p="4">
        <SkeletonText noOfLines={2} gap="3" />
      </Box>
    </Box>
  );
}

export function FeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(() => searchParams.get("q") ?? "");
  const [q, setQ] = useState(input);

  // Debounce the input into the active query and mirror it to the URL so results
  // are shareable and back-button friendly.
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);
  useEffect(() => {
    setSearchParams(q ? { q } : {}, { replace: true });
  }, [q, setSearchParams]);

  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeed(q);

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const isEmpty = !isPending && !isError && items.length === 0;

  return (
    <Box maxW="1100px" mx="auto" px={{ base: "4", md: "6" }} py="8">
      <Flex mb="6" gap="4" align="center" wrap="wrap">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by city or country..."
          maxW="420px"
          bg="bg.surface"
          borderColor="border"
        />
        {q ? (
          <Text textStyle="small" color="fg.muted">
            Results for &ldquo;{q}&rdquo;{!isPending ? ` (${items.length})` : ""}
          </Text>
        ) : null}
      </Flex>

      {isError ? (
        <Box borderWidth="1px" borderColor="border" rounded="md" p="8" textAlign="center">
          <Text textStyle="body" color="fg.muted" mb="3">
            Could not load the feed.
          </Text>
          <Button variant="outline" borderColor="border" onClick={() => void refetch()}>
            Retry
          </Button>
        </Box>
      ) : isPending ? (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap="6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </SimpleGrid>
      ) : isEmpty ? (
        q ? (
          <Stack gap="4" align="center" py="20" textAlign="center">
            <Heading textStyle="title">No itineraries mention &ldquo;{q}&rdquo;</Heading>
            <Text textStyle="body" color="fg.muted">
              Try a city or country.
            </Text>
            <Button variant="outline" borderColor="border" onClick={() => setInput("")}>
              Clear search
            </Button>
          </Stack>
        ) : (
          <Stack gap="4" align="center" py="20" textAlign="center">
            <Heading textStyle="title">No itineraries yet</Heading>
            <Text textStyle="body" color="fg.muted">
              Be the first to create one.
            </Text>
            <Button asChild bg="ink" color="paper">
              <RouterLink to="/build">Create one</RouterLink>
            </Button>
          </Stack>
        )
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap="6">
            {items.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </SimpleGrid>
          {hasNextPage ? (
            <Flex justify="center" mt="8">
              <Button
                variant="outline"
                borderColor="border"
                onClick={() => void fetchNextPage()}
                loading={isFetchingNextPage}
              >
                Load more
              </Button>
            </Flex>
          ) : null}
        </>
      )}
    </Box>
  );
}
