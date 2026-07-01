// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { Link, Text } from "@chakra-ui/react";

// Pexels attribution is a license requirement: a small "Photo by NAME on Pexels"
// line linking to the photo page (design.md section 9).
export function PexelsCredit({
  credit,
  creditUrl,
}: {
  credit: string | null;
  creditUrl: string | null;
}) {
  if (!credit) return null;
  return (
    <Text textStyle="micro" color="fg.subtle">
      Photo by{" "}
      {creditUrl ? (
        <Link href={creditUrl} target="_blank" rel="noopener noreferrer" color="accent">
          {credit}
        </Link>
      ) : (
        credit
      )}{" "}
      on Pexels
    </Text>
  );
}
