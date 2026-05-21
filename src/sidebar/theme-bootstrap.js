(() => {
  const theme = new URLSearchParams(location.search).get('theme');
  if (theme === 'light' || theme === 'discord-dark' || theme === 'system') {
    document.documentElement.dataset.theme = theme;
  }
})();
