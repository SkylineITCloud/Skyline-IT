// Static, consent-aware support concept. No operational API requests.
'use strict';
const explanations = {
  offline: 'No recent update may mean the device has no signal. It does not prove danger or show that an alert reached someone. Check the last update and the plan you agreed with your contacts.',
  battery: 'If the battery reading is missing or old, say so. Check charging, the time of the last reading and possible faults before saying the device is ready.',
  location: 'Show when the location was found and how accurate it is, if known. Refreshing the page does not make an old location new. No location is shown here.',
  receipt: 'The alert may still be waiting on the device. Until the service confirms that it saved the alert, do not say it arrived or that anyone received a message.'
};
const select = document.getElementById('metricSelect');
const feedback = document.getElementById('previewFeedback');
function renderGuide() { document.getElementById('healthExplanation').textContent = explanations[select.value]; }
select.addEventListener('change', renderGuide);
document.getElementById('accessPreview').addEventListener('click', () => { document.getElementById('accessResult').textContent = 'Practice result: you cannot see personal details here. You would need to sign in and have permission. No personal details were requested.'; feedback.textContent = 'A practice explanation was shown. No request to see personal details was sent.'; });
document.getElementById('refreshBtn').addEventListener('click', () => { select.value = 'offline'; renderGuide(); document.getElementById('accessResult').textContent = 'No personal information was requested.'; feedback.textContent = 'Example reset. No real records were loaded.'; });
renderGuide();
