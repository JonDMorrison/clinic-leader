import { Button } from "@/components/ui/button";
import { Copy, Mail, Link2, CheckCircle2 } from "lucide-react";
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
      <div className="w-full max-w-xl rounded-2xl bg-background/90 backdrop-blur-xl border border-white/10 p-8 shadow-2xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {inviteSent ? (
              <Mail className="w-6 h-6 text-primary" />
            ) : (
              <Link2 className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">Account Setup in Progress</h2>
            <p className="text-sm text-muted-foreground">for {fullName}</p>
          </div>
        </div>

        {inviteSent && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-2">Invitation email sent to {email}</p>
                  <p className="text-sm text-muted-foreground">
                    The user will receive an email with instructions to complete their account setup.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="font-semibold">What happens next:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-2">
                <li>{fullName} will receive an email invitation</li>
                <li>They'll click the link and complete their profile</li>
                <li>Once they sign up, return here and click "Add User" again with the same email</li>
                <li>This will attach them to the organization and assign their role</li>
              </ol>
            </div>
          </div>
        )}

        {signupLink && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="font-semibold mb-3">Share this signup link with {fullName}:</p>
              <div className="flex items-center gap-2">
                <input 
                  className="flex-1 px-3 py-2 rounded-lg border bg-background text-xs font-mono" 
                  readOnly 
                  value={signupLink}
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button type="button" onClick={copy} variant="secondary" size="sm" className="shrink-0">
                  <Copy className="w-4 h-4 mr-1" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-semibold">What happens next:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-2">
                <li>Send the signup link above to {fullName}</li>
                <li>They'll use the link to complete their account creation</li>
                <li>Once they complete signup, return here and click "Add User" again with the same email</li>
                <li>This will attach them to the organization and assign their role</li>
              </ol>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <Button onClick={onClose} className="px-6">
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
