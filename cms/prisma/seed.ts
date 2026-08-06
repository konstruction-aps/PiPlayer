import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { generatePairingCode } from "../src/lib/auth";

async function main() {
  const email = "admin@lumen.local";
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name: "Admin" },
    create: { email, name: "Admin", passwordHash },
  });

  let layout = await prisma.layout.findFirst({ where: { name: "Welcome" } });
  if (!layout) {
    layout = await prisma.layout.create({
      data: {
        name: "Welcome",
        theme: "welcome",
        backgroundColor: "#10241C",
        elements: {
          create: [
            {
              type: "text",
              x: 160,
              y: 320,
              width: 1600,
              height: 140,
              zIndex: 2,
              content: "Welcome",
              fontFamily: "Georgia, serif",
              fontSize: 120,
              fontWeight: "700",
              color: "#F4F0E6",
              textAlign: "center",
            },
            {
              type: "text",
              x: 280,
              y: 500,
              width: 1360,
              height: 100,
              zIndex: 2,
              content: "Drop in your own words and pictures.",
              fontFamily: "Helvetica Neue, Arial, sans-serif",
              fontSize: 42,
              fontWeight: "400",
              color: "#B7C7BE",
              textAlign: "center",
            },
          ],
        },
      },
    });
  }

  let screen = await prisma.screen.findFirst({ where: { name: "Lobby" } });
  if (!screen) {
    screen = await prisma.screen.create({
      data: {
        name: "Lobby",
        location: "Front desk",
        pairingCode: generatePairingCode(),
        status: "pairing",
        layoutId: layout.id,
      },
    });
  }

  console.log("Seeded Lumen");
  console.log("  Login: admin@lumen.local / admin123");
  console.log(`  Page: ${layout.name}`);
  console.log(`  Screen: ${screen.name} (${screen.pairingCode})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
