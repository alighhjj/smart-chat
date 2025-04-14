// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('fs')
const https = require('https')

// 设置控制台输出编码为UTF-8
if (process.platform === 'win32') {
    process.env.LANG = 'zh_CN.UTF-8'
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

// API Key配置文件路径
const configPath = path.join(app.getPath('userData'), 'config.json')

// DeepSeek API 配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

// 可用的模型配置
const MODELS = {
    'deepseek-v3': {
        id: 'deepseek-chat',
        name: 'DeepSeek-V3',
        description: '基础对话模型'
    },
    'deepseek-r1': {
        id: 'deepseek-reasoner',
        name: 'DeepSeek-R1',
        description: '支持推理的对话模型',
        // R1模型特有参数
        include_thinking_step: true,
        thinking_note: '请先思考这个问题然后给出回答，两部分要分开'
    }
}

// 当前选择的模型
let currentModel = 'deepseek-v3';

// 简单的配置管理
const configManager = {
    // 获取配置
    getConfig: () => {
        try {
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8')
                return JSON.parse(configData)
            }
        } catch (error) {
            console.error('读取配置文件失败:', error)
        }
        return {}
    },

    // 保存配置
    saveConfig: (config) => {
        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')
            return true
        } catch (error) {
            console.error('保存配置文件失败:', error)
            return false
        }
    },

    // 获取API Key
    getApiKey: () => {
        const config = configManager.getConfig()
        return config.apiKey || ''
    },

    // 保存API Key
    saveApiKey: (apiKey) => {
        const config = configManager.getConfig()
        config.apiKey = apiKey
        return configManager.saveConfig(config)
    },

    // 获取当前选择的模型
    getSelectedModel: () => {
        const config = configManager.getConfig()
        return config.selectedModel || 'deepseek-v3'
    },

    // 保存当前选择的模型
    saveSelectedModel: (modelId) => {
        const config = configManager.getConfig()
        config.selectedModel = modelId
        return configManager.saveConfig(config)
    }
}

// 安全处理文本，确保不会破坏JSON格式
function sanitizeText(text) {
    if (typeof text !== 'string') return '';

    // 转义JSON特殊字符
    return text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/\f/g, '\\f');
}

// 调用DeepSeek API
function callDeepSeekAPI(apiKey, messages, modelId = 'deepseek-v3') {
    return new Promise((resolve, reject) => {
        try {
            // 获取模型配置
            const model = MODELS[modelId] || MODELS['deepseek-v3'];

            // 处理消息内容，确保每个消息的content是安全的
            const safeMessages = messages.map(msg => ({
                role: msg.role,
                content: sanitizeText(msg.content)
            }));

            // 请求数据
            const requestBody = {
                model: model.id,
                messages: safeMessages,
                temperature: 0.7,
                max_tokens: 2048,
                stream: false // 默认不使用流式响应，可根据需要修改
            };

            const data = JSON.stringify(requestBody);

            console.log(`请求${model.name}模型，数据:`, data.substring(0, 200) + '...');

            // 请求选项
            const options = {
                hostname: 'api.deepseek.com',
                path: '/chat/completions', // 更新为官方API路径
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            // 创建请求
            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (res.statusCode === 200) {
                            const content = response.choices[0].message.content;
                            // 检查是否为推理模型响应，并提取reasoning_content
                            const reasoningContent = response.choices[0].message.reasoning_content || null;
                            
                            resolve({
                                text: content,
                                reasoningContent: reasoningContent,
                                modelName: model.name,
                                error: false
                            });
                        } else {
                            reject(new Error(`API请求失败，状态码: ${res.statusCode}`));
                        }
                    } catch (error) {
                        reject(new Error('解析API响应失败: ' + error.message));
                    }
                });
            });

            // 请求错误处理
            req.on('error', (error) => {
                reject(new Error('API请求错误: ' + error.message));
            });

            // 发送请求数据
            req.write(data);
            req.end();
        } catch (error) {
            reject(new Error('准备API请求时出错: ' + error.message));
        }
    });
}

// 保存聊天历史记录
let chatHistory = []

// 通过DeepSeek获取AI回复
async function getAIResponseFromDeepSeek(message, modelId) {
    // 获取API Key
    const apiKey = configManager.getApiKey()

    // 如果没有设置API Key，提示用户设置
    if (!apiKey) {
        return {
            text: '您还没有设置DeepSeek API Key，请点击左侧上方的机器人图标进行设置。',
            error: true
        }
    }

    try {
        // 添加用户消息到历史记录
        chatHistory.push({
            role: 'user',
            content: message
        })

        // 调用API (使用最近10条消息避免超出token限制)
        const recentMessages = chatHistory.slice(-10)
        const response = await callDeepSeekAPI(apiKey, recentMessages, modelId)

        // 获取模型配置
        const model = MODELS[modelId] || MODELS['deepseek-v3'];

        // 添加AI回复到历史记录
        chatHistory.push({
            role: 'assistant',
            content: response.text
        })

        // 返回结果
        return {
            text: response.text,
            thinking: response.reasoningContent,
            modelName: model.name,
            error: false
        }
    } catch (error) {
        console.error('获取AI回复失败:', error)

        // API调用失败的错误处理
        return {
            text: `调用DeepSeek API失败: ${error.message}。请检查您的API Key是否正确或网络连接是否正常。`,
            error: true
        }
    }
}

// 简单的AI回复生成函数 (备用方案)
function generateLocalAIResponse(message) {
    // 获取API Key
    const apiKey = configManager.getApiKey()

    // 如果没有设置API Key，提示用户设置
    if (!apiKey) {
        return '您还没有设置DeepSeek API Key，请点击左侧上方的机器人图标进行设置。';
    }

    // 这只是一个简单的演示，当API调用失败时使用
    const responses = [
        '我理解您的问题，让我思考一下...',
        '这是一个有趣的问题！根据我的理解...',
        '我可以帮您解决这个问题。首先...',
        '根据我的信息，您提到的内容...',
        '您好，关于您的问题，我认为...'
    ];

    // 关键词回复
    if (message.includes('你好') || message.includes('hello') || message.includes('hi')) {
        return '你好！我是LobeChat，一个AI助手。有什么我可以帮到您的？';
    }
    if (message.includes('名字') || message.includes('who are you')) {
        return '我叫LobeChat，是一个基于人工智能的聊天助手，很高兴认识您！';
    }
    if (message.includes('时间') || message.includes('几点')) {
        return `现在的时间是${new Date().toLocaleTimeString()}`;
    }
    if (message.includes('谢谢') || message.includes('感谢')) {
        return '不客气，很高兴能帮到您！';
    }
    if (message.includes('api') || message.includes('key') || message.includes('deepseek')) {
        return `您的DeepSeek API Key已设置，密钥以"${apiKey.substring(0, 5)}..."开头。您可以随时在设置中更改。`;
    }

    // 随机回复
    return responses[Math.floor(Math.random() * responses.length)] + ' 这是一个AI聊天应用的演示，当API调用失败时使用的备用回复。';
}

// 重置聊天历史
function resetChatHistory() {
    // 基础系统消息
    const baseSystemMessage = '你是DeepSeek AI助手，一个由DeepSeek开发的人工智能助手。你会友好、礼貌地回答用户的问题，并尽可能提供帮助。';
    
    // 为推理模型添加特定指令
    const reasoningSystemMessage = baseSystemMessage + ' 请在回答前先进行思考，在reasoning_content中详细写出你的思考过程，然后在content中给出简明扼要的回答。';
    
    // 根据当前模型设置系统消息
    const systemMessage = currentModel === 'deepseek-r1' ? reasoningSystemMessage : baseSystemMessage;
    
    chatHistory = [
        {
            role: 'system',
            content: systemMessage
        }
    ]
}

// 初始化聊天历史
resetChatHistory()

// 初始化加载保存的模型选择
function initializeModelSelection() {
    // 从配置中获取已保存的模型
    const savedModel = configManager.getSelectedModel();
    if (savedModel && MODELS[savedModel]) {
        currentModel = savedModel;
    }
    console.log(`已加载模型选择: ${MODELS[currentModel].name}`);
}

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'AI Chat',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true, // 自动隐藏菜单栏
        icon: path.join(__dirname, 'assets/icon.png') // 设置应用图标
    })

    // 移除菜单栏
    mainWindow.removeMenu()

    // and load the index.html of the app.
    mainWindow.loadFile('index.html')

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // When the window is closed
    mainWindow.on('closed', function () {
        // Dereference the window object, if your app supports multiple windows,
        // you should delete the corresponding element from your array of windows.
        mainWindow = null
    })
}

// IPC通信处理
ipcMain.on('send-message', async (event, message) => {
    console.log('收到用户消息:', message);

    if (mainWindow) {
        try {
            // 调用DeepSeek API获取回复
            const response = await getAIResponseFromDeepSeek(message, currentModel);

            mainWindow.webContents.send('receive-message', {
                text: response.text,
                thinking: response.thinking,
                modelName: response.modelName,
                timestamp: Date.now(),
                error: response.error
            });
        } catch (error) {
            console.error('处理消息失败:', error);

            // 如果调用API失败，使用本地回复
            const fallbackResponse = generateLocalAIResponse(message);
            mainWindow.webContents.send('receive-message', {
                text: fallbackResponse,
                timestamp: Date.now(),
                error: true
            });
        }
    }
})

// 处理新建聊天的请求
ipcMain.on('new-chat', () => {
    resetChatHistory();
    console.log('已重置聊天历史');
})

// 处理保存API Key的请求
ipcMain.handle('save-api-key', async (event, apiKey) => {
    console.log('保存API Key:', apiKey.substring(0, 5) + '...');
    const success = configManager.saveApiKey(apiKey);
    return success;
})

// 处理获取API Key的请求
ipcMain.handle('get-api-key', async () => {
    const apiKey = configManager.getApiKey();
    return apiKey;
})

// 处理获取可用模型列表
ipcMain.handle('get-available-models', () => {
    return Object.keys(MODELS).map(id => ({
        id,
        name: MODELS[id].name,
        description: MODELS[id].description
    }));
})

// 处理获取当前选择的模型
ipcMain.handle('get-current-model', () => {
    return {
        id: currentModel,
        name: MODELS[currentModel].name,
        description: MODELS[currentModel].description
    };
})

// 处理切换模型的请求
ipcMain.handle('switch-model', async (event, modelId) => {
    // 确保模型存在
    if (MODELS[modelId]) {
        // 更新当前模型
        currentModel = modelId;

        // 保存选择
        configManager.saveSelectedModel(modelId);
        
        // 重置聊天历史，以使用新模型的系统提示
        resetChatHistory();

        console.log(`已切换到模型: ${MODELS[modelId].name}`);

        return {
            id: modelId,
            name: MODELS[modelId].name,
            description: MODELS[modelId].description
        };
    } else {
        throw new Error('无效的模型ID');
    }
})

// Handle request for getting app version
ipcMain.handle('get-app-version', () => {
    return app.getVersion()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    // 初始化模型选择
    initializeModelSelection();

    createWindow()

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// 处理流式响应
async function handleStreamResponse(response, event) {
    try {
        const reader = response.body.getReader();
        let accumulatedData = '';
        let isThinking = true;  // 默认先处理思考过程

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                break;
            }

            // 将 Uint8Array 转换为字符串
            const chunk = new TextDecoder().decode(value);
            accumulatedData += chunk;

            // 检查是否包含特定标记
            if (accumulatedData.includes('content') && isThinking) {
                isThinking = false;
                accumulatedData = '';  // 清空累积的数据，开始新的内容部分
                continue;
            }

            // 发送消息块到渲染进程
            event.reply('stream-chunk', {
                chunk: chunk,
                isThinking: isThinking
            });
        }

        // 流式响应结束
        event.reply('stream-end');

    } catch (error) {
        console.error('处理流式响应时出错:', error);
        event.reply('stream-error', { error: error.message });
    }
}

// 处理API请求
async function handleApiRequest(prompt, apiKey, modelConfig, event) {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelConfig.model,
                messages: [{ role: "user", content: prompt }],
                stream: true,
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        // 开始流式响应
        event.reply('stream-start', {
            messageId: Date.now(),
            modelName: modelConfig.name
        });

        const reader = response.body.getReader();
        let accumulatedData = '';
        let isThinking = true;

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                break;
            }

            // 将 Uint8Array 转换为字符串
            const chunk = new TextDecoder().decode(value);
            
            // 处理数据块
            if (chunk.includes('content') && isThinking) {
                isThinking = false;
                // 发送最后的思考内容
                if (accumulatedData.trim()) {
                    event.reply('stream-chunk', {
                        chunk: accumulatedData.replace(/reasoning_content|content/g, '').trim(),
                        isThinking: true
                    });
                }
                accumulatedData = '';
                continue;
            }

            accumulatedData += chunk;

            // 发送处理后的数据块
            const cleanedChunk = chunk.replace(/reasoning_content|content/g, '').trim();
            if (cleanedChunk) {
                event.reply('stream-chunk', {
                    chunk: cleanedChunk,
                    isThinking: isThinking
                });
            }
        }

        // 发送最后一块数据（如果有的话）
        if (accumulatedData.trim()) {
            event.reply('stream-chunk', {
                chunk: accumulatedData.replace(/reasoning_content|content/g, '').trim(),
                isThinking: false
            });
        }

        // 流式响应结束
        event.reply('stream-end');

    } catch (error) {
        console.error('API请求失败:', error);
        event.reply('stream-error', { error: error.message });
    }
}
