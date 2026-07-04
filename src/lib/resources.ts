import { prisma } from "@/lib/db";
import type { Resource } from "@/lib/crud";

export const customerResource: Resource = {
  model: prisma.customer,
  searchFields: ["name", "phone", "email", "contactPerson", "gstNumber"],
  fields: [
    { name: "name", type: "string" },
    { name: "contactPerson", type: "string" },
    { name: "phone", type: "string" },
    { name: "email", type: "string", transform: "lower" },
    { name: "address", type: "string" },
    { name: "gstNumber", type: "string", transform: "upper" },
    { name: "openingBalance", type: "number" },
    { name: "notes", type: "string" },
    { name: "isActive", type: "boolean" },
  ],
};

export const vehicleResource: Resource = {
  model: prisma.vehicle,
  searchFields: ["registrationNumber", "make", "model", "type"],
  fields: [
    { name: "registrationNumber", type: "string", transform: "upper" },
    { name: "type", type: "string" },
    { name: "make", type: "string" },
    { name: "model", type: "string" },
    { name: "capacityTons", type: "number" },
    { name: "purchasePrice", type: "number" },
    { name: "ownership", type: "string" },
    { name: "ownerName", type: "string" },
    { name: "registeringAuthority", type: "string" },
    { name: "vehicleClass", type: "string" },
    { name: "fuelType", type: "string" },
    { name: "emissionNorm", type: "string" },
    { name: "hypothecated", type: "boolean" },
    { name: "vehicleStatus", type: "string" },
    { name: "registrationDate", type: "date" },
    { name: "insuranceExpiry", type: "date" },
    { name: "fitnessExpiry", type: "date" },
    { name: "taxValidUpto", type: "date" },
    { name: "permitValidUpto", type: "date" },
    { name: "puccValidUpto", type: "date" },
    { name: "isActive", type: "boolean" },
    { name: "notes", type: "string" },
  ],
};

export const driverResource: Resource = {
  model: prisma.driver,
  searchFields: ["name", "phone", "licenseNumber"],
  fields: [
    { name: "name", type: "string" },
    { name: "phone", type: "string" },
    { name: "licenseNumber", type: "string", transform: "upper" },
    { name: "licenseExpiry", type: "date" },
    { name: "address", type: "string" },
    { name: "salary", type: "number" },
    { name: "isActive", type: "boolean" },
    { name: "notes", type: "string" },
  ],
};

export const bookingResource: Resource = {
  model: prisma.booking,
  searchFields: ["pickupLocation", "dropLocation"],
  include: {
    tripSheets: {
      include: {
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
    },
  },
  fields: [
    { name: "vehicleId", type: "string" },
    { name: "driverId", type: "string" },
    { name: "pickupLocation", type: "string" },
    { name: "dropLocation", type: "string" },
    { name: "pickupDate", type: "date" },
    { name: "dropDate", type: "date" },
    { name: "ratePerDay", type: "number" },
    { name: "startKm", type: "number" },
    { name: "endKm", type: "number" },
    { name: "status", type: "string" },
    { name: "notes", type: "string" },
  ],
};

export const tripSheetResource: Resource = {
  model: prisma.tripSheet,
  searchFields: ["status", "remarks"],
  include: {
    booking: {
      include: {
        vehicle: true,
      },
    },
    driver: true,
    invoices: {
      select: {
        id: true,
        invoiceNumber: true,
      },
    },
  },
  fields: [
    { name: "bookingId", type: "string" },
    { name: "driverId", type: "string" },
    { name: "startDate", type: "date" },
    { name: "endDate", type: "date" },
    { name: "distance", type: "number" },
    { name: "dieselUsed", type: "number" },
    { name: "dieselCost", type: "number" },
    { name: "toll", type: "number" },
    { name: "otherExpenses", type: "number" },
    { name: "remarks", type: "string" },
    { name: "status", type: "string" },
  ],
};

export const paymentResource: Resource = {
  model: prisma.payment,
  searchFields: ["reference"],
  include: {
    invoice: { select: { invoiceNumber: true } },
  },
  fields: [
    { name: "invoiceId", type: "string" },
    { name: "amount", type: "number" },
    { name: "paymentDate", type: "date" },
    { name: "method", type: "string" },
    { name: "reference", type: "string" },
    { name: "notes", type: "string" },
  ],
};

export const invoiceResource: Resource = {
  model: prisma.invoice,
  searchFields: ["invoiceNumber", "status", "notes"],
  include: {
    customer: true,
    vehicle: true,
    driver: true,
    lineItems: { include: { vehicle: true } },
    payments: { select: { method: true, amount: true } },
    tripSheet: {
      include: {
        driver: true,
        booking: {
          include: {
            customer: true,
          },
        },
      },
    },
  },
  fields: [
    { name: "customerId", type: "string" },
    { name: "tripSheetId", type: "string" },
    { name: "vehicleId", type: "string" },
    { name: "driverId", type: "string" },
    { name: "invoiceDate", type: "date" },
    { name: "invoiceNumber", type: "string" },
    { name: "subtotal", type: "number" },
    { name: "gstPercentage", type: "number" },
    { name: "gstAmount", type: "number" },
    { name: "totalAmount", type: "number" },
    { name: "paidAmount", type: "number" },
    { name: "status", type: "string" },
    { name: "notes", type: "string" },
  ],
};
