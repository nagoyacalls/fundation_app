-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- Novas colunas, nulas até o backfill terminar
ALTER TABLE "Demand" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "DemandRule" ADD COLUMN "categoryId" TEXT;

-- Backfill: categorias existentes com o nome normalizado — mesma regra de
-- lib/category.ts (sem acentos, minúsculas, espaços viram underscore).
INSERT INTO "Category" ("id", "name")
SELECT md5(n."name"), n."name"
FROM (
  SELECT DISTINCT regexp_replace(lower(trim(translate(src."category",
    'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'))), '\s+', '_', 'g') AS "name"
  FROM (
    SELECT "category" FROM "Demand" WHERE "category" IS NOT NULL
    UNION
    SELECT "category" FROM "DemandRule"
  ) src
) n;

UPDATE "Demand" d SET "categoryId" = c."id"
FROM "Category" c
WHERE d."category" IS NOT NULL
  AND c."name" = regexp_replace(lower(trim(translate(d."category",
    'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'))), '\s+', '_', 'g');

UPDATE "DemandRule" r SET "categoryId" = c."id"
FROM "Category" c
WHERE c."name" = regexp_replace(lower(trim(translate(r."category",
    'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'))), '\s+', '_', 'g');

-- Regra sem categoria não existe
ALTER TABLE "DemandRule" ALTER COLUMN "categoryId" SET NOT NULL;

-- O texto livre sai: a tabela é a fonte de verdade
ALTER TABLE "Demand" DROP COLUMN "category";
ALTER TABLE "DemandRule" DROP COLUMN "category";

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DemandRule" ADD CONSTRAINT "DemandRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
