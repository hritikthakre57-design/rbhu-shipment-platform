import { PrismaClient, CustomerStatus, ShipmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", passwordHash, name: "Admin User", role: "admin" },
  });

  const customersData = [
    { name: "Asha Patil", email: "asha@acme.com", company: "Acme Traders" },
    { name: "Ravi Shah", email: "ravi@globex.com", company: "Globex Logistics" },
    { name: "Meera Iyer", email: "meera@initech.com", company: "Initech" },
  ];

  const customers = [];
  for (const c of customersData) {
    customers.push(
      await prisma.customer.upsert({
        where: { email: c.email },
        update: {},
        create: { ...c, status: CustomerStatus.Active, createdBy: admin.id, updatedBy: admin.id },
      })
    );
  }

  const shipmentsData = [
    { trackingNumber: "TRK-1001", origin: "Mumbai", destination: "Delhi", status: ShipmentStatus.Created },
    { trackingNumber: "TRK-1002", origin: "Pune", destination: "Bengaluru", status: ShipmentStatus.InTransit },
    { trackingNumber: "TRK-1003", origin: "Chennai", destination: "Kolkata", status: ShipmentStatus.Delivered },
    { trackingNumber: "TRK-1004", origin: "Surat", destination: "Jaipur", status: ShipmentStatus.InTransit },
  ];

  for (let i = 0; i < shipmentsData.length; i++) {
    await prisma.shipment.upsert({
      where: { trackingNumber: shipmentsData[i].trackingNumber },
      update: {},
      create: {
        ...shipmentsData[i],
        customerId: customers[i % customers.length].id,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
  }

  console.log("Seed complete. Login: admin@example.com / Admin@123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());