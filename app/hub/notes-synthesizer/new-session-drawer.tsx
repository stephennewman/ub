"use client";

import { Drawer } from "./drawer";
import { CaptureFlow } from "./capture-flow";

export function NewSessionDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel="New session"
      header={
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          New session
        </h2>
      }
    >
      {/* Re-mount the flow each time the drawer opens so state resets */}
      {open ? <CaptureFlow key="new-session" /> : null}
    </Drawer>
  );
}
