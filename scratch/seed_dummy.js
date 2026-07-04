const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  
  // Expired insurance (5 days ago)
  const expiredInsuranceDate = new Date();
  expiredInsuranceDate.setDate(now.getDate() - 5);
  
  // Expiring permit (12 days later)
  const expiringPermitDate = new Date();
  expiringPermitDate.setDate(now.getDate() + 12);
  
  // Expired PUCC (2 days ago)
  const expiredPuccDate = new Date();
  expiredPuccDate.setDate(now.getDate() - 2);

  const dummyVehicles = [
    {
      registrationNumber: "KL-10-AZ-1001",
      type: "truck",
      make: "Tata",
      model: "LPT 1613",
      capacityTons: 16,
      purchasePrice: 2400000,
      ownership: "own",
      ownerName: "Hi Wood",
      isActive: true,
      insuranceExpiry: expiredInsuranceDate,
      fitnessExpiry: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
      taxValidUpto: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      permitValidUpto: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
      puccValidUpto: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      notes: "Dummy Vehicle with Expired Insurance for testing warnings.",
    },
    {
      registrationNumber: "KL-10-AZ-1002",
      type: "tipper",
      make: "Leyland",
      model: "U-3518",
      capacityTons: 25,
      purchasePrice: 3800000,
      ownership: "own",
      ownerName: "Hi Wood",
      isActive: true,
      insuranceExpiry: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000),
      fitnessExpiry: new Date(now.getTime() + 200 * 24 * 60 * 60 * 1000),
      taxValidUpto: new Date(now.getTime() + 80 * 24 * 60 * 60 * 1000),
      permitValidUpto: expiringPermitDate,
      puccValidUpto: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      notes: "Dummy Vehicle with Permit Expiring Soon for testing warnings.",
    },
    {
      registrationNumber: "KL-10-AZ-1003",
      type: "trailer",
      make: "BharatBenz",
      model: "4023T",
      capacityTons: 40,
      purchasePrice: 4500000,
      ownership: "hired",
      ownerName: "KP Transport",
      isActive: true,
      insuranceExpiry: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
      fitnessExpiry: new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000),
      taxValidUpto: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      permitValidUpto: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
      puccValidUpto: expiredPuccDate,
      notes: "Dummy Vehicle with Expired PUCC for testing warnings.",
    }
  ];

  console.log("Adding dummy vehicles to the database...");

  for (const v of dummyVehicles) {
    try {
      const created = await prisma.vehicle.upsert({
        where: { registrationNumber: v.registrationNumber },
        update: v,
        create: v,
      });
      console.log(`Upserted vehicle: ${created.registrationNumber}`);
    } catch (err) {
      console.error(`Error adding vehicle ${v.registrationNumber}:`, err);
    }
  }

  await prisma.$disconnect();
  console.log("Done!");
}

main();
