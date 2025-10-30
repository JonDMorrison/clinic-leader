import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { NavPublic } from "@/components/layout/NavPublic";
import { FooterPublic } from "@/components/layout/FooterPublic";
import { WhyDifferent } from "@/components/landing/WhyDifferent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Play, TrendingUp, Users, Target, BarChart3, Video, CheckSquare, MessageSquare, MapPin, Phone, Mail } from "lucide-react";

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
    return null; // or a loading spinner
  }

  return (
    <>
      <Helmet>
        <title>Clinic Leader - Data-Driven Practice Management for Healthcare</title>
        <meta name="description" content="The complete platform for healthcare practices. Track performance metrics, set strategic goals, run efficient meetings, and grow profitably. Built for clinics that want to scale." />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded">
          Skip to content
        </a>

        <NavPublic />

        <main id="main-content" className="flex-1">
          {/* Hero Section */}
          <section className="py-16 bg-gradient-to-br from-brand/5 to-accent/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                    Lead Your Clinic with <span className="text-brand">Confidence</span>
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    The complete platform for healthcare practices that want to scale with data-driven insights and proven operational frameworks. Get your team aligned, track what matters, and grow profitably.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button size="lg" asChild>
                      <Link to="/auth">Get Started Free</Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <a href="#how-it-works">
                        <Play className="w-4 h-4 mr-2" />
                        How It Works
                      </a>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Already have an account? <Link to="/auth" className="text-brand hover:underline">Sign in here</Link>
                  </p>
                </div>
                <div className="relative">
                  <div className="glass rounded-3xl p-8 shadow-2xl">
                    <img 
                      src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80" 
                      alt="Team collaboration" 
                      className="rounded-2xl w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Path to Better Results Section */}
          <section id="features" className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Grow Your Practice</h2>
                <p className="text-xl text-muted-foreground">Data-driven tools and frameworks for modern healthcare practices</p>
              </div>

              <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-2xl font-semibold mb-6">What You'll Get</h3>
                  {[
                    { title: "Performance Metrics", desc: "Track key clinic indicators with visual dashboards and trend analysis" },
                    { title: "Quarterly Goals", desc: "Set and achieve strategic priorities across your practice" },
                    { title: "Problem Solving", desc: "Resolve operational challenges systematically with structured methodology" },
                    { title: "Team Meetings", desc: "Run productive weekly meetings with built-in agendas and timers" }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                        <Check className="w-5 h-5 text-brand" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">{item.title}</h4>
                        <p className="text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-semibold mb-6">How It Helps</h3>
                  {[
                    { title: "Clear Direction", desc: "Everyone knows your practice goals and their role in achieving them" },
                    { title: "Measurable Progress", desc: "Make steady improvements every single week with data you can trust" },
                    { title: "Aligned Team", desc: "Foster open communication and collaboration across your practice" },
                    { title: "True Accountability", desc: "Clear ownership and follow-through on every commitment" }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                        <Check className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">{item.title}</h4>
                        <p className="text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Professional Tools Section */}
          <section className="py-16 bg-gradient-to-br from-brand/5 to-accent/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80" 
                    alt="Data analytics dashboard" 
                    className="rounded-3xl shadow-2xl"
                  />
                </div>
                <div className="space-y-6">
                  <h2 className="text-3xl md:text-4xl font-bold">Built for Healthcare Leaders</h2>
                  <p className="text-lg text-muted-foreground">
                    Developed with clinic operators and healthcare executives. Every feature designed to help you make better decisions faster.
                  </p>
                  <div className="space-y-4">
                    {[
                      { icon: TrendingUp, title: "KPI Dashboard", desc: "Monitor your critical metrics with color-coded indicators and trends" },
                      { icon: Target, title: "Goal Management", desc: "Keep your strategic objectives visible and on track" },
                      { icon: CheckSquare, title: "Issue Resolution", desc: "Solve problems faster with proven problem-solving frameworks" }
                    ].map((item, i) => (
                      <Card key={i}>
                        <CardContent className="p-4 flex gap-4 items-start">
                          <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                            <item.icon className="w-6 h-6 text-brand" />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <WhyDifferent />

          {/* Team Alignment Section */}
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6 order-2 lg:order-1">
                  <h2 className="text-3xl md:text-4xl font-bold">Built for Your Entire Practice</h2>
                  <p className="text-lg text-muted-foreground">
                    From owners to front desk staff, everyone stays aligned on what matters most.
                  </p>
                  <div className="space-y-3">
                    {[
                      "Real-time collaboration across departments",
                      "Role-based access and permissions",
                      "Mobile-friendly for on-the-go updates"
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3 items-center">
                        <Check className="w-5 h-5 text-success flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="order-1 lg:order-2">
                  <img 
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80" 
                    alt="Team meeting" 
                    className="rounded-3xl shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Digital Platform Section */}
          <section className="py-16 bg-gradient-to-br from-accent/10 to-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything in One Platform</h2>
                <p className="text-xl text-muted-foreground">
                  Stop juggling spreadsheets, documents, and multiple tools
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-12">
                  {[
                    { icon: BarChart3, title: "Track Performance", desc: "Real-time dashboards show exactly where your practice stands" },
                    { icon: Video, title: "Run Meetings", desc: "Built-in agendas and timers for efficient team meetings" },
                    { icon: MessageSquare, title: "Stay Aligned", desc: "Document decisions and share updates across your practice" }
                  ].map((item, i) => (
                  <Card key={i}>
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 rounded-xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
                        <item.icon className="w-8 h-8 text-brand" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80" 
                  alt="Platform interface" 
                  className="w-full"
                />
              </div>
            </div>
          </section>

          {/* About Section */}
          <section id="about" className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="order-2 lg:order-1">
                  <img 
                    src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80" 
                    alt="Our team" 
                    className="rounded-3xl shadow-2xl"
                  />
                </div>
                <div className="space-y-6 order-1 lg:order-2">
                  <h2 className="text-3xl md:text-4xl font-bold">About Clinic Leader</h2>
                  <p className="text-brand text-lg font-semibold">Built by Healthcare Operators</p>
                  <p className="text-muted-foreground">
                    We've worked with dozens of healthcare practices to understand what truly drives growth. Through that experience, 
                    we realized practices needed better tools to track performance and align teams around common goals.
                  </p>
                  <p className="text-muted-foreground">
                    That's why we created Clinic Leader - a simple, powerful platform that combines data visibility 
                    with proven operational frameworks to help your practice scale profitably.
                  </p>
                  <Button variant="outline" size="lg">Learn More About Our Team</Button>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-16 bg-muted/50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                <p className="text-xl text-muted-foreground">Everything you need to know</p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    q: "Do I need specific practice management software?",
                    a: "Clinic Leader works alongside your existing practice management system. We integrate with popular platforms like Jane, Cliniko, and others to pull in your operational data."
                  },
                  {
                    q: "How many team members can use the platform?",
                    a: "Plans start with up to 10 users and scale based on your needs. Contact us for custom solutions for larger practices or multi-location operations."
                  },
                  {
                    q: "Is my practice data secure and HIPAA-compliant?",
                    a: "Absolutely. We use enterprise-grade encryption and security measures. Your data is protected with bank-level security, and we never share it with third parties."
                  },
                  {
                    q: "Can I import my existing metrics and goals?",
                    a: "Yes! We support importing from spreadsheets and other common formats to get you up and running quickly without starting from scratch."
                  },
                  {
                    q: "What kind of support do you offer?",
                    a: "All plans include email support and access to our help center. Premium plans get priority support, training sessions, and dedicated onboarding assistance."
                  }
                ].map((faq, i) => (
                  <details key={i} className="glass rounded-2xl p-6 group">
                    <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center">
                      {faq.q}
                      <span className="text-brand group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <p className="mt-4 text-muted-foreground">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="py-16 bg-gradient-to-br from-brand/10 to-accent/10">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">Ready to Get Started?</h2>
              <p className="text-xl text-muted-foreground">
                Join hundreds of healthcare practices using Clinic Leader to scale profitably
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/auth">Start Free Trial</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#how-it-works">Watch Demo</a>
                </Button>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section id="contact" className="py-12 bg-muted/50 border-t border-border/40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-center items-center gap-8 text-center md:text-left">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5" />
                  <span>San Francisco, CA</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="w-5 h-5" />
                  <a href="tel:+15551234567" className="hover:text-brand transition-colors">
                    (555) 123-4567
                  </a>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="w-5 h-5" />
                  <a href="mailto:hello@eosplatform.com" className="hover:text-brand transition-colors">
                    hello@eosplatform.com
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
