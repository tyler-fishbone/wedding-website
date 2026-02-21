import type { WeddingFormPayload } from "./weddingFormTypes";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const submitWeddingForm = async (payload: WeddingFormPayload): Promise<void> => {
  const response = await fetch("/api/address", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Submission failed with status ${response.status}`);
  }

  // Small delay keeps local UX similar to real submission timing during very fast responses.
  await sleep(200);
};
