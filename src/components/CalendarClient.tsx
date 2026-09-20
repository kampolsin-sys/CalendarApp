"use client";

import { useState, useEffect } from "react";

export default function CalendarClient({ appointments }: { appointments: any[] }) {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="p-10 text-center text-gray-500">กำลังโหลดปฏิทิน...</div>;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const dayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Find appointments for the selected day
  const selectedAppointments = appointments.filter((appt) => {
    const apptDate = new Date(appt.date);
    return (
      apptDate.getDate() === selectedDate.getDate() &&
      apptDate.getMonth() === selectedDate.getMonth() &&
      apptDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  // Create grid cells
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-10"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isSelected =
      d === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear();
      
    // Check if there's any appointment on this day
    const hasAppt = appointments.some((appt) => {
      const aDate = new Date(appt.date);
      return aDate.getDate() === d && aDate.getMonth() === month && aDate.getFullYear() === year;
    });

    days.push(
      <button
        key={d}
        onClick={() => setSelectedDate(new Date(year, month, d))}
        className={`h-10 w-full flex items-center justify-center rounded-full text-sm relative transition-colors ${
          isSelected ? "bg-green-600 text-white font-bold" : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {d}
        {hasAppt && !isSelected && (
          <span className="absolute bottom-1 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Calendar Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            ◀
          </button>
          <div className="font-bold text-lg text-gray-800">
            {monthNames[month]} {year + 543}
          </div>
          <button onClick={nextMonth} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            ▶
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {dayNames.map((day, idx) => (
            <div key={day} className={`text-xs font-medium ${idx === 0 ? "text-red-500" : "text-gray-500"}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>

      {/* Selected Day Agenda */}
      <div>
        <h2 className="text-md font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span>📅</span> นัดหมายวันที่ {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]}
        </h2>

        {selectedAppointments.length === 0 ? (
          <div className="text-center text-gray-400 py-6 bg-white rounded-xl border border-dashed border-gray-200">
            ไม่มีนัดหมายในวันนี้
          </div>
        ) : (
          <div className="space-y-3">
            {selectedAppointments.map((appt) => (
              <div key={appt.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm border-l-4 border-l-green-500">
                <div className="font-semibold text-gray-800 text-md mb-1">{appt.title}</div>
                
                <div className="flex items-center text-sm text-gray-600 mb-1 gap-2">
                  <span>🕒</span>
                  {new Date(appt.date).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} น.
                </div>

                {appt.location && (
                  <div className="flex items-center text-sm text-gray-500 gap-2">
                    <span>📍</span> {appt.location}
                  </div>
                )}
                
                {appt.description && (
                  <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    {appt.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
