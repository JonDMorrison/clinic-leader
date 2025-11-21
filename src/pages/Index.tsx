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
          {/* Hero Section - Modern Animated */}
          <section className="relative py-24 md:py-32 overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2000&q=80" 
                alt="Modern healthcare clinic" 
                className="w-full h-full object-cover"
              />
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/80" />
            </div>
            {/* Animated gradient accents */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-accent/5 to-transparent animate-gradient-shift" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--brand)/0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.1),transparent_50%)]" />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8 animate-fade-in">
                  <div className="inline-block">
                    <div className="glass px-4 py-2 rounded-full text-sm font-medium text-brand animate-scale-in">
                      🚀 Built for Healthcare Leaders
                    </div>
                  </div>
                  
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
                    Lead Your Clinic with{" "}
                    <span className="gradient-brand bg-clip-text text-transparent">
                      Confidence
                    </span>
                  </h1>
                  
                  <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
                    The complete platform for healthcare practices that want to scale with 
                    <span className="text-foreground font-semibold"> data-driven insights</span> and 
                    <span className="text-foreground font-semibold"> proven operational frameworks</span>.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button size="lg" className="gradient-brand text-white shadow-lg hover:shadow-xl transition-shadow text-lg px-8 py-6" asChild>
                      <Link to="/auth">
                        Get Started Free
                        <span className="ml-2">→</span>
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="glass border-2 text-lg px-8 py-6 hover:bg-white/50" asChild>
                      <a href="#features">
                        <Play className="w-5 h-5 mr-2" />
                        See How It Works
                      </a>
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-6 pt-4">
                    <div className="flex -space-x-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-accent border-2 border-background" />
                      ))}
                    </div>
                    <div className="text-sm">
                      <div className="font-semibold">Join 500+ clinics</div>
                      <div className="text-muted-foreground">scaling profitably</div>
                    </div>
                  </div>
                </div>
                
                <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <div className="absolute -inset-4 gradient-brand opacity-20 blur-3xl rounded-full" />
                  <div className="glass-dark rounded-3xl p-6 shadow-2xl glow-brand relative">
                    <img 
                      src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80" 
                      alt="Team collaboration" 
                      className="rounded-2xl w-full"
                    />
                    {/* Floating stats cards */}
                    <div className="absolute -bottom-6 -left-6 glass rounded-2xl p-4 shadow-lg animate-scale-in" style={{ animationDelay: '0.4s' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-success">+34%</div>
                          <div className="text-xs text-muted-foreground">Revenue Growth</div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -top-6 -right-6 glass rounded-2xl p-4 shadow-lg animate-scale-in" style={{ animationDelay: '0.6s' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                          <Users className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold">98%</div>
                          <div className="text-xs text-muted-foreground">Team Aligned</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Bento Grid */}
          <section id="features" className="py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16 space-y-4">
                <div className="inline-block glass px-4 py-2 rounded-full text-sm font-medium text-brand mb-4">
                  ✨ Complete Platform
                </div>
                <h2 className="text-4xl md:text-5xl font-bold">
                  Everything You Need to{" "}
                  <span className="gradient-brand bg-clip-text text-transparent">Scale</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Data-driven tools and proven frameworks designed specifically for modern healthcare practices
                </p>
              </div>

              {/* Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Large Feature Card */}
                <div className="lg:col-span-2 lg:row-span-2 glass-dark rounded-3xl p-8 hover:shadow-2xl transition-all duration-300 group border border-white/20">
                  <div className="flex flex-col h-full">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center glow-brand">
                        <BarChart3 className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-2">Performance Dashboard</h3>
                        <p className="text-muted-foreground">
                          Track key clinic indicators with visual dashboards, trend analysis, and automated alerts
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 relative rounded-2xl overflow-hidden bg-gradient-to-br from-brand/5 to-accent/5 p-6">
                      <img 
                        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80" 
                        alt="Performance Dashboard with KPI Metrics" 
                        className="rounded-xl w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Small Feature Cards */}
                <div className="glass rounded-3xl p-6 hover:shadow-xl transition-all duration-300 group border border-white/20">
                  <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Target className="w-7 h-7 text-success" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Quarterly Goals</h3>
                  <p className="text-muted-foreground text-sm">
                    Set and achieve strategic priorities across your practice with AI-powered suggestions
                  </p>
                </div>

                <div className="glass rounded-3xl p-6 hover:shadow-xl transition-all duration-300 group border border-white/20">
                  <div className="w-14 h-14 rounded-xl bg-warning/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <CheckSquare className="w-7 h-7 text-warning" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Issue Resolution</h3>
                  <p className="text-muted-foreground text-sm">
                    Solve operational challenges systematically with structured problem-solving frameworks
                  </p>
                </div>

                <div className="lg:col-span-2 glass rounded-3xl p-8 hover:shadow-xl transition-all duration-300 border border-white/20">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="w-14 h-14 rounded-xl gradient-brand flex items-center justify-center mb-4">
                        <Video className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Productive Meetings</h3>
                      <p className="text-muted-foreground text-sm">
                        Run efficient weekly meetings with built-in agendas, timers, and automated action items
                      </p>
                    </div>
                    <div className="flex items-center justify-center">
                      <img 
                        src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80" 
                        alt="Team meeting" 
                        className="rounded-2xl w-full h-40 object-cover"
                      />
                    </div>
                  </div>
                </div>

                <div className="glass rounded-3xl p-6 hover:shadow-xl transition-all duration-300 group border border-white/20">
                  <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Team Alignment</h3>
                  <p className="text-muted-foreground text-sm">
                    Foster open communication and collaboration across your entire practice
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-accent/5 to-background" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="grid md:grid-cols-4 gap-8">
                {[
                  { value: "500+", label: "Active Clinics", icon: Users },
                  { value: "98%", label: "Team Satisfaction", icon: TrendingUp },
                  { value: "34%", label: "Avg. Growth Rate", icon: BarChart3 },
                  { value: "24/7", label: "Platform Uptime", icon: CheckSquare }
                ].map((stat, i) => (
                  <div key={i} className="glass rounded-2xl p-6 text-center hover:shadow-xl transition-all duration-300 group border border-white/20">
                    <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-4xl font-bold gradient-brand bg-clip-text text-transparent mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Social Proof / Testimonial Section */}
          <section className="py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <div className="inline-block glass px-4 py-2 rounded-full text-sm font-medium text-brand mb-4">
                  ⭐ Trusted by Leaders
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-4">
                  Why Clinics Choose Us
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    quote: "Clinic Leader transformed how we track performance. Our entire team is aligned and we've seen 40% revenue growth in just 6 months.",
                    author: "Dr. Sarah Chen",
                    role: "Clinic Director",
                    clinic: "Peak Wellness Center"
                  },
                  {
                    quote: "The meeting tools alone saved us 5 hours per week. Now our L10s are productive and everyone knows exactly what needs to get done.",
                    author: "Marcus Rodriguez",
                    role: "Practice Owner",
                    clinic: "Rodriguez Family Clinic"
                  },
                  {
                    quote: "Finally, a platform that actually understands healthcare operations. The integrations with our PM system make data tracking effortless.",
                    author: "Jennifer Taylor",
                    role: "Operations Manager",
                    clinic: "Summit Health Group"
                  }
                ].map((testimonial, i) => (
                  <div key={i} className="glass-dark rounded-3xl p-8 border border-white/20 hover:shadow-2xl transition-all duration-300">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-5 h-5 text-warning">⭐</div>
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 italic">"{testimonial.quote}"</p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full gradient-brand" />
                      <div>
                        <div className="font-semibold">{testimonial.author}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                        <div className="text-xs text-muted-foreground">{testimonial.clinic}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <WhyDifferent />

          {/* Team Collaboration - Modern */}
          <section className="py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8 order-2 lg:order-1">
                  <div className="inline-block glass px-4 py-2 rounded-full text-sm font-medium text-brand">
                    🤝 Collaboration
                  </div>
                  
                  <h2 className="text-4xl md:text-5xl font-bold">
                    Built for Your{" "}
                    <span className="gradient-brand bg-clip-text text-transparent">
                      Entire Practice
                    </span>
                  </h2>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    From owners to front desk staff, everyone stays aligned on what matters most.
                  </p>
                  
                  <div className="space-y-4">
                    {[
                      { icon: Users, text: "Real-time collaboration across departments" },
                      { icon: CheckSquare, text: "Role-based access and permissions" },
                      { icon: Target, text: "Mobile-friendly for on-the-go updates" }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4 items-start glass rounded-2xl p-4 border border-white/10 hover:shadow-lg transition-all duration-300">
                        <div className="w-10 h-10 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-muted-foreground pt-2">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="order-1 lg:order-2 relative">
                  <div className="absolute -inset-4 gradient-brand opacity-10 blur-3xl rounded-full" />
                  <div className="relative glass-dark rounded-3xl p-6 shadow-2xl border border-white/20">
                    <img 
                      src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80" 
                      alt="Team meeting" 
                      className="rounded-2xl w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Integration Showcase - Modern */}
          <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-background" />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="text-center mb-16 space-y-4">
                <div className="inline-block glass px-4 py-2 rounded-full text-sm font-medium text-brand mb-4">
                  🔗 Seamless Integration
                </div>
                <h2 className="text-4xl md:text-5xl font-bold">
                  Everything in{" "}
                  <span className="gradient-brand bg-clip-text text-transparent">
                    One Platform
                  </span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Stop juggling spreadsheets, documents, and multiple tools. One unified system for your entire practice.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mb-16">
                {[
                  { 
                    icon: BarChart3, 
                    title: "Track Performance", 
                    desc: "Real-time dashboards show exactly where your practice stands",
                    color: "brand"
                  },
                  { 
                    icon: Video, 
                    title: "Run Meetings", 
                    desc: "Built-in agendas and timers for efficient team meetings",
                    color: "accent"
                  },
                  { 
                    icon: MessageSquare, 
                    title: "Stay Aligned", 
                    desc: "Document decisions and share updates across your practice",
                    color: "success"
                  }
                ].map((item, i) => (
                  <div key={i} className="glass rounded-3xl p-8 text-center hover:shadow-xl transition-all duration-300 group border border-white/20">
                    <div className={`w-16 h-16 rounded-2xl ${item.color === 'brand' ? 'gradient-brand' : item.color === 'accent' ? 'bg-accent/10' : 'bg-success/10'} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                      <item.icon className={`w-8 h-8 ${item.color === 'brand' ? 'text-white' : item.color === 'accent' ? 'text-accent' : 'text-success'}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="relative">
                <div className="absolute -inset-6 gradient-brand opacity-10 blur-3xl rounded-full" />
                <div className="glass-dark rounded-3xl p-4 shadow-2xl relative border border-white/20">
                  <img 
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80" 
                    alt="Analytics Platform Dashboard Interface" 
                    className="rounded-2xl w-full"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* About Section - Sleek & Modern */}
          <section id="about" className="py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="relative order-2 lg:order-1">
                  <div className="absolute -inset-4 gradient-brand opacity-10 blur-3xl rounded-full" />
                  <div className="relative glass-dark rounded-3xl p-6 shadow-2xl border border-white/20">
                    <img 
                      src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80" 
                      alt="Our team" 
                      className="rounded-2xl w-full"
                    />
                  </div>
                </div>
                
                <div className="space-y-6 order-1 lg:order-2">
                  <div className="inline-block glass px-4 py-2 rounded-full text-sm font-medium text-brand">
                    👥 Our Story
                  </div>
                  
                  <h2 className="text-4xl md:text-5xl font-bold">
                    Built by Healthcare{" "}
                    <span className="gradient-brand bg-clip-text text-transparent">
                      Operators
                    </span>
                  </h2>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    We've worked with dozens of healthcare practices to understand what truly drives growth. Through that experience, 
                    we realized practices needed better tools to track performance and align teams around common goals.
                  </p>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    That's why we created Clinic Leader - a simple, powerful platform that combines data visibility 
                    with proven operational frameworks to help your practice scale profitably.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-6 pt-4">
                    <div className="glass rounded-2xl p-4 border border-white/10">
                      <div className="text-3xl font-bold gradient-brand bg-clip-text text-transparent">10+</div>
                      <div className="text-sm text-muted-foreground">Years Experience</div>
                    </div>
                    <div className="glass rounded-2xl p-4 border border-white/10">
                      <div className="text-3xl font-bold gradient-brand bg-clip-text text-transparent">500+</div>
                      <div className="text-sm text-muted-foreground">Clinics Served</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section - Clean & Modern */}
          <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-background" />
            
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="text-center mb-16 space-y-4">
                <div className="inline-block glass px-4 py-2 rounded-full text-sm font-medium text-brand mb-4">
                  ❓ Questions?
                </div>
                <h2 className="text-4xl md:text-5xl font-bold">
                  Frequently Asked{" "}
                  <span className="gradient-brand bg-clip-text text-transparent">
                    Questions
                  </span>
                </h2>
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
                  <details key={i} className="glass-dark rounded-2xl p-6 group border border-white/20 hover:shadow-lg transition-all duration-300">
                    <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center">
                      {faq.q}
                      <span className="text-brand group-open:rotate-180 transition-transform duration-300 text-2xl">▼</span>
                    </summary>
                    <p className="mt-4 text-muted-foreground leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA Section - Modern & Bold */}
          <section className="py-32 relative overflow-hidden">
            <div className="absolute inset-0 gradient-brand opacity-5" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--brand)/0.2),transparent_70%)]" />
            
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="glass-dark rounded-[3rem] p-12 md:p-16 text-center space-y-8 border-2 border-white/20 shadow-2xl">
                <div className="inline-block glass px-4 py-2 rounded-full text-sm font-medium text-brand mb-4">
                  🎯 Ready to Transform Your Practice?
                </div>
                
                <h2 className="text-4xl md:text-6xl font-bold leading-tight">
                  Start Leading with{" "}
                  <span className="gradient-brand bg-clip-text text-transparent">
                    Data & Strategy
                  </span>
                </h2>
                
                <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                  Join 500+ healthcare practices using Clinic Leader to align teams, 
                  track performance, and scale profitably.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button size="lg" className="gradient-brand text-white shadow-xl hover:shadow-2xl transition-shadow text-lg px-10 py-7" asChild>
                    <Link to="/auth">
                      Start Your Free Trial
                      <span className="ml-2">→</span>
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="glass border-2 text-lg px-10 py-7 hover:bg-white/50" asChild>
                    <a href="#features">
                      <Video className="w-5 h-5 mr-2" />
                      Watch Demo
                    </a>
                  </Button>
                </div>
                
                <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-success" />
                    Free 14-day trial
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-success" />
                    No credit card required
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-success" />
                    Cancel anytime
                  </div>
                </div>
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
