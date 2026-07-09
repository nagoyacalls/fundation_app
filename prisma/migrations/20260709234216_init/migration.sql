-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('aberta', 'em_andamento', 'concluida', 'cancelada');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "refreshToken" TEXT,
    "deltaLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "graphId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preview" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "senderDomain" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "webLink" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demand" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "emailId" TEXT,
    "category" TEXT,
    "classificationConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "status" "DemandStatus" NOT NULL DEFAULT 'aberta',
    "assigneeId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandRule" (
    "id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyDomain_domain_key" ON "CompanyDomain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Email_graphId_key" ON "Email"("graphId");

-- CreateIndex
CREATE INDEX "Email_senderDomain_idx" ON "Email"("senderDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Demand_emailId_key" ON "Demand"("emailId");

-- CreateIndex
CREATE INDEX "Demand_companyId_status_idx" ON "Demand"("companyId", "status");

-- CreateIndex
CREATE INDEX "Demand_classificationConfirmed_idx" ON "Demand"("classificationConfirmed");

-- AddForeignKey
ALTER TABLE "CompanyDomain" ADD CONSTRAINT "CompanyDomain_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
