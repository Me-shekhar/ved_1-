-- CreateTable
CREATE TABLE `Patient` (
    `id` VARCHAR(191) NOT NULL,
    `bedNumber` VARCHAR(191) NOT NULL,
    `initials` VARCHAR(191) NOT NULL,
    `insertionDate` DATETIME(3) NOT NULL,
    `wardId` VARCHAR(191) NULL,
    `patientFactors` JSON NOT NULL,
    `safetyChecklist` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Consent` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `audioPlayed` BOOLEAN NOT NULL,
    `audioLanguageUsed` VARCHAR(191) NOT NULL,
    `playbackFinishedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImageCapture` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `imageType` ENUM('catheter_site', 'traction_module') NOT NULL,
    `imageUrl` LONGTEXT NOT NULL,
    `captureStatus` ENUM('success', 'failed') NOT NULL,
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShiftEvents` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `tractionPullsYellow` INTEGER NOT NULL DEFAULT 0,
    `tractionPullsRed` INTEGER NOT NULL DEFAULT 0,
    `dressingChanged` BOOLEAN NOT NULL DEFAULT false,
    `catheterChanged` BOOLEAN NOT NULL DEFAULT false,
    `flushingDone` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiskSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `capturedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `clisaScore` INTEGER NOT NULL,
    `predictiveClabsiScore` INTEGER NOT NULL,
    `predictiveClabsiBand` ENUM('green', 'yellow', 'red') NOT NULL,
    `predictiveVenousResistanceBand` ENUM('green', 'yellow', 'red') NOT NULL,
    `recommendedAction` VARCHAR(191) NOT NULL,
    `tractionPullsYellow` INTEGER NOT NULL,
    `tractionPullsRed` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Alert` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NULL,
    `type` ENUM('traction', 'dressing_failure', 'high_clabsi', 'high_venous_resistance', 'resource_shortage') NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `severity` ENUM('info', 'warning', 'critical') NOT NULL,
    `recommendedAction` VARCHAR(191) NOT NULL,
    `acknowledged` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WardMetrics` (
    `id` VARCHAR(191) NOT NULL,
    `wardId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `clabsiCases` INTEGER NOT NULL,
    `totalCentralLineDays` INTEGER NOT NULL,
    `dressingChangeCount` INTEGER NOT NULL,
    `catheterChangeCount` INTEGER NOT NULL,
    `derivedRate` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResourceMetric` (
    `id` VARCHAR(191) NOT NULL,
    `wardId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `patientsNeeding` INTEGER NOT NULL,
    `availableDressings` INTEGER NOT NULL,
    `availableCatheters` INTEGER NOT NULL,
    `dressingsDeficitRate` DOUBLE NOT NULL,
    `cathetersDeficitRate` DOUBLE NOT NULL,
    `combinedRate` DOUBLE NOT NULL,
    `band` ENUM('green', 'yellow', 'red') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Consent` ADD CONSTRAINT `Consent_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImageCapture` ADD CONSTRAINT `ImageCapture_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShiftEvents` ADD CONSTRAINT `ShiftEvents_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiskSnapshot` ADD CONSTRAINT `RiskSnapshot_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
