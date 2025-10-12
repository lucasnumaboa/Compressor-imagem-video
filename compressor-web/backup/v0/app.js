// Variáveis globais
let selectedImage = null;
let selectedVideo = null;
let ffmpeg = null;

// Funções de utilidade
function showProgress(message) {
  const progressContainer = document.querySelector('.progress-container');
  const progressText = document.getElementById('progress-text');
  
  progressText.textContent = message;
  progressContainer.classList.add('active');
}

function hideProgress() {
  const progressContainer = document.querySelector('.progress-container');
  progressContainer.classList.remove('active');
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Inicializar FFmpeg
async function initFFmpeg() {
  try {
    ffmpeg = FFmpeg.createFFmpeg({
      log: true,
      progress: ({ ratio }) => {
        const percent = Math.round(ratio * 100);
        document.getElementById('progress').style.width = `${percent}%`;
        document.getElementById('progress-text').textContent = `Processando: ${percent}%`;
      }
    });
    
    await ffmpeg.load();
    console.log('FFmpeg carregado');
  } catch (error) {
    console.error('Erro ao carregar FFmpeg:', error);
  }
}

// Comprimir imagem
async function compressImage(file) {
  if (!file) return;
  
  showProgress('Comprimindo imagem...');
  
  try {
    const quality = parseInt(document.getElementById('image-quality').value) / 100;
    const maxWidth = parseInt(document.getElementById('image-max-width').value);
    
    // Criar um canvas para redimensionar e comprimir a imagem
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Carregar a imagem
    img.src = URL.createObjectURL(file);
    await new Promise(resolve => {
      img.onload = resolve;
    });
    
    // Calcular as dimensões
    let width = img.width;
    let height = img.height;
    
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = height * ratio;
    }
    
    // Redimensionar a imagem
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    
    // Comprimir a imagem
    const compressedBlob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    
    // Mostrar o resultado
    const originalSize = formatBytes(file.size);
    const compressedSize = formatBytes(compressedBlob.size);
    const compressionRatio = Math.round((1 - (compressedBlob.size / file.size)) * 100);
    
    const downloadURL = URL.createObjectURL(compressedBlob);
    const fileName = file.name.replace(/\.[^/.]+$/, '') + '_comprimido.jpg';
    
    document.getElementById('image-result').innerHTML = `
      <div class="file-info">
        <p><strong>Tamanho original:</strong> ${originalSize}</p>
        <p><strong>Tamanho comprimido:</strong> ${compressedSize}</p>
        <p><strong>Redução:</strong> ${compressionRatio}%</p>
      </div>
      <a href="${downloadURL}" download="${fileName}" class="download-btn">Baixar imagem comprimida</a>
    `;
    
    document.getElementById('image-result').classList.add('active');
    hideProgress();
  } catch (error) {
    console.error('Erro ao comprimir a imagem:', error);
    alert('Erro ao comprimir a imagem. Por favor, tente novamente.');
    hideProgress();
  }
}

// Comprimir vídeo
async function compressVideo(file) {
  if (!file || !ffmpeg) {
    console.error('Vídeo não selecionado ou FFmpeg não carregado');
    return;
  }
  
  showProgress('Preparando para compressão...');
  
  try {
    const crf = document.getElementById('video-crf').value;
    const qualityOption = document.getElementById('video-quality').value;
    
    let resolution;
    switch (qualityOption) {
      case 'high':
        resolution = '1920x1080';
        break;
      case 'medium':
        resolution = '1280x720';
        break;
      case 'low':
        resolution = '854x480';
        break;
      default:
        resolution = '1280x720';
    }
    
    // Carregar o vídeo no FFmpeg
    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp4';
    
    document.getElementById('progress-text').textContent = 'Carregando vídeo...';
    const fileData = await file.arrayBuffer();
    ffmpeg.FS('writeFile', inputFileName, new Uint8Array(fileData));
    
    // Comprimir o vídeo
    document.getElementById('progress-text').textContent = 'Comprimindo vídeo...';
    await ffmpeg.run(
      '-i', inputFileName,
      '-vf', `scale=${resolution}`,
      '-c:v', 'libx264',
      '-crf', crf,
      '-preset', 'medium',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputFileName
    );
    
    // Obter o vídeo comprimido
    const data = ffmpeg.FS('readFile', outputFileName);
    const compressedBlob = new Blob([data.buffer], { type: 'video/mp4' });
    
    // Mostrar o resultado
    const originalSize = formatBytes(file.size);
    const compressedSize = formatBytes(compressedBlob.size);
    const compressionRatio = Math.round((1 - (compressedBlob.size / file.size)) * 100);
    
    const downloadURL = URL.createObjectURL(compressedBlob);
    const fileName = file.name.replace(/\.[^/.]+$/, '') + '_comprimido.mp4';
    
    document.getElementById('video-result').innerHTML = `
      <div class="file-info">
        <p><strong>Tamanho original:</strong> ${originalSize}</p>
        <p><strong>Tamanho comprimido:</strong> ${compressedSize}</p>
        <p><strong>Redução:</strong> ${compressionRatio}%</p>
      </div>
      <video controls style="max-width: 100%; margin-bottom: 1rem;">
        <source src="${downloadURL}" type="video/mp4">
        Seu navegador não suporta a reprodução de vídeos.
      </video>
      <a href="${downloadURL}" download="${fileName}" class="download-btn">Baixar vídeo comprimido</a>
    `;
    
    document.getElementById('video-result').classList.add('active');
    hideProgress();
  } catch (error) {
    console.error('Erro ao comprimir o vídeo:', error);
    alert('Erro ao comprimir o vídeo. Por favor, tente novamente.');
    hideProgress();
  }
}

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar FFmpeg
  await initFFmpeg();
  
  // Elementos da interface
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const imageUpload = document.getElementById('image-upload');
  const videoUpload = document.getElementById('video-upload');
  const compressImageBtn = document.getElementById('compress-image-btn');
  const compressVideoBtn = document.getElementById('compress-video-btn');
  const imageQualitySlider = document.getElementById('image-quality');
  const imageQualityValue = document.getElementById('image-quality-value');
  const videoCrfSlider = document.getElementById('video-crf');
  const videoCrfValue = document.getElementById('video-crf-value');
  
  // Configurar as abas
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      tab.classList.add('active');
      const tabId = tab.dataset.tab;
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
  
  // Configurar os sliders
  imageQualitySlider.addEventListener('input', () => {
    imageQualityValue.textContent = `${imageQualitySlider.value}%`;
  });
  
  videoCrfSlider.addEventListener('input', () => {
    videoCrfValue.textContent = videoCrfSlider.value;
  });
  
  // Configurar os uploads de arquivos
  imageUpload.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      selectedImage = e.target.files[0];
      compressImageBtn.disabled = false;
    }
  });
  
  videoUpload.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      selectedVideo = e.target.files[0];
      compressVideoBtn.disabled = false;
    }
  });
  
  // Configurar os botões de compressão
  compressImageBtn.addEventListener('click', () => {
    compressImage(selectedImage);
  });
  
  compressVideoBtn.addEventListener('click', () => {
    compressVideo(selectedVideo);
  });
});