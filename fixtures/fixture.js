// Ordinary fixture behavior. Application/verification code never clicks this control.
document.getElementById('open-policy').addEventListener('click', event => {
  document.getElementById('privacy-policy').hidden = false;
  event.currentTarget.setAttribute('aria-expanded', 'true');
});
document.getElementById('forbidden-control').addEventListener('click', () => {
  const output = document.getElementById('forbidden-count');
  output.value = String(Number(output.value) + 1);
});
