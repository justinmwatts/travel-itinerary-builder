// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Field, Flex, Heading, Input, Spinner, Stack, Text } from "@chakra-ui/react";
import { SegmentedControl } from "../../components/SegmentedControl";
import { useMe } from "../auth/api";
import { publishItinerary, updateItinerary, useItinerary } from "../itineraries/api";
import { useLayoutStore } from "../../stores/layoutStore";
import { LayoutPreview } from "./LayoutPreview";

export function CustomizePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: itinerary, isPending, isError } = useItinerary(id);

  const config = useLayoutStore((s) => s.config);
  const updateField = useLayoutStore((s) => s.updateField);

  const [titleInput, setTitleInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  // Reset the editor state when leaving.
  useEffect(() => () => useLayoutStore.getState().reset(), []);

  // A missing or non-owned itinerary routes back to /me.
  useEffect(() => {
    if (id && isError) navigate("/me", { replace: true });
  }, [id, isError, navigate]);

  // Initialize the editor from the loaded itinerary once.
  useEffect(() => {
    if (!itinerary || initRef.current) return;
    if (me && itinerary.ownerId !== me.id) {
      navigate("/me", { replace: true });
      return;
    }
    initRef.current = true;
    useLayoutStore.getState().setConfig(itinerary.layoutConfig);
    setTitleInput(itinerary.title);
  }, [itinerary, me, navigate]);

  if (isPending || !initRef.current) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <Spinner color="accent" />
      </Flex>
    );
  }
  if (!itinerary) return null;

  const isDraft = itinerary.status === "draft";
  const hasTitle = titleInput.trim() !== "";
  const hasStops = itinerary.destinations.length > 0;
  const canSubmit = hasTitle && hasStops;

  async function handleSubmit() {
    if (!id || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateItinerary(id, { title: titleInput.trim(), layoutConfig: config });
      if (isDraft) await publishItinerary(id);
      navigate(`/itinerary/${id}`);
    } catch {
      setError(isDraft ? "Could not publish. Try again." : "Could not save. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <Flex direction={{ base: "column", md: "row" }} maxW="1100px" mx="auto" w="100%">
      {/* Controls */}
      <Box
        flex="1"
        p={{ base: "5", md: "6" }}
        borderRightWidth={{ md: "1px" }}
        borderBottomWidth={{ base: "1px", md: "0" }}
        borderColor="border"
      >
        <Heading textStyle="display-md" mb="6">
          Customize
        </Heading>

        <Stack gap="5">
          <Field.Root>
            <Field.Label>Title</Field.Label>
            <Input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Name your itinerary"
              bg="bg.surface"
              borderColor="border"
            />
          </Field.Root>

          <SegmentedControl
            label="Text density"
            value={config.textDensity}
            onChange={(v) => updateField("textDensity", v)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
              { value: "spacious", label: "Spacious" },
            ]}
          />
          <SegmentedControl
            label="Card size"
            value={config.cardSize}
            onChange={(v) => updateField("cardSize", v)}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
            ]}
          />
          <SegmentedControl
            label="Image crop"
            value={config.imageCrop}
            onChange={(v) => updateField("imageCrop", v)}
            options={[
              { value: "fill", label: "Fill" },
              { value: "fit", label: "Fit" },
            ]}
          />
          <SegmentedControl
            label="Image position"
            value={config.imageFocus}
            onChange={(v) => updateField("imageFocus", v)}
            options={[
              { value: "top", label: "Top" },
              { value: "center", label: "Center" },
              { value: "bottom", label: "Bottom" },
            ]}
          />
        </Stack>

        {error ? (
          <Box mt="5" bg="paper" borderWidth="1px" borderColor="danger" rounded="sm" px="3" py="2">
            <Text textStyle="small" color="danger">
              {error}
            </Text>
          </Box>
        ) : null}

        <Flex mt="6" gap="3" align="center">
          <Button
            variant="outline"
            borderColor="border"
            color="fg"
            onClick={() => navigate(`/build/${id}`)}
          >
            Back
          </Button>
          <Button
            bg="ink"
            color="paper"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            loading={submitting}
            loadingText={isDraft ? "Publishing" : "Saving"}
          >
            {isDraft ? "Publish" : "Save changes"}
          </Button>
          {!canSubmit ? (
            <Text textStyle="small" color="fg.muted">
              {!hasTitle ? "Add a title" : "Add at least one destination"} to publish.
            </Text>
          ) : null}
        </Flex>
      </Box>

      {/* Preview */}
      <Box flex="1" p={{ base: "5", md: "6" }} bg="bg.canvas">
        <Text textStyle="small" color="fg.muted" mb="3">
          Preview (as it appears in the feed)
        </Text>
        <LayoutPreview
          title={titleInput}
          author={itinerary.author.displayName}
          destinations={itinerary.destinations}
          config={config}
        />
      </Box>
    </Flex>
  );
}
