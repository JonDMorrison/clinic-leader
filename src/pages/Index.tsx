import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { NavPublic } from "@/components/layout/NavPublic";
import { FooterPublic } from "@/components/layout/FooterPublic";
import { WhyDifferent } from "@/components/landing/WhyDifferent";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3, AlertCircle, Target, Users, Mail } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate("/dashboard", { replace: true });
      } else {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (isChecking) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>ClinicLeader - Operating System for Clinic Leadership</title>
        <meta name="description" content="ClinicLeader helps clinic leaders set clear goals, align their teams, and run better weekly operations. An EOS-aligned operating system built specifically for clinics." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded">
          Skip to content
        </a>

        <NavPublic />

        <main id="main-content" className="flex-1">
          {/* Hero Section */}
          <section className="relative py-24 md:py-32 overflow-hidden">
            <div className="absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2000&q=80" 
                alt="Modern healthcare clinic" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-background/98 via-background/95 to-background/90" />
            </div>
            
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="text-center space-y-8">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                  Lead your clinic.{" "}
                  <span className="block mt-2">Not just manage it.</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                  ClinicLeader gives clinic leaders the structure to align their teams, 
                  make better decisions, and deliver more consistent patient care.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button size="lg" className="text-lg px-8 py-6" asChild>
                    <Link to="/auth">
                      Get Started
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
                    <Link to="/auth">
                      Schedule a Walkthrough
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* The Real Problem Section */}
          <section className="py-20 md:py-28">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold">
                  The weight clinic leaders carry
                </h2>
                
                <div className="space-y-5 text-lg text-muted-foreground leading-relaxed">
                  <p>
                    You hold the context so the clinic doesn't drift. 
                    Goals live in your head. SOPs live in binders. 
                    Numbers live in spreadsheets. Values live in onboarding decks.
                  </p>
                  
                  <p>
                    Weekly meetings try to fill the gap. 
                    But without structure, they become status updates instead of decision-making sessions.
                  </p>
                  
                  <p>
                    Teams stay busy but not aligned. 
                    Problems get discussed but not resolved. 
                    And you end up being the system.
                  </p>
                  
                  <p className="text-foreground font-medium">
                    That's not sustainable. And it's not leadership.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* The Shift Section */}
          <section className="py-20 md:py-28 bg-muted/30">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold">
                  What changes when structure holds the weight
                </h2>
                
                <div className="space-y-5 text-lg text-muted-foreground leading-relaxed">
                  <p>
                    Goals stay visible. Everyone knows what matters this quarter.
                  </p>
                  
                  <p>
                    SOPs answer questions before they reach you. 
                    Consistency improves without constant oversight.
                  </p>
                  
                  <p>
                    Weekly numbers show whether you're on track. 
                    Problems surface early, not in crisis.
                  </p>
                  
                  <p>
                    Issues turn into decisions. Rocks turn into results. 
                    Meetings run themselves.
                  </p>
                  
                  <p className="text-foreground font-medium">
                    Your team feels aligned. Your patients benefit from the clarity.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section id="features" className="py-20 md:py-28">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  How ClinicLeader works
                </h2>
                <p className="text-xl text-muted-foreground">
                  Five capabilities that support leadership and execution
                </p>
              </div>

              <div className="space-y-16">
                {/* SOPs */}
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-brand" />
                    </div>
                    <h3 className="text-2xl font-bold">SOPs that reinforce standards</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Your team asks questions. Your SOPs answer them. 
                      Not by digging through folders, but instantly, with source-backed responses. 
                      Consistency improves without you repeating yourself.
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-2xl p-8 border border-border/50">
                    <div className="text-sm text-muted-foreground italic">
                      "How do I handle a patient cancellation within 24 hours?"
                    </div>
                    <div className="mt-4 text-sm">
                      The system surfaces the policy, cites the SOP, and your front desk moves forward.
                    </div>
                  </div>
                </div>

                {/* Scorecards */}
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="order-2 md:order-1 bg-muted/50 rounded-2xl p-8 border border-border/50">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-success">On Track</div>
                        <div className="text-xs text-muted-foreground">New Patients</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-warning">Watch</div>
                        <div className="text-xs text-muted-foreground">Collections</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-destructive">Off Track</div>
                        <div className="text-xs text-muted-foreground">No-Shows</div>
                      </div>
                    </div>
                  </div>
                  <div className="order-1 md:order-2 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-brand" />
                    </div>
                    <h3 className="text-2xl font-bold">Scorecards that keep goals visible</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Weekly numbers show whether your goals are being met. 
                      You see what's on track, what's slipping, and where to focus. 
                      Before the meeting, not during it.
                    </p>
                  </div>
                </div>

                {/* Issues */}
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-brand" />
                    </div>
                    <h3 className="text-2xl font-bold">Issues that turn into decisions</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Problems get identified, discussed, and resolved. 
                      Not rehashed week after week. 
                      Every issue has an owner and an outcome. 
                      Your team learns to solve, not just surface.
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-2xl p-8 border border-border/50">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-sm">Solved: Front desk handoff process</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-warning" />
                        <span className="text-sm">In Progress: Insurance verification delays</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                        <span className="text-sm">Open: Provider schedule optimization</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rocks */}
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="order-2 md:order-1 bg-muted/50 rounded-2xl p-8 border border-border/50">
                    <div className="space-y-4">
                      <div className="text-sm font-medium">Q1 Rocks</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Reduce no-show rate to under 10%</span>
                          <span className="text-success">On Track</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Launch patient feedback system</span>
                          <span className="text-warning">At Risk</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="order-1 md:order-2 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center">
                      <Target className="w-6 h-6 text-brand" />
                    </div>
                    <h3 className="text-2xl font-bold">Rocks that align effort</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Quarterly priorities stay connected to outcomes. 
                      Your team knows what matters, why it matters, and how their work contributes. 
                      Progress is visible. Accountability is built in.
                    </p>
                  </div>
                </div>

                {/* Meetings */}
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-brand" />
                    </div>
                    <h3 className="text-2xl font-bold">Weekly meetings that actually lead</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Meetings stop being status updates. 
                      The system provides the data. You provide the leadership. 
                      Decisions get made. Actions get assigned. 
                      Your team leaves knowing what to do.
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-2xl p-8 border border-border/50">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span>Scorecard Review</span>
                        <span className="text-muted-foreground">5 min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rock Review</span>
                        <span className="text-muted-foreground">5 min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Headlines</span>
                        <span className="text-muted-foreground">5 min</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>IDS (Issues)</span>
                        <span className="text-muted-foreground">60 min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Conclude</span>
                        <span className="text-muted-foreground">5 min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <WhyDifferent />

          {/* Who It's For Section */}
          <section className="py-20 md:py-28">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="space-y-8">
                <h2 className="text-3xl md:text-4xl font-bold">
                  Who ClinicLeader is for
                </h2>
                
                <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                  <p>
                    <span className="text-foreground font-medium">Clinic owners</span> who want to lead, not just operate.
                  </p>
                  <p>
                    <span className="text-foreground font-medium">Practice managers</span> who need structure to support their teams.
                  </p>
                  <p>
                    <span className="text-foreground font-medium">Leadership teams</span> who want everyone aligned around clear goals.
                  </p>
                  <p>
                    <span className="text-foreground font-medium">Multi-provider clinics</span> where coordination matters.
                  </p>
                  <p>
                    <span className="text-foreground font-medium">Growing clinics</span> that feel the strain of scaling without systems.
                  </p>
                </div>
                
                <div className="pt-4 border-t border-border/50">
                  <p className="text-muted-foreground">
                    ClinicLeader is not designed for solo practitioners without a team to align, 
                    or for clinics looking for scheduling or billing software. 
                    This is an operating system for leadership and execution.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-20 md:py-28 bg-muted/30">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold">
                  Common questions
                </h2>
              </div>

              <div className="space-y-4">
                {[
                  {
                    q: "Do I need to use EOS to benefit from ClinicLeader?",
                    a: "No. ClinicLeader is aligned with EOS principles but does not require formal EOS implementation. The structure works for any clinic that values clear goals, weekly accountability, and team alignment."
                  },
                  {
                    q: "How long does it take to get started?",
                    a: "Most clinics are running their first structured weekly meeting within two weeks. Setup includes importing your existing goals, SOPs, and team structure."
                  },
                  {
                    q: "Will this create more work for my team?",
                    a: "The opposite. ClinicLeader reduces administrative burden by providing structure that was previously held in spreadsheets, documents, and your head. Teams spend less time preparing and more time executing."
                  },
                  {
                    q: "Is my data secure?",
                    a: "Yes. We use enterprise-grade encryption and follow healthcare data security best practices. Your operational data is protected and never shared."
                  },
                  {
                    q: "Can I import existing metrics and goals?",
                    a: "Yes. We support importing from spreadsheets to get you up and running without starting from scratch."
                  }
                ].map((faq, i) => (
                  <details key={i} className="bg-background rounded-xl p-6 border border-border/50">
                    <summary className="font-medium text-lg cursor-pointer">
                      {faq.q}
                    </summary>
                    <p className="mt-4 text-muted-foreground leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* Closing CTA Section */}
          <section className="py-24 md:py-32">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="space-y-8">
                <h2 className="text-3xl md:text-4xl font-bold">
                  Leadership clarity matters
                </h2>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  When leaders have structure, teams have direction. 
                  When teams have direction, patients receive better care.
                </p>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  ClinicLeader exists to support the leaders who make that possible.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                  <Button size="lg" className="text-lg px-8 py-6" asChild>
                    <Link to="/auth">
                      Get Started
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
                    <Link to="/auth">
                      Schedule a Walkthrough
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section id="contact" className="py-12 bg-muted/30 border-t border-border/40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-center">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="w-5 h-5" />
                  <a href="mailto:hello@clinicleader.com" className="hover:text-foreground transition-colors">
                    hello@clinicleader.com
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <FooterPublic />
      </div>
    </>
  );
};

export default Index;
