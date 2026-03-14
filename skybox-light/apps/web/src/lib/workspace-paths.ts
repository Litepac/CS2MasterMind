import { mkdir } from "node:fs/promises";
import path from "node:path";

export const skyboxLightRoot = path.resolve(process.cwd(), "..", "..");
export const incomingDemosDir = path.join(skyboxLightRoot, "incoming-demos");
export const tempDir = path.join(process.cwd(), ".tmp");

export async function ensureIncomingDemosDir() {
  await mkdir(incomingDemosDir, { recursive: true });
}
