import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export const CTASection = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    practice_name: "",
    email: "",
    password: "",
    jane_link: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.practice_name || !form.email || !form.password) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (form.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create the account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: form.name,
            practice_name: form.practice_name,
          },
        },
      });

      if (authError) throw authError;

      // 2. Submit waitlist info (sends notification email to jon@getclear.ca)
      await supabase.functions.invoke("submit-waitlist", {
        body: {
          name: form.name,
          practice_name: form.practice_name,
          email: form.email,
          jane_link: form.jane_link,
        },
      });

      setIsSubmitted(true);
      toast({ title: "Account created! Check your email to confirm." });
    } catch (error: any) {
      toast({
        title: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10" />

      <motion.div
        className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="text-center space-y-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Fix how your leadership team{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
              actually runs.
            </span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Weekly scorecard. Structured meeting. Clear owners. Measured outcomes. ClinicLeader gives your leadership team a rhythm that turns decisions into results.
          </p>

          {isSubmitted ? (
            <motion.div
              className="flex flex-col items-center gap-4 py-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle className="w-12 h-12 text-primary" />
              <p className="text-xl font-semibold text-foreground">You're in!</p>
              <p className="text-muted-foreground">Check your email to confirm your account, then sign in to get started.</p>
              <Button variant="outline" onClick={() => navigate("/auth")} className="mt-2">
                Go to Sign In
              </Button>
            </motion.div>
          ) : (
            <motion.form
              onSubmit={handleSubmit}
              className="text-left space-y-5 bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl p-6 md:p-8 shadow-xl"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-foreground text-center">
                Become a tester
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                We're onboarding a small group of clinics. Create your account and we'll get you set up.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cta-name">Your name <span className="text-destructive">*</span></Label>
                  <Input
                    id="cta-name"
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta-practice">Practice name <span className="text-destructive">*</span></Label>
                  <Input
                    id="cta-practice"
                    placeholder="Downtown Chiropractic"
                    value={form.practice_name}
                    onChange={(e) => setForm((f) => ({ ...f, practice_name: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta-email">Email address <span className="text-destructive">*</span></Label>
                <Input
                  id="cta-email"
                  type="email"
                  placeholder="you@yourclinic.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta-password">Create a password <span className="text-destructive">*</span></Label>
                <Input
                  id="cta-password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta-jane">Jane link <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="cta-jane"
                  placeholder="https://yourclinic.janeapp.com"
                  value={form.jane_link}
                  onChange={(e) => setForm((f) => ({ ...f, jane_link: e.target.value }))}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full text-lg py-7 shadow-xl shadow-primary/25 group"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Become a tester
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Already have an account?{" "}
                <a href="/auth" className="text-primary hover:underline">Sign in</a>
              </p>
            </motion.form>
          )}

          <p className="text-sm text-muted-foreground pt-4">
            Connects to Jane and other EMRs · Your data stays private · HIPAA-aligned security
          </p>
        </motion.div>
      </div>
    </section>
  );
};
