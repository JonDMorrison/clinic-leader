import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  email: string;
  fullName: string;
  inviteSent?: boolean;
  signupLink?: string;
};

export default function AddUserPendingModal({ open, onClose, email, fullName, inviteSent, signupLink }: Props) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const copy = async () => {
    if (!signupLink) return;
    await navigator.clipboard.writeText(signupLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-background/90 backdrop-blur-xl border border-border p-6 shadow-xl">
        <h2 className="text-xl font-semibold mb-2">Account setup in progress for {fullName || email}</h2>

        {signupLink ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Use this signup link to complete the account for {fullName || email}:</p>
            <div className="flex items-center gap-2">
              <input className="flex-1 px-3 py-2 rounded border bg-muted text-xs" readOnly value={signupLink} />
              <Button type="button" onClick={copy} variant="secondary" className="shrink-0">
                <Copy className="w-4 h-4 mr-1" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Share the link with the user and have them complete signup.</li>
              <li>After signup, return here and click "Add User" again to attach them to the org and assign the role.</li>
            </ol>
          </div>
        ) : inviteSent ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>An invite email was sent to {email}. Ask them to complete the signup.</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>User completes signup from the invite email.</li>
              <li>Return here and click "Add User" again to attach and assign the role.</li>
            </ol>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">We're preparing the next step. Please try again in a moment.</p>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onClose} variant="secondary">Got it</Button>
        </div>
      </div>
    </div>
  );
}
