// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_LAYOUT_CONFIG, buildSearchText, type ChatMessage } from "@travel/shared";

// Dev seed. Gives the feed real content for later phases and exercises the
// schema (cascades, the unique reaction constraint, JSON columns). Re-runnable:
// clears the tables first. All seeded users share one password.
const prisma = new PrismaClient();

const SEED_PASSWORD = "travel123";
const LAYOUT = JSON.stringify(DEFAULT_LAYOUT_CONFIG);

function dest(
  order: number,
  name: string,
  country: string,
  description: string,
  note?: string,
): Prisma.DestinationCreateWithoutItineraryInput {
  return {
    order,
    name,
    country,
    description,
    note: note ?? null,
    searchText: buildSearchText(name, country),
  };
}

function messages(...pairs: [string, string][]): string {
  const base = Date.parse("2026-06-01T10:00:00.000Z");
  const list: ChatMessage[] = [];
  pairs.forEach(([userText, assistantText], i) => {
    list.push({
      id: `seed-u-${i}`,
      role: "user",
      content: userText,
      createdAt: new Date(base + i * 2000).toISOString(),
    });
    list.push({
      id: `seed-a-${i}`,
      role: "assistant",
      content: assistantText,
      createdAt: new Date(base + i * 2000 + 1000).toISOString(),
    });
  });
  return JSON.stringify(list);
}

async function main() {
  // Order matters even with cascades, since deleteMany does not cascade.
  await prisma.reaction.deleteMany();
  await prisma.destination.deleteMany();
  await prisma.itinerary.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const ana = await prisma.user.create({
    data: { email: "ana@example.com", displayName: "Ana", passwordHash },
  });
  const marco = await prisma.user.create({
    data: { email: "marco@example.com", displayName: "Marco", passwordHash },
  });

  const iberia = await prisma.itinerary.create({
    data: {
      ownerId: ana.id,
      title: "Iberia in 10 Days",
      status: "published",
      layoutConfig: LAYOUT,
      chatMessages: messages([
        "10 days in Spain and Portugal, cities and food",
        "Great. I started you in Lisbon, then Sintra for a half-day, then Madrid.",
      ]),
      publishedAt: new Date("2026-06-10T12:00:00.000Z"),
      heartCount: 1,
      likeCount: 0,
      destinations: {
        create: [
          dest(
            0,
            "Lisbon",
            "Portugal",
            "Old-town trams, miradouros and pastel de nata.",
            "Stay in Alfama, skip the tram queue.",
          ),
          dest(1, "Sintra", "Portugal", "Palaces in the hills, an easy half-day trip from Lisbon."),
          dest(2, "Madrid", "Spain", "The Prado, tapas crawls and late dinners."),
        ],
      },
    },
  });

  const japan = await prisma.itinerary.create({
    data: {
      ownerId: marco.id,
      title: "Japan in Spring",
      status: "published",
      layoutConfig: LAYOUT,
      chatMessages: messages([
        "Two weeks in Japan in cherry blossom season",
        "Here is Tokyo, Kyoto and Osaka to start. We can add Kanazawa next.",
      ]),
      publishedAt: new Date("2026-06-20T09:00:00.000Z"),
      heartCount: 0,
      likeCount: 1,
      destinations: {
        create: [
          dest(0, "Tokyo", "Japan", "Neon districts, quiet shrines and the best conveyor sushi."),
          dest(1, "Kyoto", "Japan", "Temples, bamboo groves and machiya streets."),
          dest(2, "Osaka", "Japan", "Street food in Dotonbori and a castle moat walk."),
        ],
      },
    },
  });

  // A private draft so /me has something in both sections later.
  await prisma.itinerary.create({
    data: {
      ownerId: ana.id,
      title: "Patagonia (rough draft)",
      status: "draft",
      layoutConfig: LAYOUT,
      chatMessages: messages([
        "A week of hiking in Patagonia",
        "Started a draft with El Chalten and Torres del Paine. Tell me your dates.",
      ]),
      destinations: {
        create: [
          dest(
            0,
            "El Chalten",
            "Argentina",
            "Trailhead town under Fitz Roy, day hikes for every level.",
          ),
          dest(1, "Torres del Paine", "Chile", "The W trek, granite towers and turquoise lakes."),
        ],
      },
    },
  });

  // Reactions exercise the unique constraint and match the denormalized counts.
  await prisma.reaction.create({
    data: { itineraryId: iberia.id, userId: marco.id, type: "heart" },
  });
  await prisma.reaction.create({
    data: { itineraryId: japan.id, userId: ana.id, type: "like" },
  });

  const counts = await prisma.itinerary.count();
  const dests = await prisma.destination.count();
  console.log(
    `Seeded ${counts} itineraries, ${dests} destinations, 2 users (password: ${SEED_PASSWORD}), 2 reactions.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
