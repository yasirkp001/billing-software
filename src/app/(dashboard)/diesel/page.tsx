import { DieselManager } from "@/components/diesel/DieselManager";

export const dynamic = "force-dynamic";

export default function DieselPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">CR Diesel</h2>
        <p className="text-sm font-medium text-gray-500">Track diesel expenses across all vehicles.</p>
      </div>
      <DieselManager />
    </div>
  );
}
