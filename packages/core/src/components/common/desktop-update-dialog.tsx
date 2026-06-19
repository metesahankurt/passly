"use client";

import { invoke } from "@tauri-apps/api/core";
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type UpdateState = "checking" | "available" | "installing" | "error" | "idle";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Update check failed.";
}

export function DesktopUpdateDialog() {
  const [state, setState] = useState<UpdateState>("checking");
  const [update, setUpdate] = useState<Update | null>(null);
  const [open, setOpen] = useState(false);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [contentLength, setContentLength] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkForUpdate() {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const availableUpdate = await check();

        if (cancelled) {
          availableUpdate?.close();
          return;
        }

        if (!availableUpdate) {
          setState("idle");
          return;
        }

        setUpdate(availableUpdate);
        setState("available");
        setOpen(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState("error");
        toast.error(getErrorMessage(error));
      }
    }

    checkForUpdate();

    return () => {
      cancelled = true;
    };
  }, []);

  const installUpdate = async () => {
    if (!update) {
      return;
    }

    setState("installing");
    setDownloadedBytes(0);
    setContentLength(null);

    try {
      await update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") {
          setContentLength(event.data.contentLength ?? null);
          return;
        }

        if (event.event === "Progress") {
          setDownloadedBytes((current) => current + event.data.chunkLength);
        }
      });

      await invoke("restart_app");
    } catch (error) {
      setState("error");
      toast.error(getErrorMessage(error));
    }
  };

  const progress =
    contentLength && contentLength > 0
      ? Math.min(Math.round((downloadedBytes / contentLength) * 100), 100)
      : null;

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (state !== "installing") {
          setOpen(nextOpen);
        }
      }}
      open={open}
    >
      <DialogContent showCloseButton={state !== "installing"}>
        <DialogHeader>
          <DialogTitle>Update available</DialogTitle>
          <DialogDescription>
            Passly {update?.version} is ready to install. The app will restart
            after the update finishes.
          </DialogDescription>
        </DialogHeader>

        {state === "installing" && (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress ?? 20}%` }}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {progress === null ? "Installing update..." : `${progress}%`}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            disabled={state === "installing"}
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Later
          </Button>
          <Button
            disabled={state === "installing"}
            onClick={installUpdate}
            type="button"
          >
            {state === "installing" ? (
              <RefreshCw className="animate-spin" />
            ) : (
              <Download />
            )}
            Install update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
