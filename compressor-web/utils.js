// Funções auxiliares
export function showProgress(message) {
  document.querySelector('.progress-container').classList.add('active');
  document.getElementById('progress').style.width = '0%';
  document.getElementById('progress-text').textContent = message;
}

export function hideProgress() {
  document.querySelector('.progress-container').classList.remove('active');
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}