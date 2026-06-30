-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Itinerary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "layoutConfig" TEXT NOT NULL,
    "chatMessages" TEXT NOT NULL DEFAULT '[]',
    "heartCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    CONSTRAINT "Itinerary_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itineraryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "note" TEXT,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "imageCredit" TEXT,
    "imageCreditUrl" TEXT,
    CONSTRAINT "Destination_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itineraryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reaction_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Itinerary_publishedAt_id_idx" ON "Itinerary"("publishedAt", "id");

-- CreateIndex
CREATE INDEX "Destination_itineraryId_idx" ON "Destination"("itineraryId");

-- CreateIndex
CREATE INDEX "Destination_searchText_idx" ON "Destination"("searchText");

-- CreateIndex
CREATE INDEX "Reaction_itineraryId_idx" ON "Reaction"("itineraryId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_itineraryId_userId_type_key" ON "Reaction"("itineraryId", "userId", "type");
