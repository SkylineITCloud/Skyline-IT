// Support marketplace concept: no bookings, identity collection or API calls.
'use strict';
const feedback = document.getElementById('previewFeedback');
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(button => { button.classList.toggle('active', button === tab); button.setAttribute('aria-pressed', String(button === tab)); });
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === 'tab-' + tab.dataset.tab));
}));
document.querySelectorAll('[data-topic]').forEach(button => button.addEventListener('click', () => { feedback.textContent = 'Practice page: ' + button.dataset.topic + ' No booking or request was sent.'; }));
const search = document.getElementById('jobSearch');
function filterTopics() {
  const query = search.value.toLowerCase().trim(); let visible = 0;
  document.querySelectorAll('#jobGrid .job-card').forEach(card => { const show = !query || (card.dataset.search + ' ' + card.textContent).toLowerCase().includes(query); card.hidden = !show; if (show) visible += 1; });
  document.getElementById('emptySearch').hidden = visible > 0;
}
search.addEventListener('input', filterTopics);
document.getElementById('refreshBtn').addEventListener('click', () => { search.value = ''; filterTopics(); feedback.textContent = 'Example reset. No bookings, support people or payments were loaded.'; });
