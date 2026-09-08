// Portalled rooms must follow the visible viewport when a mobile keyboard opens.
export function observeVillageViewport(host: Window) {
  const viewport = host.visualViewport;
  const style = host.document.documentElement.style;
  const properties = ['--village-viewport-height', '--village-viewport-top'];
  const previous = properties.map((name) => style.getPropertyValue(name));
  const update = () => {
    // Keep native pinch zoom: do not reflow rooms into the magnified viewport.
    const unzoomed = !viewport || Math.abs(viewport.scale - 1) < 0.01;
    const values = unzoomed
      ? [
          `${viewport?.height ?? host.innerHeight}px`,
          `${viewport?.offsetTop ?? 0}px`
        ]
      : ['100dvh', '0px'];
    properties.forEach((name, index) => {
      if (style.getPropertyValue(name) !== values[index])
        style.setProperty(name, values[index]);
    });
  };
  update();
  host.addEventListener('resize', update);
  viewport?.addEventListener('resize', update);
  viewport?.addEventListener('scroll', update);
  return () => {
    host.removeEventListener('resize', update);
    viewport?.removeEventListener('resize', update);
    viewport?.removeEventListener('scroll', update);
    properties.forEach((name, index) => {
      if (previous[index]) style.setProperty(name, previous[index]);
      else style.removeProperty(name);
    });
  };
}
