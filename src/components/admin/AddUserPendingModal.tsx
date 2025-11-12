import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  email: string;
  inviteSent?: boolean;
  signupLink?: string;
};

export default function AddUserPendingModal({ open, onClose, email, inviteSent, signupLink }: Props) {
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
      <div className="w-full max-w-lg rounded-2xl bg-background/90 backdrop-blur-xl border border-white/10 p-6">
        <h2 className="text-xl font-semibold mb-2">Next step for {email}</h2>
        {inviteSent && (
          <p className="text-sm text-muted-foreground mb-4">
            An invite email was sent. Ask the user to complete signup. After they do, click Add User again to attach them to the org and assign the role.
          </p>
        )}
        {signupLink && (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              Share this sign up link with the user. After they finish, click Add User again to attach them.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <input className="flex-1 px-3 py-2 rounded border bg-muted text-xs" readOnly value={signupLink} />
              <Button type="button" onClick={copy} variant="secondary" className="shrink-0">
                <Copy className="w-4 h-4 mr-1" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      </div>
    </div>
  );
}
