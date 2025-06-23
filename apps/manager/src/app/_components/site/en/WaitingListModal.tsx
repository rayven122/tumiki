"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";

interface WaitingListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WaitingListModal = ({
  isOpen,
  onClose,
}: WaitingListModalProps) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [useCase, setUseCase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSuccess(true);

    // Reset form after showing success
    setTimeout(() => {
      onClose();
      setIsSuccess(false);
      setEmail("");
      setName("");
      setCompany("");
      setUseCase("");
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Join the Early Access
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.form
              key="form"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="mt-4 space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="use-case">Expected Use Case</Label>
                <Select value={useCase} onValueChange={setUseCase}>
                  <SelectTrigger id="use-case" disabled={isSubmitting}>
                    <SelectValue placeholder="Select a use case" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal-tools">
                      Internal Tool Integration
                    </SelectItem>
                    <SelectItem value="customer-support">
                      Customer Support AI
                    </SelectItem>
                    <SelectItem value="data-analysis">
                      Data Analysis & Reporting
                    </SelectItem>
                    <SelectItem value="workflow-automation">
                      Workflow Automation
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="h-5 w-5 rounded-full border-2 border-white border-t-transparent"
                  />
                ) : (
                  "Register"
                )}
              </Button>
            </motion.form>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mb-4 text-6xl"
              >
                🎉
              </motion.div>
              <h3 className="mb-2 text-xl font-semibold">
                Successfully Registered!
              </h3>
              <p className="text-gray-600">
                We'll send you an invitation email soon.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
