import { prisma } from "@/lib/prisma";
import CalendarClient from "@/components/CalendarClient";

export const dynamic = "force-dynamic"; // Ensure it updates without rebuilding

export default async function Home() {
  const rawAppointments = await prisma.appointment.findMany({
    orderBy: { date: "asc" },
  });

  // Serialize Date objects to strings to prevent Next.js hydration errors
  const appointments = rawAppointments.map((appt) => ({
    ...appt,
    date: appt.date.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-gray-50 p-4 font-sans">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center text-green-600 mb-6 flex items-center justify-center gap-2">
          <span>📅</span> ปฏิทินนัดหมาย
        </h1>

        <CalendarClient appointments={appointments} />
      </div>
    </main>
  );
}
