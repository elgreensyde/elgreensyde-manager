/**
 * iOS PWA Safe Dialog Service
 * Replaces native window.confirm() and window.prompt() which are frequently
 * blocked or silenced on iOS Safari when running as a PWA from the home screen.
 */

// Dispatches a custom event that the <GlobalDialog /> component in App.jsx listens for.
export const confirmAction = (message) => {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent('show-dialog', {
        detail: {
          type: 'confirm',
          message,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        },
      })
    );
  });
};

export const promptAction = (message, defaultValue = '', required = false) => {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent('show-dialog', {
        detail: {
          type: 'prompt',
          message,
          defaultValue,
          required,
          onConfirm: (val) => resolve(val),
          onCancel: () => resolve(null), // return null on cancel to mimic native prompt
        },
      })
    );
  });
};
