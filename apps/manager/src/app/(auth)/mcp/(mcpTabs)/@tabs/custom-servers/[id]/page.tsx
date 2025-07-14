"use client";

import { useParams } from "next/navigation";
import { ServerDetailPage } from "../../_components/ServerDetailPage";

export default function CustomServerDetailPageWrapper() {
  const params = useParams();
  const instanceId = params.id as string;

  return <ServerDetailPage instanceId={instanceId} />;
}
