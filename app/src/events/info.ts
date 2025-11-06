import { EventCommitter } from "@/events/struct.ts";
import { SiteInfo } from "@/admin/api/info.ts";

export const infoEvent = new EventCommitter<SiteInfo>({
  name: "info",
});
