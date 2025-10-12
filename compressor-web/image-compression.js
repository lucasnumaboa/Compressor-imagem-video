import { showProgress, hideProgress, formatBytes } from './utils.js';

// Comprimir imagem
export async function compressImage(selectedImage) {
  if (!selectedImage) return;
  
  showProgress('Comprimindo imagem...');
  
  try {
    const quality = parseInt(document.getElementById('image-quality').value) / 100;
    const maxWidth = parseInt(document.getElementById('image-max-width').value);
    
    // Criar um canvas para redimensionar e comprimir a imagem
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Carregar a imagem
    img.src = URL.createObjectURL(selectedImage);
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
    const originalSize = formatBytes(selectedImage.size);
    const compressedSize = formatBytes(compressedBlob.size);
    const compressionRatio = Math.round((1 - (compressedBlob.size / selectedImage.size)) * 100);
    
    const downloadURL = URL.createObjectURL(compressedBlob);
    const fileName = selectedImage.name.replace(/\.[^/.]+$/, '') + '_comprimido.jpg';
    
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