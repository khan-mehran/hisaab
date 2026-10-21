"use client";

import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryButton() {
  return (
    // A full reload retries the page the user originally opened (the URL is unchanged).
    <Button size="lg" onClick={() => window.location.reload()}>
      <RefreshCwIcon /> Try again
    </Button>
  );
}
