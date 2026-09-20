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
    days.push(<div key={`empty-${i}`} className="min-h-[80px] bg-gray-50/50 rounded-lg"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isSelected =
      d === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear();
      
    // Find all appointments on this day
    const dayAppts = appointments.filter((appt) => {
      const aDate = new Date(appt.date);
      return aDate.getDate() === d && aDate.getMonth() === month && aDate.getFullYear() === year;
    });

    days.push(
      <button
        key={d}
        onClick={() => setSelectedDate(new Date(year, month, d))}
        className={`min-h-[80px] sm:min-h-[100px] w-full flex flex-col items-start justify-start p-1 sm:p-2 rounded-lg border transition-colors overflow-hidden ${
          isSelected ? "bg-green-50 border-green-500 shadow-sm" : "bg-white border-gray-100 hover:border-green-300"
        }`}
      >
        <span className={`text-xs sm:text-sm font-semibold mb-1 ${isSelected ? "text-green-700" : "text-gray-700"}`}>
          {d}
        </span>
        
        <div className="w-full flex flex-col gap-1 overflow-y-auto">
          {dayAppts.map((appt) => (
            <div key={appt.id} className="flex flex-col text-[10px] sm:text-xs leading-tight text-left bg-green-100 text-green-800 p-1.5 rounded w-full">
              {appt.doctorName && <span className="truncate">👨‍⚕️หมอ: {appt.doctorName}</span>}
              {appt.patientName && <span className="truncate">👤คนไข้: {appt.patientName}</span>}
              {appt.disease ? (
                <span className="truncate">💊โรค: {appt.disease}</span>
              ) : (
                <span className="truncate">📌 {appt.title}</span>
              )}
            </div>
          ))}
        </div>
      </button>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Calendar Header & Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:w-2/3">
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
            <div key={day} className={`text-xs sm:text-sm font-medium ${idx === 0 ? "text-red-500" : "text-gray-500"}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days}
        </div>
      </div>

      {/* Selected Day Agenda */}
      <div className="lg:w-1/3">
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
                <div className="font-semibold text-gray-800 text-md mb-2">{appt.title}</div>
                
                <div className="flex items-center text-sm text-gray-600 mb-1 gap-2">
                  <span>🕒</span>
                  {new Date(appt.date).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} น.
                </div>

                {appt.doctorName && (
                  <div className="flex items-center text-sm text-gray-600 mb-1 gap-2">
                    <span>👨‍⚕️</span> หมอ: {appt.doctorName}
                  </div>
                )}

                {appt.patientName && (
                  <div className="flex items-center text-sm text-gray-600 mb-1 gap-2">
                    <span>👤</span> คนไข้: {appt.patientName}
                  </div>
                )}

                {appt.disease && (
                  <div className="flex items-center text-sm text-gray-600 mb-1 gap-2">
                    <span>💊</span> อาการ: {appt.disease}
                  </div>
                )}

                {appt.location && (
                  <div className="flex items-center text-sm text-gray-500 gap-2 mt-1">
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
