"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addAppointment(data: any) {
  await prisma.appointment.create({
    data: {
      title: data.title,
      date: new Date(data.date),
      location: data.location || "",
      description: data.description || "",
      doctorName: data.doctorName || "",
      patientName: data.patientName || "",
      disease: data.disease || "",
    }
  });
  revalidatePath("/");
}

export async function updateAppointment(id: string, data: any) {
  await prisma.appointment.update({
    where: { id },
    data: {
      title: data.title,
      date: new Date(data.date),
      location: data.location || "",
      description: data.description || "",
      doctorName: data.doctorName || "",
      patientName: data.patientName || "",
      disease: data.disease || "",
    }
  });
  revalidatePath("/");
}

export async function deleteAppointment(id: string) {
  await prisma.appointment.delete({
    where: { id }
  });
  revalidatePath("/");
}
