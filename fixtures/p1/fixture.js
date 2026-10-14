for (const button of document.querySelectorAll('button[data-clauseguard-approved]')) {
  button.addEventListener('click', () => {
    for (const id of button.getAttribute('aria-controls').split(' ')) document.getElementById(id).hidden = false;
    button.setAttribute('aria-expanded', 'true');
  });
}
document.getElementById('forbidden-control')?.addEventListener('click', () => {
  const count = document.getElementById('forbidden-count'); count.textContent = String(Number(count.textContent) + 1);
});
if (location.pathname.endsWith('/dynamic.html')) {
  setTimeout(() => {
    const paragraph = document.createElement('p'); paragraph.id = 'dynamic-clause';
    paragraph.textContent = 'Updates inserted after page load remain part of this policy. Optional analytics consent can be withdrawn at any time.';
    document.getElementById('contract').append(paragraph);
  }, 600);
}
