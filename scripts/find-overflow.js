(() => {
  const vw = document.documentElement.clientWidth;
  const offenders = [];
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > vw + 1 || r.right > vw + 1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: typeof el.className === 'string' ? el.className.slice(0, 90) : '',
        w: Math.round(r.width),
        right: Math.round(r.right),
        text: (el.textContent || '').trim().slice(0, 40),
      });
    }
  });
  return JSON.stringify(offenders.slice(0, 12), null, 1);
})();
