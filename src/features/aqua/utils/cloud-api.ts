import type { Household } from "@/features/aqua/types/aqua";

const CLOUD_API_URL =
  process.env.EXPO_PUBLIC_CLOUD_API_URL || "http://127.0.0.1:8082";

interface CloudHousehold {
  household_id: string;
  label: string;
  contact_name: string;
  phone: string;
  area: Household["area"];
  address: string;
  usual_run: Household["usualRun"];
  reminders_opt_in: boolean;
  active: boolean;
}

export async function fetchCloudHouseholds(): Promise<Household[]> {
  const response = await fetch(`${CLOUD_API_URL}/api/households`);

  if (!response.ok) {
    throw new Error(`Cloud API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !Array.isArray(data.households)) {
    throw new Error("Invalid household data received");
  }

  return data.households.map((row: CloudHousehold) => ({
    id: row.household_id,
    label: row.label,
    contact: row.contact_name,
    phone: row.phone,
    area: row.area,
    address: row.address,
    usualRun: row.usual_run,
    reminders: row.reminders_opt_in,
    active: row.active,
  }));
}
