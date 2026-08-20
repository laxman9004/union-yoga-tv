import type { Metadata } from "next";
import { Slideshow } from "./Slideshow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free Classes for Two Weeks — Union Yoga",
  description:
    "From August 24 to September 4, every class at Union Yoga is free. Bring someone with you.",
};

export default function FreeWeeksPage() {
  return <Slideshow />;
}
