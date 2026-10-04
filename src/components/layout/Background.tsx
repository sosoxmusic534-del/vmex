// Optional: put an image at src/assets/bg/bg.webp and uncomment the next line
// import bgImage from "../../assets/bg/bg.webp";

const bgImage: string | null = null;

export default function Background() {
  return (
    <div className="site-bg" aria-hidden="true">
      {bgImage && (
        <div className="site-bg__image" style={{ backgroundImage: `url(${bgImage})` }} />
      )}
      <div className="site-bg__grid" />
      <div className="site-bg__glow site-bg__glow--1" />
      <div className="site-bg__glow site-bg__glow--2" />
      <div className="site-bg__vignette" />
    </div>
  );
}
