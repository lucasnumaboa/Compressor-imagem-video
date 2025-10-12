import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { showProgress, hideProgress, formatBytes } from './utils.js';

// Variáveis globais
let ffmpeg = null;
let isFFmpegLoaded = false;

// Inicializar o FFmpeg
export async function initFFmpeg() {
  ffmpeg = new FFmpeg();
  
  ffmpeg.on('log', ({ message }) => {
    console.log(message);
  });
  
  ffmpeg.on('progress', ({ progress }) => {
    const percent = Math.round(progress * 100);
    document.getElementById('progress').style.width = `${percent}%`;
    document.getElementById('progress-text').textContent = `Processando: ${percent}%`;
  });

  try {
    // Carregar FFmpeg
    const baseURL = '../static/ffmpeg';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
    });
    
    console.log('FFmpeg carregado');
    isFFmpegLoaded = true;
  } catch (error) {
    console.error('Erro ao carregar FFmpeg:', error);
  }
}

// Comprimir vídeo
export async function compressVideo(selectedVideo) {
  if (!selectedVideo || !isFFmpegLoaded) {
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
    await ffmpeg.writeFile(inputFileName, await fetchFile(selectedVideo));
    
    // Comprimir o vídeo
    document.getElementById('progress-text').textContent = 'Comprimindo vídeo...';
    await ffmpeg.exec([
      '-i', inputFileName,
      '-vf', `scale=${resolution}`,
      '-c:v', 'libx264',
      '-crf', crf,
      '-preset', 'medium',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputFileName
    ]);
    
    // Obter o vídeo comprimido
    const data = await ffmpeg.readFile(outputFileName);
    const compressedBlob = new Blob([data.buffer], { type: 'video/mp4' });
    
    // Mostrar o resultado
    const originalSize = formatBytes(selectedVideo.size);
    const compressedSize = formatBytes(compressedBlob.size);
    const compressionRatio = Math.round((1 - (compressedBlob.size / selectedVideo.size)) * 100);
    
    const downloadURL = URL.createObjectURL(compressedBlob);
    const fileName = selectedVideo.name.replace(/\.[^/.]+$/, '') + '_comprimido.mp4';
    
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