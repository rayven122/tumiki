"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { ApiTokenModal } from "./ApiTokenModal";

type Service = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
};

type ServiceCardProps = {
  service: Service;
};

export function ServiceCard({ service }: ServiceCardProps) {
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="mr-2 rounded-md p-2">{service.icon}</div>
        <div>
          <CardTitle>{service.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <CardDescription className="line-clamp-3 text-sm">
          {service.description}
        </CardDescription>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button
          type="button"
          onClick={() => {
            setTokenModalOpen(true);
          }}
          className="w-full"
        >
          接続
        </Button>
      </CardFooter>
      <ApiTokenModal
        open={tokenModalOpen}
        onOpenChange={setTokenModalOpen}
        serviceId={service.id}
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onSave={() => {}}
      />
    </Card>
  );
}
