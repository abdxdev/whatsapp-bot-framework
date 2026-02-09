"use client";
import { redirect, useParams } from "next/navigation";

export default function GroupsPage() {
  const { groupId } = useParams();
  return redirect(`/dashboard/${groupId}/services`);
}
