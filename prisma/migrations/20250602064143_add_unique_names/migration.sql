/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `chests` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `rankings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `sequences` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "chests_name_key" ON "chests"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rankings_name_key" ON "rankings"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sequences_name_key" ON "sequences"("name");
