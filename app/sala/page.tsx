import { Suspense } from "react";
import { Sala } from "@/components/room/Sala";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Sala />
    </Suspense>
  );
}
