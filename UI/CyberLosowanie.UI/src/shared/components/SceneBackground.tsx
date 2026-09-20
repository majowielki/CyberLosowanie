/**
 * Decorative, fixed backdrop shared by every route: a few soft light blooms
 * and three parallax snow layers (pure CSS, see index.css). Mounted once in
 * App so pages never repeat background styling. aria-hidden — it carries no
 * content, and the snow stops under prefers-reduced-motion.
 */
function SceneBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Light blooms — warm at the top (tree lights), cool gold at the edge. */}
      <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-pine-700/60 blur-3xl" />

      {/* Snow — far to near for parallax. */}
      <div className="snow-layer snow-layer--far" />
      <div className="snow-layer snow-layer--mid" />
      <div className="snow-layer snow-layer--near" />

      {/* Vignette keeps the edges calm and the centre readable. */}
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.22)_100%)]" />
    </div>
  );
}

export default SceneBackground;
