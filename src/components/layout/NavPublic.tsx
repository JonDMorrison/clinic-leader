import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClinicLeaderLogo } from "@/components/ui/ClinicLeaderLogo";
import { LOGO_SIZES } from "@/components/brand/logoConstants";

export const NavPublic = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="group">
            <ClinicLeaderLogo 
              size={LOGO_SIZES.nav} 
              className="transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-foreground hover:text-brand transition-colors">
              Home
            </Link>
            <Link to="/features" className="text-foreground hover:text-brand transition-colors">
              Features
            </Link>
            <Link to="/integrations" className="text-foreground hover:text-brand transition-colors">
              Integrations
            </Link>
            <Link to="/about" className="text-foreground hover:text-brand transition-colors">
              About
            </Link>
            <Link to="/#contact" className="text-foreground hover:text-brand transition-colors">
              Contact
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-foreground hover:text-brand"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border/40">
            <Link
              to="/"
              className="block py-2 text-foreground hover:text-brand transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/features"
              className="block py-2 text-foreground hover:text-brand transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              to="/integrations"
              className="block py-2 text-foreground hover:text-brand transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Integrations
            </Link>
            <Link
              to="/about"
              className="block py-2 text-foreground hover:text-brand transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              to="/#contact"
              className="block py-2 text-foreground hover:text-brand transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
            <div className="pt-4 space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button className="w-full" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
