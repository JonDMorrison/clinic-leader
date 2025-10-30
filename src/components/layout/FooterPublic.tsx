import { Link } from "react-router-dom";

export const FooterPublic = () => {
  return (
    <footer className="bg-muted/50 border-t border-border/40 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold text-brand mb-4">Clinic Leader</h3>
            <p className="text-muted-foreground mb-4">
              Empowering healthcare practices to grow with the right data and proven operational frameworks.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/#about" className="text-muted-foreground hover:text-brand transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/#features" className="text-muted-foreground hover:text-brand transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/#contact" className="text-muted-foreground hover:text-brand transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-muted-foreground hover:text-brand transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-brand transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/40 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} Clinic Leader. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
