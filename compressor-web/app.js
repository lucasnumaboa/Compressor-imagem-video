// Variáveis globais
let selectedImages = [];
let selectedVideos = [];
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

// Atualizar lista de arquivos selecionados
function updateFilesList(type) {
  const filesList = document.getElementById(`${type}-files-list`);
  const files = type === 'image' ? selectedImages : selectedVideos;
  
  if (files.length === 0) {
    filesList.classList.remove('active');
    return;
  }
  
  filesList.classList.add('active');
  
  let html = `<h3>${files.length} arquivo(s) selecionado(s):</h3>`;
  files.forEach((file, index) => {
    html += `
      <div class="file-item">
        <span class="file-item-name">${file.name}</span>
        <span class="file-item-size">${formatBytes(file.size)}</span>
        <button class="file-item-remove" onclick="removeFile('${type}', ${index})">Remover</button>
      </div>
    `;
  });
  
  filesList.innerHTML = html;
}

// Remover arquivo da lista
function removeFile(type, index) {
  if (type === 'image') {
    selectedImages.splice(index, 1);
  } else {
    selectedVideos.splice(index, 1);
  }
  
  updateFilesList(type);
  
  const btn = document.getElementById(`compress-${type}-btn`);
  if ((type === 'image' && selectedImages.length === 0) || 
      (type === 'video' && selectedVideos.length === 0)) {
    btn.disabled = true;
  }
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

// Comprimir uma imagem
async function compressImageFile(file) {
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
  
  return {
    blob: compressedBlob,
    fileName: file.name.replace(/\.[^/.]+$/, '') + '_comprimido.jpg',
    originalSize: file.size,
    compressedSize: compressedBlob.size
  };
}

// Comprimir múltiplas imagens
async function compressImages(files) {
  if (!files || files.length === 0) return;
  
  showProgress('Comprimindo imagens...');
  
  try {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      document.getElementById('progress-text').textContent = `Comprimindo imagem ${i + 1} de ${files.length}...`;
      
      const result = await compressImageFile(file);
      results.push(result);
    }
    
    // Calcular estatísticas
    let totalOriginal = 0;
    let totalCompressed = 0;
    
    results.forEach(result => {
      totalOriginal += result.originalSize;
      totalCompressed += result.compressedSize;
    });
    
    const totalReduction = Math.round((1 - (totalCompressed / totalOriginal)) * 100);
    
    // Armazenar resultados para download
    window.compressedFilesData = results;
    
    // Mostrar os resultados
    let html = '<h3>Imagens comprimidas com sucesso!</h3>';
    html += `
      <div class="file-info" style="background-color: rgba(46, 204, 113, 0.1); border-left-color: #2ecc71;">
        <p><strong>Resumo Total:</strong></p>
        <p><strong>Arquivos processados:</strong> ${results.length}</p>
        <p><strong>Tamanho original total:</strong> ${formatBytes(totalOriginal)}</p>
        <p><strong>Tamanho comprimido total:</strong> ${formatBytes(totalCompressed)}</p>
        <p><strong>Redução total:</strong> ${totalReduction}%</p>
      </div>
      <button class="download-btn" onclick="downloadCompressedFiles('image')" style="display: block; width: 100%; margin-top: 1rem; padding: 0.8rem;">Baixar Arquivos</button>
    `;
    
    document.getElementById('image-result').innerHTML = html;
    document.getElementById('image-result').classList.add('active');
    hideProgress();
  } catch (error) {
    console.error('Erro ao comprimir as imagens:', error);
    alert('Erro ao comprimir as imagens. Por favor, tente novamente.');
    hideProgress();
  }
}

// Comprimir um vídeo
async function compressVideoFile(file, index, total) {
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
  const inputFileName = `input_${index}.mp4`;
  const outputFileName = `output_${index}.mp4`;
  
  document.getElementById('progress-text').textContent = `Carregando vídeo ${index} de ${total}...`;
  const fileData = await file.arrayBuffer();
  ffmpeg.FS('writeFile', inputFileName, new Uint8Array(fileData));
  
  // Comprimir o vídeo
  document.getElementById('progress-text').textContent = `Comprimindo vídeo ${index} de ${total}...`;
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
  
  // Limpar arquivos temporários
  ffmpeg.FS('unlink', inputFileName);
  ffmpeg.FS('unlink', outputFileName);
  
  return {
    blob: compressedBlob,
    fileName: file.name.replace(/\.[^/.]+$/, '') + '_comprimido.mp4',
    originalSize: file.size,
    compressedSize: compressedBlob.size
  };
}

// Comprimir múltiplos vídeos
async function compressVideos(files) {
  if (!files || files.length === 0 || !ffmpeg) {
    console.error('Vídeos não selecionados ou FFmpeg não carregado');
    return;
  }
  
  showProgress('Preparando para compressão...');
  
  try {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await compressVideoFile(file, i, files.length);
      results.push(result);
    }
    
    // Calcular estatísticas
    let totalOriginal = 0;
    let totalCompressed = 0;
    
    results.forEach(result => {
      totalOriginal += result.originalSize;
      totalCompressed += result.compressedSize;
    });
    
    const totalReduction = Math.round((1 - (totalCompressed / totalOriginal)) * 100);
    
    // Armazenar resultados para download
    window.compressedFilesData = results;
    
    // Mostrar os resultados
    let html = '<h3>Vídeos comprimidos com sucesso!</h3>';
    html += `
      <div class="file-info" style="background-color: rgba(46, 204, 113, 0.1); border-left-color: #2ecc71;">
        <p><strong>Resumo Total:</strong></p>
        <p><strong>Arquivos processados:</strong> ${results.length}</p>
        <p><strong>Tamanho original total:</strong> ${formatBytes(totalOriginal)}</p>
        <p><strong>Tamanho comprimido total:</strong> ${formatBytes(totalCompressed)}</p>
        <p><strong>Redução total:</strong> ${totalReduction}%</p>
      </div>
      <button class="download-btn" onclick="downloadCompressedFiles('video')" style="display: block; width: 100%; margin-top: 1rem; padding: 0.8rem;">Baixar Arquivos</button>
    `;
    
    document.getElementById('video-result').innerHTML = html;
    document.getElementById('video-result').classList.add('active');
    hideProgress();
  } catch (error) {
    console.error('Erro ao comprimir os vídeos:', error);
    alert('Erro ao comprimir os vídeos. Por favor, tente novamente.');
    hideProgress();
  }
}

// Função para baixar arquivos comprimidos
function downloadCompressedFiles(type) {
  const files = window.compressedFilesData;
  
  if (!files || files.length === 0) {
    alert('Nenhum arquivo para baixar');
    return;
  }
  
  if (files.length === 1) {
    // Se houver apenas um arquivo, baixar diretamente
    const file = files[0];
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file.blob);
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Se houver múltiplos arquivos, baixar cada um sequencialmente
    files.forEach((file, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file.blob);
        link.download = file.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 500); // Pequeno delay entre downloads
    });
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
    selectedImages = Array.from(e.target.files);
    updateFilesList('image');
    compressImageBtn.disabled = selectedImages.length === 0;
  });
  
  videoUpload.addEventListener('change', (e) => {
    selectedVideos = Array.from(e.target.files);
    updateFilesList('video');
    compressVideoBtn.disabled = selectedVideos.length === 0;
  });
  
  // Configurar os botões de compressão
  compressImageBtn.addEventListener('click', () => {
    compressImages(selectedImages);
  });
  
  compressVideoBtn.addEventListener('click', () => {
    compressVideos(selectedVideos);
  });
  
  // Suporte para drag and drop
  const imageUploadLabel = document.querySelector('label[for="image-upload"]');
  const videoUploadLabel = document.querySelector('label[for="video-upload"]');
  
  [imageUploadLabel, videoUploadLabel].forEach(label => {
    label.addEventListener('dragover', (e) => {
      e.preventDefault();
      label.style.borderColor = 'var(--primary-color)';
      label.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
    });
    
    label.addEventListener('dragleave', () => {
      label.style.borderColor = 'var(--border-color)';
      label.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    });
    
    label.addEventListener('drop', (e) => {
      e.preventDefault();
      label.style.borderColor = 'var(--border-color)';
      label.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
      
      const input = label.querySelector('input[type="file"]');
      input.files = e.dataTransfer.files;
      
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    });
  });
});