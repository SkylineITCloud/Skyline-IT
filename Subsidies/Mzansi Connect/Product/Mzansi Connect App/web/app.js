// Mzansi Connect companion concept. Local preview only; no API or personal data.
'use strict';
const feedback = document.getElementById('previewFeedback');
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(button => { button.classList.toggle('active', button === tab); button.setAttribute('aria-pressed', String(button === tab)); });
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === 'tab-' + tab.dataset.tab));
}));
document.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => { feedback.textContent = button.dataset.preview; }));
let step = -1;
const notes = [
  'Example: the device noticed the button press. This does not mean the alert was sent.',
  'Example: the alert was saved online. This does not mean anyone has seen it.',
  'Example: sending a message was tried. We do not yet know whether it arrived.',
  'Example: a chosen person said they saw the alert. This does not mean emergency services were sent.'
];
function renderSteps() {
  document.querySelectorAll('#eventSteps li').forEach((item, index) => { item.classList.toggle('preview-complete', index <= step); });
  document.getElementById('eventStepNote').textContent = step < 0 ? 'This example has not started. No real messages will be sent.' : notes[step];
  document.getElementById('stepPreview').disabled = step === notes.length - 1;
}
document.getElementById('stepPreview').addEventListener('click', () => { if (step < notes.length - 1) step += 1; renderSteps(); feedback.textContent = 'Practice example updated. No real SOS or message was sent.'; });
document.getElementById('resetPreview').addEventListener('click', () => { step = -1; renderSteps(); feedback.textContent = 'Practice example reset. No real alert was changed.'; });
