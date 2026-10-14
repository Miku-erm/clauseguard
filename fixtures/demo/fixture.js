document.getElementById('open-agreement')?.addEventListener('click', event => {
  document.getElementById('agreement').hidden = false;
  event.currentTarget.setAttribute('aria-expanded', 'true');
});
const ui = document.getElementById('clauseguard-ui');
if (ui) {
  const id = sessionStorage.getItem('clauseguardDemoExtension');
  if (/^[a-p]{32}$/.test(id ?? '')) ui.src = `chrome-extension://${id}/demo.html`;
}
