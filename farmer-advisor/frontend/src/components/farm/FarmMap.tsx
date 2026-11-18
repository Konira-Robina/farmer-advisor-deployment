"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

export const FarmMap = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});
