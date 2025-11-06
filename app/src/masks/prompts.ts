import { Mask } from "@/masks/types.ts";
import axios from "axios";

let MASKS: Mask[] = [];
const getMasks = async (): Promise<Mask[]> => {
  try {
    const response = await axios.get("/v1/presets");
    return response.data.content as Mask[];
  } catch (e) {
    console.warn("[presets] failed to get info from server", e);
    return [];
  }
};

export const initializeMasks = async () => {
  MASKS = await getMasks();
  return MASKS;
};

initializeMasks().then(() => {
  console.log("[presets] initialized:", MASKS);
});

export { MASKS };