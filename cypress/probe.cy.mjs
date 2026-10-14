describe('native extension-page Cypress capability probe', () => {
  it('attempts the actual extension UI route without mocked APIs', () => {
    cy.visit('/demo/llms-landing.html');
    cy.task('extensionId').then(id => {
      cy.visit(`chrome-extension://${id}/popup.html`);
      cy.contains('ClauseGuard').should('be.visible');
    });
  });
});
