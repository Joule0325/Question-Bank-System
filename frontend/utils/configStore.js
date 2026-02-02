import { reactive } from 'vue';

const DEFAULT_CONFIG = {
  fontSize: 15,
  lineHeight: 1.6,
  optionMargin: 8,
  optionFormat: 'A.',
  subIndexFormat: '(1)'
};

export const globalConfig = reactive({ ...DEFAULT_CONFIG });

export const loadConfig = () => {
  try {
    const saved = uni.getStorageSync('sys_config');
    if (saved) {
      Object.assign(globalConfig, { ...DEFAULT_CONFIG, ...saved });
    }
  } catch (e) {
    console.error('Failed to load config', e);
  }
};

export const saveConfig = (newConfig) => {
  try {
    Object.assign(globalConfig, newConfig);
    uni.setStorageSync('sys_config', globalConfig);
  } catch (e) {
    console.error('Failed to save config', e);
  }
};

export const resetConfig = () => {
  try {
    Object.assign(globalConfig, DEFAULT_CONFIG);
    uni.setStorageSync('sys_config', globalConfig);
  } catch (e) {
    console.error('Failed to reset config', e);
  }
};

// Helper functions
export const formatOptionLabel = (key) => {
  const fmt = globalConfig.optionFormat || 'A.';
  const keyUpper = key.toUpperCase();
  const keyLower = key.toLowerCase();
  
  if (fmt === 'A.') return `${keyUpper}.`;
  if (fmt === '(A)') return `(${keyUpper})`;
  if (fmt === 'a.') return `${keyLower}.`;
  return `${keyUpper}.`;
};

export const formatSubIndex = (index) => {
  const fmt = globalConfig.subIndexFormat || '(1)';
  if (fmt === '1.') return `${index}.`;
  if (fmt === '(1)') return `(${index})`;
  
  if (fmt === '①') {
    const map = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
    return map[index-1] || `${index}.`;
  }
  
  if (fmt === '(i)') {
    const map = ['(i)','(ii)','(iii)','(iv)','(v)'];
    return map[index-1] || `(${index})`;
  }
  
  return `(${index})`;
};

// Initialize on load
loadConfig();
