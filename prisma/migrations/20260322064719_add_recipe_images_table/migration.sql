/*
  Warnings:

  - You are about to drop the column `image_url` on the `recipes` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "recipe_images" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "recipe_images" ADD CONSTRAINT "recipe_images_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: 既存の image_url を recipe_images に移行
INSERT INTO "recipe_images" ("id", "recipe_id", "url", "order", "is_main", "created_at")
SELECT gen_random_uuid(), "id", "image_url", 0, true, "created_at"
FROM "recipes"
WHERE "image_url" IS NOT NULL;

-- AlterTable
ALTER TABLE "recipes" DROP COLUMN "image_url";
