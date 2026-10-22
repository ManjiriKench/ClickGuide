(function () {
  const DEFAULT_SETTINGS = {
    promoNotifications: true,
    emailNotifications: true,
    reportFormat: 'PDF',
    theme: 'Light'
  };

  function loadSettings() {
    try {
      const stored = localStorage.getItem('clickguide_demo_settings');
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error(e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem('clickguide_demo_settings', JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }

  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme.toLowerCase());
  }

  function updateSummaryDisplay(settings) {
    const promoEl = document.getElementById('state-promo');
    const emailEl = document.getElementById('state-email');
    const formatEl = document.getElementById('state-format');
    const themeEl = document.getElementById('state-theme');

    if (promoEl) promoEl.textContent = settings.promoNotifications ? 'Enabled' : 'Disabled';
    if (emailEl) emailEl.textContent = settings.emailNotifications ? 'Enabled' : 'Disabled';
    if (formatEl) formatEl.textContent = settings.reportFormat;
    if (themeEl) themeEl.textContent = settings.theme;
  }

  function initSettingsPage() {
    const form = document.getElementById('settings-form');
    if (!form) return;

    const promoInput = document.getElementById('promo-notifications');
    const emailInput = document.getElementById('email-notifications');
    const formatSelect = document.getElementById('report-format');
    const themeSelect = document.getElementById('theme-selector');
    const statusText = document.getElementById('save-status');
    const resetBtn = document.getElementById('reset-defaults-btn');

    let current = loadSettings();

    promoInput.checked = Boolean(current.promoNotifications);
    emailInput.checked = Boolean(current.emailNotifications);
    formatSelect.value = current.reportFormat || 'PDF';
    themeSelect.value = current.theme || 'Light';

    applyTheme(current.theme);
    updateSummaryDisplay(current);

    themeSelect.addEventListener('change', () => {
      applyTheme(themeSelect.value);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const newSettings = {
        promoNotifications: promoInput.checked,
        emailNotifications: emailInput.checked,
        reportFormat: formatSelect.value,
        theme: themeSelect.value
      };

      saveSettings(newSettings);
      current = newSettings;
      applyTheme(newSettings.theme);
      updateSummaryDisplay(newSettings);

      if (statusText) {
        statusText.textContent = `Settings saved successfully at ${new Date().toLocaleTimeString()}`;
        statusText.className = 'status-text success';
      }
    });

    resetBtn.addEventListener('click', () => {
      promoInput.checked = DEFAULT_SETTINGS.promoNotifications;
      emailInput.checked = DEFAULT_SETTINGS.emailNotifications;
      formatSelect.value = DEFAULT_SETTINGS.reportFormat;
      themeSelect.value = DEFAULT_SETTINGS.theme;
      applyTheme(DEFAULT_SETTINGS.theme);

      saveSettings(DEFAULT_SETTINGS);
      updateSummaryDisplay(DEFAULT_SETTINGS);

      if (statusText) {
        statusText.textContent = 'Settings reset to default values';
        statusText.className = 'status-text neutral';
      }
    });
  }

  function initChallengePage() {
    const timerDisplay = document.getElementById('challenge-timer');
    const startBtn = document.getElementById('start-timer-btn');
    const submitBtn = document.getElementById('submit-challenge-btn');
    const statusText = document.getElementById('challenge-status');
    const overrideInput = document.getElementById('security-override');
    const regionSelect = document.getElementById('emergency-region');
    const authInput = document.getElementById('auth-code');

    if (!timerDisplay) return;

    let timeLeft = 45.0;
    let timerId = null;

    function renderTime() {
      const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      const seconds = (timeLeft % 60).toFixed(2).padStart(5, '0');
      timerDisplay.textContent = `${minutes}:${seconds}`;
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (timerId) clearInterval(timerId);
        timeLeft = 45.0;
        renderTime();
        statusText.textContent = 'Challenge running... complete all steps';
        statusText.className = 'status-text warning';

        timerId = setInterval(() => {
          timeLeft -= 0.1;
          if (timeLeft <= 0) {
            clearInterval(timerId);
            timeLeft = 0;
            renderTime();
            statusText.textContent = 'Time expired! Challenge failed.';
            statusText.className = 'status-text danger';
          } else {
            renderTime();
          }
        }, 100);
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        if (overrideInput && overrideInput.checked && authInput && authInput.value.trim() === 'CONFIRM-2026') {
          if (timerId) clearInterval(timerId);
          statusText.textContent = `Challenge PASSED in ${regionSelect.value} with ${(45 - timeLeft).toFixed(1)}s elapsed!`;
          statusText.className = 'status-text success';
        } else {
          statusText.textContent = 'Verification failed: check override switch and auth code.';
          statusText.className = 'status-text warning';
        }
      });
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    initSettingsPage();
    initChallengePage();
  });
})();
