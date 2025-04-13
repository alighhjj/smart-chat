/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { contextBridge, ipcRenderer } = require('electron')

// 暴露保护的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 发送消息到主进程
  sendMessage: (message) => ipcRenderer.send('send-message', message),
  
  // 接收主进程的消息
  receiveMessage: (callback) => ipcRenderer.on('receive-message', (event, ...args) => callback(...args)),
  
  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 获取系统信息
  getSystemInfo: () => {
    return {
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron
    }
  },
  
  // 保存API Key
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
  
  // 获取保存的API Key
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  
  // 创建新的聊天
  newChat: () => ipcRenderer.send('new-chat'),
  
  // 获取可用的模型列表
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
  
  // 获取当前选择的模型
  getCurrentModel: () => ipcRenderer.invoke('get-current-model'),
  
  // 切换模型
  switchModel: (modelId) => ipcRenderer.invoke('switch-model', modelId)
})

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }
})
