export function convertDate(date: Date): string {
  // result: "2021-09-01"
  return date.toISOString().split("T")[0];
}

export function convertDateTime(date: Date): string {
  // result: "2021-09-01 12:00:00"
  return date.toISOString().replace("T", " ").split(".")[0];
}
