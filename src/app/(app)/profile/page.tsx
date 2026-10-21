import type { Metadata } from "next";
import { ProfileView } from "./profile-view";

export const metadata: Metadata = { title: "Profile · Hisaab" };

export default function ProfilePage() {
  return <ProfileView />;
}
