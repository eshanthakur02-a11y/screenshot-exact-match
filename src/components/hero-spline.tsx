import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Application } from "@splinetool/runtime";

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
  const application = useRef<Application | null>(null);
  const reducedMotion = useRef(false);

  const fitScene = useCallback((app: Application) => {
    const stage = document.getElementById("product");
    if (!stage) return;
    app.setZoom(stage.clientWidth < 640 ? 0.48 : 0.75);
  }, []);

  const handleLoad = useCallback((app: Application) => {
    application.current = app;
    fitScene(app);
    if (reducedMotion.current) app.stop();
    setLoaded(true);
  }, [fitScene]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedMotion.current = motion.matches;
      const app = application.current;
      if (app) {
        if (motion.matches) app.stop();
        else app.play();
      }
    };
    sync();
    setEnabled(true);
    const resize = () => {
      const app = application.current;
      if (app) fitScene(app);
    };
    window.addEventListener("resize", resize);
    motion.addEventListener("change", sync);
    return () => {
      application.current = null;
      window.removeEventListener("resize", resize);
      motion.removeEventListener("change", sync);
    };
  }, [fitScene]);

  useEffect(() => {
    if (!enabled || loaded || failed) return;
    const timeout = window.setTimeout(() => setFailed(true), 30_000);
    return () => window.clearTimeout(timeout);
  }, [enabled, loaded, failed]);

  const live = enabled && !failed;
  return (
    <div className="absolute inset-0 bg-scene-background" aria-label="Interactive AetherMind 3D robot" data-spline-state={live ? (loaded ? "loaded" : "loading") : "static"}>
      {live && (
        <SceneBoundary onFailure={() => setFailed(true)}>
          <Suspense fallback={null}>
            <Spline scene={SCENE_URL} onLoad={handleLoad} renderOnDemand={false}
              className={`pointer-events-auto absolute inset-0 h-full w-full ${loaded ? "opacity-100" : "opacity-0"}`} />
          </Suspense>
        </SceneBoundary>
      )}
    </div>
  );
}