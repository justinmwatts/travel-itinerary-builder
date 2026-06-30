import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Flex, Heading, Text, Textarea } from "@chakra-ui/react";
import { LIMITS, type Destination } from "@travel/shared";
import { CoverImage } from "../../components/CoverImage";

// Read-only note, visually distinct from the AI description (accent rule + label).
function NoteDisplay({ note }: { note: string }) {
  return (
    <Box mt="2" pl="3" borderLeftWidth="2px" borderColor="accent">
      <Text textStyle="small" color="fg.muted">
        <Text as="span" fontWeight="600" color="fg">
          Note:
        </Text>{" "}
        {note}
      </Text>
    </Box>
  );
}

// Inline editor: click the note (or "Add a note") to edit, autosave on blur.
// Creator notes are the user's own words, kept separate from AI text.
function NoteEditor({
  note,
  onSave,
}: {
  note: string | null;
  onSave: (note: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note ?? "");

  // Sync when a refinement changes the note while we are not editing.
  useEffect(() => {
    if (!editing) setValue(note ?? "");
  }, [note, editing]);

  function commit() {
    setEditing(false);
    const normalized = value.trim() === "" ? null : value.trim();
    if (normalized !== (note ?? null)) onSave(normalized);
  }

  if (editing) {
    return (
      <Box mt="2">
        <Textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          placeholder="Your own note for this stop, kept separate from the AI text..."
          rows={2}
          resize="vertical"
          bg="bg.surface"
          borderColor="border"
          maxLength={LIMITS.noteMax}
        />
      </Box>
    );
  }

  if (note) {
    return (
      <Box cursor="text" onClick={() => setEditing(true)} role="button" aria-label="Edit note">
        <NoteDisplay note={note} />
      </Box>
    );
  }

  return (
    <Button mt="2" size="xs" variant="ghost" color="accent" onClick={() => setEditing(true)}>
      + Add a note
    </Button>
  );
}

function DestinationCard({
  destination,
  index,
  onSaveNote,
}: {
  destination: Destination;
  index: number;
  onSaveNote?: (destId: string, note: string | null) => void;
}) {
  return (
    <Box borderBottomWidth="1px" borderColor="border" py="4">
      <Flex gap="3">
        <Box w="72px" h="72px" flexShrink="0">
          <CoverImage
            name={destination.name}
            imageUrl={destination.imageUrl}
            imageAlt={destination.imageAlt}
            credit={destination.imageCredit}
          />
        </Box>
        <Box flex="1">
          <Text textStyle="small" color="fg.muted">
            {index + 1}
          </Text>
          <Heading textStyle="title">
            {destination.name}
            <Text as="span" textStyle="small" color="fg.muted" ml="2">
              {destination.country}
            </Text>
          </Heading>
          <Text textStyle="body" color="fg" mt="1">
            {destination.description}
          </Text>
          {onSaveNote ? (
            <NoteEditor
              note={destination.note}
              onSave={(note) => onSaveNote(destination.id, note)}
            />
          ) : destination.note ? (
            <NoteDisplay note={destination.note} />
          ) : null}
        </Box>
      </Flex>
    </Box>
  );
}

export function ItineraryPanel({
  title,
  destinations,
  itineraryId,
  onSaveNote,
}: {
  title: string;
  destinations: Destination[];
  itineraryId: string | null;
  onSaveNote?: (destId: string, note: string | null) => void;
}) {
  const hasContent = destinations.length > 0;
  const canCustomize = Boolean(itineraryId) && hasContent;

  return (
    <Flex direction="column" h="100%">
      <Flex
        align="center"
        justify="space-between"
        px="5"
        py="4"
        borderBottomWidth="1px"
        borderColor="border"
      >
        <Heading textStyle="display-md">{title || "Untitled itinerary"}</Heading>
      </Flex>

      <Box flex="1" overflowY="auto" px="5">
        {hasContent ? (
          destinations.map((d, i) => (
            <DestinationCard key={d.id} destination={d} index={i} onSaveNote={onSaveNote} />
          ))
        ) : (
          <Flex h="100%" align="center" justify="center" py="16">
            <Text textStyle="body" color="fg.muted" textAlign="center" maxW="320px">
              Your itinerary appears here as you chat. Try asking for a trip on the left.
            </Text>
          </Flex>
        )}
      </Box>

      <Box px="5" py="4" borderTopWidth="1px" borderColor="border">
        {canCustomize ? (
          <Button asChild w="100%" bg="ink" color="paper">
            <RouterLink to={`/build/${itineraryId}/customize`}>Customize and publish</RouterLink>
          </Button>
        ) : (
          <Button w="100%" variant="outline" borderColor="border" color="fg.subtle" disabled>
            Customize and publish
          </Button>
        )}
      </Box>
    </Flex>
  );
}
