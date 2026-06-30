import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Flex, Heading, HStack, Skeleton, Stack, Text } from "@chakra-ui/react";
import type { MyItinerarySummary } from "@travel/shared";
import { sanitizeText } from "../../lib/sanitize";
import { useDeleteItinerary, useMyItineraries } from "../itineraries/api";

function ItineraryRow({
  item,
  confirming,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  deleting,
}: {
  item: MyItinerarySummary;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  deleting: boolean;
}) {
  const isDraft = item.status === "draft";
  return (
    <Flex
      align="center"
      justify="space-between"
      gap="4"
      py="4"
      borderBottomWidth="1px"
      borderColor="border"
    >
      <Box minW="0">
        <Heading textStyle="title" truncate>
          {sanitizeText(item.title) || "Untitled itinerary"}
        </Heading>
        <HStack gap="3" mt="1">
          <Text textStyle="small" color="fg.muted">
            {item.stopCount} {item.stopCount === 1 ? "stop" : "stops"}
          </Text>
          {!isDraft ? (
            <Text textStyle="small" color="fg.muted">
              heart {item.heartCount} · like {item.likeCount}
            </Text>
          ) : null}
        </HStack>
      </Box>

      {confirming ? (
        <HStack gap="2" flexShrink="0">
          <Text textStyle="small" color="fg.muted">
            Delete?
          </Text>
          <Button size="sm" variant="outline" borderColor="border" onClick={onCancelDelete}>
            Cancel
          </Button>
          <Button size="sm" bg="danger" color="paper" loading={deleting} onClick={onConfirmDelete}>
            Delete
          </Button>
        </HStack>
      ) : (
        <HStack gap="2" flexShrink="0">
          <Button asChild size="sm" variant="outline" borderColor="border" color="fg">
            <RouterLink to={`/build/${item.id}`}>{isDraft ? "Resume" : "Edit"}</RouterLink>
          </Button>
          {!isDraft ? (
            <Button asChild size="sm" variant="outline" borderColor="border" color="fg">
              <RouterLink to={`/itinerary/${item.id}`}>View</RouterLink>
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            borderColor="danger"
            color="danger"
            onClick={onAskDelete}
          >
            Delete
          </Button>
        </HStack>
      )}
    </Flex>
  );
}

function Section({
  title,
  items,
  confirmingId,
  setConfirmingId,
  onConfirmDelete,
  deletingId,
}: {
  title: string;
  items: MyItinerarySummary[];
  confirmingId: string | null;
  setConfirmingId: (id: string | null) => void;
  onConfirmDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <Box>
      <Text
        textStyle="small"
        color="fg.muted"
        textTransform="uppercase"
        letterSpacing="wide"
        mb="1"
      >
        {title}
      </Text>
      {items.map((item) => (
        <ItineraryRow
          key={item.id}
          item={item}
          confirming={confirmingId === item.id}
          deleting={deletingId === item.id}
          onAskDelete={() => setConfirmingId(item.id)}
          onCancelDelete={() => setConfirmingId(null)}
          onConfirmDelete={() => onConfirmDelete(item.id)}
        />
      ))}
    </Box>
  );
}

export function MyItinerariesPage() {
  const { data, isPending, isError, refetch } = useMyItineraries();
  const del = useDeleteItinerary();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDelete(id: string) {
    setDeletingId(id);
    del.mutate(id, {
      onSettled: () => {
        setDeletingId(null);
        setConfirmingId(null);
      },
    });
  }

  const isEmpty = data && data.drafts.length === 0 && data.published.length === 0;

  return (
    <Box maxW="800px" mx="auto" px={{ base: "4", md: "6" }} py="10">
      <Heading textStyle="display-md" mb="6">
        My itineraries
      </Heading>

      {isPending ? (
        <Stack gap="3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h="64px" rounded="md" />
          ))}
        </Stack>
      ) : isError ? (
        <Box borderWidth="1px" borderColor="border" rounded="md" p="6" textAlign="center">
          <Text textStyle="body" color="fg.muted" mb="3">
            Could not load your itineraries.
          </Text>
          <Button variant="outline" borderColor="border" onClick={() => void refetch()}>
            Retry
          </Button>
        </Box>
      ) : isEmpty ? (
        <Stack gap="4" align="center" py="16" textAlign="center">
          <Text textStyle="body" color="fg.muted">
            You haven&apos;t created any itineraries yet.
          </Text>
          <Button asChild bg="ink" color="paper">
            <RouterLink to="/build">Create one</RouterLink>
          </Button>
        </Stack>
      ) : (
        <Stack gap="8">
          <Section
            title="Drafts"
            items={data?.drafts ?? []}
            confirmingId={confirmingId}
            setConfirmingId={setConfirmingId}
            onConfirmDelete={handleDelete}
            deletingId={deletingId}
          />
          <Section
            title="Published"
            items={data?.published ?? []}
            confirmingId={confirmingId}
            setConfirmingId={setConfirmingId}
            onConfirmDelete={handleDelete}
            deletingId={deletingId}
          />
        </Stack>
      )}
    </Box>
  );
}
