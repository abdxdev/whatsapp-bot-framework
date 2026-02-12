"use client";
import { redirect, useParams } from "next/navigation";

export default function ServicePage() {
  const { groupId, serviceId } = useParams();
  return redirect(`/dashboard/${groupId}/${serviceId}/commands`);
}
