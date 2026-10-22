import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import heroOrb from "@/assets/hero-orb.jpg";

// Import the WebGL runtime only after the browser opts into the live scene.
const Spline = lazy(() => import("@splinetool/react-spline"));
const SCENE_URL = "https://prod.spline.design/38OnHj7aK4PmVYp8/scene.splinecode";

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch() { this.props.onFailure(); }
  override render() { return this.state.failed ? null : this.props.children; }
}

export function HeroSpline() {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const size = window.matchMedia("(min-width: 768px)");
    const sync = () => setEnabled(size.matches && !motion.matches);
    sync();
    motion.addEventListener("change", sync);
    size.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      size.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled || loaded || failed) return;
    const timeout = window.setTimeout(() => setFailed(true), 30_000);
    return () => window.clearTimeout(timeout);
  }, [enabled, loaded, failed]);

  const live = enabled && !failed;
  return (
    <div className="absolute inset-0 lg:left-[30%]" aria-hidden="true" data-spline-state={live ? (loaded ? "loaded" : "loading") : "static"}>
      <img src={heroOrb} alt="" width={1600} height={1104}
        className={`absolute inset-0 h-full w-full object-cover object-top opacity-70 ${live && loaded ? "invisible" : ""}`} />
      {live && (
        <SceneBoundary onFailure={() => setFailed(true)}>
          <Suspense fallback={null}>
            <Spline scene={SCENE_URL} onLoad={() => setLoaded(true)} renderOnDemand={false}
              className={`pointer-events-auto absolute inset-0 h-full w-full -translate-y-12 lg:-translate-y-20 ${loaded ? "opacity-100" : "opacity-0"}`} />
          </Suspense>
        </SceneBoundary>
      )}
    </div>
  );
}