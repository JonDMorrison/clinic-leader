import { EnvironmentBadge } from "./EnvironmentBadge";

/**
 * Internal app footer showing environment information
 * Positioned at the bottom of the main content area
 */
export function AppFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="flex justify-end p-4">
        <div className="pointer-events-auto">
          <EnvironmentBadge />
        </div>
      </div>
    </footer>
  );
}
