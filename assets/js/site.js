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

(() => {
  const form = document.getElementById('donation-checkout-form');
  if (!form) return;

  const choices = Array.from(form.querySelectorAll('input[name="donation-choice"]'));
  const otherWrap = document.getElementById('donation-other-wrap');
  const otherInput = document.getElementById('donation-other-amount');
  const status = document.getElementById('donation-status');
  const submitButton = form.querySelector('.donation-submit');

  function selectedChoice() {
    return choices.find((input) => input.checked);
  }

  function updateOtherAmount() {
    const selected = selectedChoice();
    const isOther = selected && selected.value === 'other';

    if (otherWrap) otherWrap.hidden = !isOther;
    if (otherInput) {
      otherInput.required = !!isOther;
      if (!isOther) otherInput.value = '';
    }
  }

  choices.forEach((input) => input.addEventListener('change', updateOtherAmount));
  updateOtherAmount();

  const params = new URLSearchParams(window.location.search);
  if (params.get('canceled') === '1' && status) {
    status.textContent = 'Your donation was not completed. No charge was made. You can choose an amount and try again whenever you are ready.';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const selected = selectedChoice();
    let donationAmount = selected ? selected.value : '';
    if (donationAmount === 'other') donationAmount = otherInput ? otherInput.value.trim() : '';

    const amount = Number.parseFloat(donationAmount);
    if (!Number.isFinite(amount) || amount < 5) {
      if (status) status.textContent = 'Please enter a donation amount of at least $5.00.';
      if (otherInput && selected && selected.value === 'other') otherInput.focus();
      return;
    }

    if (status) status.textContent = 'Opening secure Stripe Checkout…';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Opening Secure Checkout…';
    }

    try {
      const response = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationAmount: amount.toFixed(2),
          firstName: document.getElementById('donor-first-name')?.value.trim() || '',
          lastName: document.getElementById('donor-last-name')?.value.trim() || '',
          email: document.getElementById('donor-email')?.value.trim() || ''
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Unable to start secure checkout.');
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error('Donation checkout error:', error);
      if (status) status.textContent = error.message || 'Something went wrong. Please try again.';
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Continue to Secure Checkout';
      }
    }
  });
})();
