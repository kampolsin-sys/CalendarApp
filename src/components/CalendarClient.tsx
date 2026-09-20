"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addAppointment, updateAppointment, deleteAppointment } from "@/app/actions/appointment";

export default function CalendarClient({ appointments }: { appointments: any[] }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "09:00",
    doctorName: "",
    patientName: "",
    disease: "",
    location: "",
    description: "",
  });

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

  // Handlers for modal
  const openAddModal = () => {
    const dString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    setFormData({
      title: "",
      date: dString,
      time: "09:00",
      doctorName: "",
      patientName: "",
      disease: "",
      location: "",
      description: "",
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (appt: any) => {
    const d = new Date(appt.date);
    const dString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const tString = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    
    setFormData({
      title: appt.title || "",
      date: dString,
      time: tString,
      doctorName: appt.doctorName || "",
      patientName: appt.patientName || "",
      disease: appt.disease || "",
      location: appt.location || "",
      description: appt.description || "",
    });
    setEditingId(appt.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบนัดหมายนี้?")) return;
    await deleteAppointment(id);
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Combine date and time
    const dateTimeString = `${formData.date}T${formData.time}:00`;
    
    const submitData = {
      ...formData,
      date: dateTimeString
    };

    if (editingId) {
      await updateAppointment(editingId, submitData);
    } else {
      await addAppointment(submitData);
    }
    
    setIsSubmitting(false);
    setIsModalOpen(false);
    router.refresh();
  };

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
              {appt.doctorName && <span className="truncate">{appt.doctorName}</span>}
              {appt.patientName && <span className="truncate">{appt.patientName}</span>}
              {appt.disease ? (
                <span className="truncate">{appt.disease}</span>
              ) : (
                <span className="truncate">{appt.title}</span>
              )}
            </div>
          ))}
        </div>
      </button>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative">
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-md font-bold text-gray-800 flex items-center gap-2">
            <span>📅</span> วันที่ {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]}
          </h2>
          <button 
            onClick={openAddModal}
            className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-green-700 transition-colors"
          >
            + เพิ่ม
          </button>
        </div>

        {selectedAppointments.length === 0 ? (
          <div className="text-center text-gray-400 py-6 bg-white rounded-xl border border-dashed border-gray-200">
            ไม่มีนัดหมายในวันนี้
          </div>
        ) : (
          <div className="space-y-3">
            {selectedAppointments.map((appt) => (
              <div key={appt.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm border-l-4 border-l-green-500 relative group">
                
                {/* Actions (Edit / Delete) */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(appt)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded text-xs">✏️</button>
                  <button onClick={() => handleDelete(appt.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded text-xs">🗑️</button>
                </div>

                <div className="font-semibold text-gray-800 text-md mb-2 pr-12">{appt.title}</div>
                
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

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-lg">{editingId ? "✏️ แก้ไขนัดหมาย" : "➕ เพิ่มนัดหมาย"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold p-2">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">หัวข้อนัดหมาย *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="เช่น นัดตรวจฟัน" />
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">วันที่ *</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">เวลา *</label>
                  <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อหมอ</label>
                <input type="text" value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="นพ. สมชาย" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อคนไข้</label>
                <input type="text" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="คุณ สมหญิง" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">โรค / อาการ</label>
                <input type="text" value={formData.disease} onChange={e => setFormData({...formData, disease: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="ปวดฟันคุด" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">สถานที่</label>
                <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="คลินิกทันตกรรม" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">รายละเอียดเพิ่มเติม</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border p-2 rounded-lg text-sm" rows={2}></textarea>
              </div>

              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-200 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400">
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
