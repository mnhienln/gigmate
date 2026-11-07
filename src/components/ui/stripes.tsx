/** Four stacked lines: the retro "poster" signature used under the logo. */
export function Stripes() {
  return (
    <div aria-hidden className="flex flex-col gap-[3px]">
      <div className="h-[4px] bg-gold" />
      <div className="h-[4px] bg-accent" />
      <div className="h-[4px] bg-brick" />
      <div className="h-[4px] bg-panel" />
    </div>
  );
}
