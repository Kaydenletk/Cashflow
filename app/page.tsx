import { DashboardApp } from "@/components/dashboard-app";

export default async function Page() {
  const defaultSymbol = process.env.NEXT_PUBLIC_DEFAULT_SYMBOL ?? "NQ=F";

  return <DashboardApp defaultSymbol={defaultSymbol} />;
}
