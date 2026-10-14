describe('ClauseGuard actual extension demonstration', () => {
  let extension;
  before(() => { cy.visit('/demo/llms-landing.html'); cy.task('demo:extension').then(id => { extension = id; }); });
  function show(path) {
    cy.visit('/demo/' + path, { onBeforeLoad(win) { win.sessionStorage.setItem('clauseguardDemoExtension', extension); } });
    cy.get('#clauseguard-ui').should('be.visible'); cy.task('demo:ready');
  }
  it('actual Alibaba interaction, Qwen inference, evidence and Turkish report', () => {
    show('flow.html'); cy.wait(3500);
    cy.task('demo:scan').then(r => { expect(r.path).to.equal('SLOW'); expect(r.agentSuccess).to.equal(true); });
    cy.get('#agreement').should('be.visible'); cy.wait(2500);
    cy.task('demo:analyze').then(r => { expect(r.score).to.be.greaterThan(0); expect(r.status).to.equal('COMPLETE'); });
    cy.wait(2500); cy.task('demo:report'); cy.wait(6500); cy.task('demo:quote'); cy.wait(3500); cy.task('demo:disclaimer'); cy.wait(2000);
  });
  it('actual incomplete coverage, withheld score and user explanation', () => {
    show('incomplete-flow.html'); cy.wait(3500); cy.task('demo:scan'); cy.task('demo:analyze').then(r => { expect(r.score).to.equal(null); });
    cy.wait(2000); cy.task('demo:report'); cy.task('demo:uncertainty'); cy.wait(6500); cy.task('demo:disclaimer'); cy.wait(2000);
  });
});
