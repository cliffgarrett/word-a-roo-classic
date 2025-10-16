import { SoundManager } from './sound.js';

const splash = document.getElementById('splash');
const btnStart = document.getElementById('btnStart');
const picker = document.getElementById('modePicker');
const stage = document.getElementById('stage');

SoundManager.load('splash', './assets/audio/splash.mp3');

// Start button → show picker
btnStart.addEventListener('click', async () => {
  SoundManager.play('splash', true);
  splash.classList.add('hidden');
  picker.classList.remove('hidden');

  // For demo, auto-launch Classic after 2s
  setTimeout(() => {
    document.getElementById('chooseClassic').click();
  }, 2000);
});

// Picker → Classic
document.getElementById('chooseClassic').addEventListener('click', async () => {
  picker.classList.add('hidden');
  SoundManager.stopAll();
  await loadMode('classic');
});

// Picker cancel → back to splash
document.getElementById('cancelPicker').addEventListener('click', () => {
  picker.classList.add('hidden');
  splash.classList.remove('hidden');
});

async function loadMode(name) {
  console.log(`Loading mode: ${name}`);

  // Load mode-specific CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `./modes/${name}/styles/${name}.css`;
  document.head.appendChild(link);

  // Load mode script
  try {
    const mod = await import(`../modes/${name}/scripts/${name}.js`);
    mod.start?.();
  } catch (err) {
    console.error('Failed to load mode:', err);
  }
}

export function mountStage(html) {
  stage.innerHTML = html;
}
