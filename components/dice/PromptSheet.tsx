"use client";

import { useState } from "react";
import { formatNotation, describeMode } from "@/lib/dice/notation";
import { PROMPT_LABELS, type SavedRoll } from "@/lib/dice/presets";
import { getPromptValue, promptBounds, setPromptValue, targetLabel } from "@/lib/dice/prompts";
import type { RollSpec } from "@/lib/dice/types";
import { Row } from "@/components/builder/ModeEditor";
import { Button, Stepper } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/Sheet";

export function PromptSheet({
  roll,
  onClose,
  onRoll,
}: {
  roll: SavedRoll | null;
  onClose: () => void;
  onRoll: (spec: RollSpec) => void;
}) {
  return (
    <Sheet open={!!roll} onClose={onClose} title={roll?.name}>
      {roll && <Body key={roll.id} roll={roll} onRoll={onRoll} />}
    </Sheet>
  );
}

function Body({ roll, onRoll }: { roll: SavedRoll; onRoll: (spec: RollSpec) => void }) {
  const [spec, setSpec] = useState(roll.spec);
  return (
    <div className="space-y-2 pb-2">
      <p className="font-mono text-sm text-muted">
        {formatNotation(spec)} · {describeMode(spec.mode, spec.modifier)}
      </p>
      {(roll.prompts ?? []).map((k) => {
        const b = promptBounds(spec, k);
        return (
          <Row key={k} label={k === "target" ? targetLabel(spec) : PROMPT_LABELS[k]}>
            <Stepper
              value={getPromptValue(spec, k)}
              min={b.min}
              max={b.max}
              signed={k === "modifier" || k === "bonus"}
              onChange={(v) => setSpec((s) => setPromptValue(s, k, v))}
            />
          </Row>
        );
      })}
      <Button variant="primary" className="mt-3 w-full !py-4 !text-lg" onClick={() => onRoll(spec)}>
        Tirar
      </Button>
    </div>
  );
}
