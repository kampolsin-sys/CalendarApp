"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addAppointment, updateAppointment, deleteAppointment } from "@/app/actions/appointment";
import { extractAppointmentFromImage } from "@/app/actions/ai";

export default function CalendarClient({ appointments }: { appointments: any[] }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  
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
    imageBase64: "",
  });

  useEffect(() => {
    setMounted(true);

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("review") === "true") {
        setFormData({
          title: searchParams.get("title") || "",
          date: searchParams.get("date") || "",
          time: searchParams.get("time") || "09:00",
          doctorName: searchParams.get("doctorName") || "",
          patientName: searchParams.get("patientName") || "",
          disease: searchParams.get("disease") || "",
          location: searchParams.get("location") || "",
          description: searchParams.get("description") || "",
          imageBase64: "",
        });
        setEditingId(null);
        setIsModalOpen(true);
        
        // Clean URL to prevent re-opening on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
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
      imageBase64: "",
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
      imageBase64: appt.imageBase64 || "",
    });
    setEditingId(appt.id);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiLoading(true);

    // Read file and compress to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64String = canvas.toDataURL("image/jpeg", 0.6);
        setFormData(prev => ({ ...prev, imageBase64: base64String }));

        // Call AI extraction
        const result = await extractAppointmentFromImage(base64String);
        if (result.success && result.data) {
          const d = new Date(result.data.date);
          const dString = !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : formData.date;
          const tString = !isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "09:00";

          setFormData(prev => ({
            ...prev,
            title: result.data.title || prev.title,
            date: dString,
            time: tString,
            doctorName: result.data.doctorName || prev.doctorName,
            patientName: result.data.patientName || prev.patientName,
            disease: result.data.disease || prev.disease,
            location: result.data.location || prev.location,
            description: result.data.description || prev.description,
          }));
        } else {
          alert(result.error || "เกิดข้อผิดพลาดในการสกัดข้อมูล");
        }
        setIsAiLoading(false);
      };
    };
    reader.readAsDataURL(file);
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
    days.push(<div key={`empty-${i}`} className="min-h-[110px] sm:min-h-[120px] bg-gray-50/50 rounded-lg"></div>);
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
        className={`min-h-[110px] sm:min-h-[120px] w-full flex flex-col items-start justify-start p-1 sm:p-2 rounded-lg border transition-colors overflow-hidden ${
          isSelected ? "bg-green-50 border-green-500 shadow-sm" : "bg-white border-gray-100 hover:border-green-300"
        }`}
      >
        <span className={`text-xs sm:text-sm font-semibold mb-1 ${isSelected ? "text-green-700" : "text-gray-700"}`}>
          {d}
        </span>
        
        <div className="w-full flex flex-col gap-1 overflow-y-auto">
          {dayAppts.map((appt) => {
            const getFirstName = (name: string) => {
              if (!name) return "";
              const clean = name.replace(/^(นายแพทย์|แพทย์หญิง|นพ\.|พญ\.|ทพ\.|ทญ\.|นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|คุณ)\s*/g, '').trim();
              return clean.split(/\s+/)[0]; // เอาแค่ชื่อแรก ไม่เอานามสกุล
            };
            const getShortDisease = (disease: string) => {
              if (!disease) return "";
              // ถ้ามีวงเล็บ ให้ดึงคำในวงเล็บมาโชว์ (เช่น "CA Lung (มะเร็งปอด)" -> "มะเร็งปอด")
              const match = disease.match(/\(([^)]+)\)/);
              if (match) return match[1].trim();
              // ถ้าไม่มีวงเล็บ เอาแค่คำแรก
              return disease.split(/\s+/)[0];
            };

            return (
              <div key={appt.id} className="flex flex-col text-[9px] sm:text-[10px] leading-tight text-left bg-green-100 text-green-800 p-1 rounded w-full overflow-hidden">
                {appt.doctorName && <span className="truncate">{getFirstName(appt.doctorName)}</span>}
                {appt.patientName && <span className="truncate">{getFirstName(appt.patientName)}</span>}
                {appt.disease ? (
                  <span className="truncate">{getShortDisease(appt.disease)}</span>
                ) : (
                  <span className="truncate">{appt.title}</span>
                )}
              </div>
            );
          })}
        </div>
      </button>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative">
      {/* Calendar Header & Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:w-2/3">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
          <div className="flex items-center">
            <button onClick={prevMonth} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              ◀
            </button>
            <div className="font-bold text-lg text-gray-800 mx-2">
              {monthNames[month]} {year + 543}
            </div>
            <button onClick={nextMonth} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              ▶
            </button>
          </div>
          <button 
            onClick={openAddModal}
            className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <span>➕</span> เพิ่มนัดหมาย
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
                
                {appt.imageBase64 && (
                  <div className="mt-3">
                    <button 
                      onClick={() => setViewImage(appt.imageBase64)} 
                      className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-semibold border border-blue-200"
                    >
                      <span>🖼️</span> ดูไฟล์ใบนัดแนบ
                    </button>
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
              
              <div className="mb-4 bg-green-50 p-3 rounded-lg border border-green-200">
                <label className="block text-sm font-bold text-green-800 mb-2">✨ สแกนจากภาพใบนัด (AI)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  disabled={isAiLoading}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                />
                {isAiLoading && <div className="text-xs text-green-600 mt-2 font-semibold">⏳ AI กำลังสกัดข้อมูลและเติมลงในฟอร์ม กรุณารอสักครู่...</div>}
                {formData.imageBase64 && !isAiLoading && (
                  <div className="mt-2">
                    <img src={formData.imageBase64} alt="Appointment Card" className="max-h-32 rounded border shadow-sm" />
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, imageBase64: "" }))} className="text-xs text-red-500 mt-1 hover:underline">ลบรูปภาพแนบ</button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">หัวข้อนัดหมาย *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-green-500" placeholder="เช่น นัดตรวจฟัน" />
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">วันที่ *</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:border-green-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">เวลา *</label>
                  <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:border-green-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อหมอ</label>
                <input type="text" value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-green-500" placeholder="นพ. สมชาย" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อคนไข้</label>
                <input type="text" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-green-500" placeholder="คุณ สมหญิง" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">โรค / อาการ</label>
                <input type="text" value={formData.disease} onChange={e => setFormData({...formData, disease: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-green-500" placeholder="ปวดฟันคุด" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">สถานที่</label>
                <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-green-500" placeholder="คลินิกทันตกรรม" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">รายละเอียดเพิ่มเติม</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-green-500" rows={4}></textarea>
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

      {/* Image Viewer Modal */}
      {viewImage && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            <button 
              onClick={() => setViewImage(null)} 
              className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300"
            >
              &times;
            </button>
            <img src={viewImage} alt="Appointment File" className="max-w-full max-h-[85vh] rounded shadow-2xl object-contain bg-white" />
          </div>
        </div>
      )}

    </div>
  );
}
