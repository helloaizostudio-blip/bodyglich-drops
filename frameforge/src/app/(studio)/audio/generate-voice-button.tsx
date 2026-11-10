"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { generateVoiceover } from "@/server/actions/voice";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { useRun } from "@/components/ui/use-run";

/** Generates a voiceover for one dialogue line with the connected voice provider (billed to the user's account). */
export function GenerateVoiceButton({ lineId, hasAudio, hasCharacter }: { lineId: string; hasAudio: boolean; hasCharacter: boolean }) {
  const { run, pending } = useRun();
  const [confirm, setConfirm] = useState(false);
  if (!hasCharacter) return null; // only library characters have voice profiles
  const go = async (replace: boolean) => {
    await run(generateVoiceover({ lineId, replace }), "Voiceover generated");
    setConfirm(false);
  };
  return (
    <>
      <Button size="sm" variant="ghost" className="!h-10" icon={<Sparkles className="size-3.5" />} loading={pending} onClick={() => (hasAudio ? setConfirm(true) : void go(false))}>
        {hasAudio ? "Regenerate" : "Generate"}
      </Button>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Replace this voiceover?"
        message="A new voiceover will be generated and used for this line. The current recording stays in the Asset Library."
        confirmLabel="Generate and replace"
        danger={false}
        onConfirm={() => go(true)}
      />
    </>
  );
}
