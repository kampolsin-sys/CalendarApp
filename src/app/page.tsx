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
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 bg-white shadow-xl rounded-2xl">
        <h1 className="text-3xl font-extrabold text-center text-green-700 mb-8 tracking-tight">
          🏥 ระบบจัดการคิวและตารางนัดหมาย
        </h1>
        
        {/* Client Component for Calendar */}
        <CalendarClient appointments={appointments} />
      </div>
    </main>
  );
}
