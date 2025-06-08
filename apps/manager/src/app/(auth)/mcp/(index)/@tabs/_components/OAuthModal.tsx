"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useState } from "react";

type Permission = {
  id: string;
  label: string;
  checked: boolean;
};

type IntegrationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  serviceIcon?: React.ReactNode;
  permissions: Permission[];
  onContinue: (selectedPermissions: string[]) => void;
};

export function IntegrationModal({
  open,
  onOpenChange,
  serviceName,
  serviceIcon,
  permissions: initialPermissions,
  onContinue,
}: IntegrationModalProps) {
  const [permissions, setPermissions] =
    useState<Permission[]>(initialPermissions);

  const handlePermissionChange = (id: string, checked: boolean) => {
    setPermissions(
      permissions.map((permission) =>
        permission.id === id ? { ...permission, checked } : permission,
      ),
    );
  };

  const handleContinue = () => {
    const selectedPermissions = permissions
      .filter((permission) => permission.checked)
      .map((permission) => permission.id);
    onContinue(selectedPermissions);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            {serviceIcon && <div className="h-6 w-6">{serviceIcon}</div>}
            <DialogTitle className="text-xl font-semibold">
              Integration with {serviceName}
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="py-4">
          <h3 className="mb-4 text-sm font-medium">Choose Permissions</h3>
          <div className="space-y-4">
            {permissions.map((permission) => (
              <div key={permission.id} className="flex items-center space-x-2">
                <Checkbox
                  id={permission.id}
                  checked={permission.checked}
                  onCheckedChange={(checked) =>
                    handlePermissionChange(permission.id, checked as boolean)
                  }
                />
                <label
                  htmlFor={permission.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {permission.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleContinue}>Continue</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
