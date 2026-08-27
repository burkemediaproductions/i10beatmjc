(() => {
  const body = document.body;
  const menuButton = document.querySelector('.menu-toggle');
  const mobilePanel = document.querySelector('.mobile-panel');
  let lastFocused = null;

  function setMenu(open) {
    if (!menuButton || !mobilePanel) return;

    menuButton.setAttribute('aria-expanded', String(open));
    mobilePanel.classList.toggle('open', open);
    mobilePanel.setAttribute('aria-hidden', String(!open));
    body.classList.toggle('menu-open', open);

    if (open) {
      lastFocused = document.activeElement;
      const firstControl = mobilePanel.querySelector('a, button');
      if (firstControl) firstControl.focus();
    } else {
      mobilePanel.querySelectorAll('.mobile-parent[aria-expanded="true"]').forEach((button) => {
        button.setAttribute('aria-expanded', 'false');
        const submenu = document.getElementById(button.getAttribute('aria-controls'));
        if (submenu) submenu.hidden = true;
      });

      if (lastFocused) lastFocused.focus();
    }
  }

  if (menuButton) {
    menuButton.addEventListener('click', () => {
      setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
    });
  }

  if (mobilePanel) {
    mobilePanel.querySelectorAll('.mobile-parent').forEach((button) => {
      button.addEventListener('click', () => {
        const opening = button.getAttribute('aria-expanded') !== 'true';
        const submenu = document.getElementById(button.getAttribute('aria-controls'));

        mobilePanel.querySelectorAll('.mobile-parent').forEach((otherButton) => {
          if (otherButton === button) return;
          otherButton.setAttribute('aria-expanded', 'false');
          const otherSubmenu = document.getElementById(otherButton.getAttribute('aria-controls'));
          if (otherSubmenu) otherSubmenu.hidden = true;
        });

        button.setAttribute('aria-expanded', String(opening));
        if (submenu) submenu.hidden = !opening;
      });
    });

    mobilePanel.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenu(false));
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

    let ticking = false;
    addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;

        requestAnimationFrame(() => {
          document.querySelectorAll('[data-parallax]').forEach((element) => {
            const rect = element.getBoundingClientRect();
            element.style.backgroundPositionY = `${50 + (rect.top / innerHeight) * 10}%`;
          });
          ticking = false;
        });
      },
      { passive: true }
    );
  } else {
    document.querySelectorAll('.reveal').forEach((element) => element.classList.add('is-visible'));
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
