import { PrismaClient } from '@prisma/client';
import { calculateRiskSnapshot, type PatientFactorFlags, type SafetyChecklist } from '../lib/riskEngine';

const prisma = new PrismaClient();

async function main() {
  await prisma.alert.deleteMany();
  await prisma.riskSnapshot.deleteMany();
  await prisma.imageCapture.deleteMany();
  await prisma.shiftEvents.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.resourceMetric.deleteMany();
  await prisma.wardMetrics.deleteMany();
  await prisma.patient.deleteMany();

  const patients = await Promise.all(
    samplePatients.map((seed) =>
      prisma.patient.create({
        data: {
          bedNumber: seed.bedNumber,
          initials: seed.initials,
          insertionDate: seed.insertionDate,
          wardId: seed.wardId,
          patientFactors: seed.patientFactors,
          safetyChecklist: seed.safetyChecklist
        }
      })
    )
  );

  for (const patient of patients) {
    const patientFactors = patient.patientFactors as unknown as PatientFactorFlags;
    const safetyChecklist = patient.safetyChecklist as unknown as SafetyChecklist;

    const computation = calculateRiskSnapshot({
      insertionDate: patient.insertionDate,
      patientFactors,
      safetyChecklist,
      tractionPullsYellow: Math.floor(Math.random() * 3),
      tractionPullsRed: Math.floor(Math.random() * 2),
      dressingChanged: Math.random() > 0.5,
      catheterChanged: false,
      flushingDone: true
    });

    await prisma.riskSnapshot.create({
      data: {
        patientId: patient.id,
        clisaScore: computation.clisaScore,
        predictiveClabsiScore: computation.predictiveClabsiScore,
        predictiveClabsiBand: computation.predictiveClabsiBand,
        predictiveVenousResistanceBand: computation.predictiveVenousResistanceBand,
        recommendedAction: computation.recommendedAction,
        tractionPullsYellow: computation.tractionPullsYellow,
        tractionPullsRed: computation.tractionPullsRed
      }
    });
  }

  const today = new Date();
  for (let i = 0; i < 14; i += 1) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const lineDays = 40 + Math.floor(Math.random() * 10);
    const clabsiCases = Math.floor(Math.random() * 2);
    const derivedRate = (clabsiCases * 1000) / lineDays;
    await prisma.wardMetrics.create({
      data: {
        wardId: 'CVL-01',
        date,
        clabsiCases,
        totalCentralLineDays: lineDays,
        dressingChangeCount: 15 + Math.floor(Math.random() * 5),
        catheterChangeCount: 4 + Math.floor(Math.random() * 2),
        derivedRate
      }
    });
  }

  await prisma.resourceMetric.create({
    data: {
      wardId: 'CVL-01',
      patientsNeeding: 30,
      availableDressings: 18,
      availableCatheters: 20,
      dressingsDeficitRate: 40,
      cathetersDeficitRate: 33.3,
      combinedRate: 36.7,
      band: 'yellow'
    }
  });

  console.log('Seed completed');
}

const samplePatients = [
  {
    bedNumber: '12B',
    initials: 'AB',
    insertionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    wardId: 'CVL-01',
    patientFactors: {
      agitation: true,
      extremesAgeWeightObesity: false,
      comorbidities: true,
      immuneNutrition: false
    },
    safetyChecklist: {
      capsClosed: true,
      glovesWorn: true,
      noAbnormalities: false,
      dressingIntact: true
    }
  },
  {
    bedNumber: '08A',
    initials: 'CD',
    insertionDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    wardId: 'CVL-01',
    patientFactors: {
      agitation: false,
      extremesAgeWeightObesity: true,
      comorbidities: false,
      immuneNutrition: false
    },
    safetyChecklist: {
      capsClosed: true,
      glovesWorn: true,
      noAbnormalities: true,
      dressingIntact: false
    }
  },
  {
    bedNumber: '21C',
    initials: 'EF',
    insertionDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    wardId: 'CVL-01',
    patientFactors: {
      agitation: false,
      extremesAgeWeightObesity: true,
      comorbidities: true,
      immuneNutrition: true
    },
    safetyChecklist: {
      capsClosed: true,
      glovesWorn: true,
      noAbnormalities: false,
      dressingIntact: false
    }
  }
];

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
