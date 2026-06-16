"use client";

import dynamic from "next/dynamic";

const CalculatorDashboard = dynamic(
  () => import("@/components/calculator-dashboard").then(mod => mod.CalculatorDashboard),
  { ssr: false }
);

export default function Page() {
  return <CalculatorDashboard />;
}


