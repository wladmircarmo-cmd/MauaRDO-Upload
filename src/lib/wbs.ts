import wbsList from "@/data/wbs-generated.json";

export type WbsEntry = {
  wbs: string;
  parent_task_path?: string;
};

export function getWbsList(): WbsEntry[] {
  return (wbsList as Array<string | WbsEntry>).map((item) =>
    typeof item === "string" ? { wbs: item } : item,
  );
}
