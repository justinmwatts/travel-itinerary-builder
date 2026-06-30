import type { Destination as PrismaDestination } from "@prisma/client";
import { destinationSchema, type Destination } from "@travel/shared";

// Wire-safe destination shape. Drops the internal searchText column and validates
// against the shared schema so responses provably match the contract.
export function toDestinationDTO(row: PrismaDestination): Destination {
  return destinationSchema.parse({
    id: row.id,
    itineraryId: row.itineraryId,
    order: row.order,
    name: row.name,
    country: row.country,
    description: row.description,
    note: row.note,
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
    imageCredit: row.imageCredit,
    imageCreditUrl: row.imageCreditUrl,
  });
}
