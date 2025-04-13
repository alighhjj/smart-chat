/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

// 创建模型选择器组件
const ModelSelector = ({ models, currentModel, onModelChange }) => {
    return React.createElement('div', { className: 'model-selector-container' },
        React.createElement('div', { className: 'model-selector' },
            models.map(model =>
                React.createElement('div', {
                    key: model.id,
                    className: `model-option ${model.id === currentModel.id ? 'active' : ''}`,
                    onClick: () => onModelChange(model.id)
                }, model.name)
            )
        ),
        React.createElement('div', { className: 'model-info' },
            currentModel && `当前模型: ${currentModel.name}`,
            React.createElement('span', {
                className: 'model-tooltip',
                'data-tooltip': currentModel ? currentModel.description : ''
            }, '❓')
        )
    );
};

// 创建思考步骤组件
const ThinkingSection = ({ thinking }) => {
    if (!thinking) return null;

    return React.createElement('div', { className: 'thinking-section' },
        React.createElement('div', { className: 'thinking-section-title' },
            '思考过程'
        ),
        React.createElement('div', { className: 'thinking-content' },
            thinking
        )
    );
};

// 创建API Key设置弹窗组件
const ApiKeyModal = ({ isOpen, onClose, onSave }) => {
    const [apiKey, setApiKey] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');

    // 加载已保存的API Key
    React.useEffect(() => {
        if (isOpen && window.electronAPI) {
            setIsSaving(true);
            window.electronAPI.getApiKey()
                .then(savedKey => {
                    if (savedKey) {
                        setApiKey(savedKey);
                    }
                    setIsSaving(false);
                })
                .catch(err => {
                    console.error('获取API Key失败:', err);
                    setIsSaving(false);
                });
        }
    }, [isOpen]);

    // 处理API Key修改
    const handleApiKeyChange = (e) => {
        setApiKey(e.target.value);
        setError('');
        setSuccess('');
    };

    // 保存API Key
    const handleSave = () => {
        if (!apiKey.trim()) {
            setError('API Key不能为空');
            return;
        }

        setIsSaving(true);
        window.electronAPI.saveApiKey(apiKey)
            .then(() => {
                setSuccess('API Key保存成功！');
                setIsSaving(false);
                if (onSave) onSave(apiKey);

                // 2秒后自动关闭
                setTimeout(() => {
                    onClose();
                    setSuccess('');
                }, 2000);
            })
            .catch(err => {
                console.error('保存API Key失败:', err);
                setError('保存失败，请重试');
                setIsSaving(false);
            });
    };

    // 如果弹窗未打开，不渲染任何内容
    if (!isOpen) return null;

    return React.createElement('div', { className: 'modal-overlay' },
        React.createElement('div', { className: 'modal-container' },
            React.createElement('div', { className: 'modal-header' },
                React.createElement('h2', null, 'DeepSeek API设置'),
                React.createElement('button', {
                    className: 'modal-close-btn',
                    onClick: onClose
                }, '×')
            ),
            React.createElement('div', { className: 'modal-body' },
                React.createElement('p', { className: 'modal-description' },
                    '请输入您的DeepSeek API Key，用于连接AI服务。您的API Key将被安全地存储在本地。'
                ),
                React.createElement('div', { className: 'input-group' },
                    React.createElement('label', { htmlFor: 'api-key' }, 'API Key'),
                    React.createElement('input', {
                        id: 'api-key',
                        type: 'password',
                        className: 'api-key-input',
                        value: apiKey,
                        onChange: handleApiKeyChange,
                        placeholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx',
                        disabled: isSaving
                    })
                ),
                error && React.createElement('p', { className: 'error-message' }, error),
                success && React.createElement('p', { className: 'success-message' }, success)
            ),
            React.createElement('div', { className: 'modal-footer' },
                React.createElement('button', {
                    className: 'modal-cancel-btn',
                    onClick: onClose,
                    disabled: isSaving
                }, '取消'),
                React.createElement('button', {
                    className: 'modal-save-btn',
                    onClick: handleSave,
                    disabled: isSaving
                }, isSaving ? '保存中...' : '保存')
            )
        )
    );
};

// 创建App组件
const App = () => {
    const [messages, setMessages] = React.useState([
        { id: 1, text: '👋 晚上好', sender: 'bot' },
        { id: 2, text: '我是您的私人智能助理 LobeChat，请问现在能帮您做什么？', sender: 'bot' }
    ]);
    const [inputValue, setInputValue] = React.useState('');
    const [isTyping, setIsTyping] = React.useState(false);
    const messagesEndRef = React.useRef(null);
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = React.useState(false);
    const [currentApiKey, setCurrentApiKey] = React.useState('');
    const [availableModels, setAvailableModels] = React.useState([]);
    const [currentModel, setCurrentModel] = React.useState(null);

    // 加载可用模型和当前选择的模型
    React.useEffect(() => {
        if (window.electronAPI) {
            // 获取可用模型
            window.electronAPI.getAvailableModels()
                .then(models => {
                    setAvailableModels(models);
                })
                .catch(err => {
                    console.error('获取可用模型失败:', err);
                });

            // 获取当前选择的模型
            window.electronAPI.getCurrentModel()
                .then(model => {
                    setCurrentModel(model);
                })
                .catch(err => {
                    console.error('获取当前模型失败:', err);
                });
        }
    }, []);

    // 切换模型
    const handleModelChange = (modelId) => {
        if (window.electronAPI && modelId) {
            setIsTyping(true);

            window.electronAPI.switchModel(modelId)
                .then(newModel => {
                    setCurrentModel(newModel);
                    setIsTyping(false);

                    // 提示用户模型已切换
                    const botResponse = {
                        id: Date.now(),
                        text: `已切换到 ${newModel.name} 模型。${newModel.description}`,
                        sender: 'bot'
                    };
                    setMessages(prevMessages => [...prevMessages, botResponse]);
                })
                .catch(err => {
                    console.error('切换模型失败:', err);
                    setIsTyping(false);
                });
        }
    };

    // 打开API Key设置弹窗
    const openApiKeyModal = () => {
        setIsApiKeyModalOpen(true);
    };

    // 关闭API Key设置弹窗
    const closeApiKeyModal = () => {
        setIsApiKeyModalOpen(false);
    };

    // 保存API Key成功后的回调
    const handleApiKeySaved = (key) => {
        setCurrentApiKey(key);
        // 通知用户API Key已设置成功
        const botResponse = {
            id: Date.now(),
            text: 'DeepSeek API Key设置成功！现在您可以开始使用AI服务了。',
            sender: 'bot'
        };
        setMessages(prevMessages => [...prevMessages, botResponse]);
    };

    // 自动滚动到最新消息
    React.useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // 接收主进程消息
    React.useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.receiveMessage((response) => {
                setIsTyping(false);
                const botResponse = {
                    id: Date.now(),
                    text: response.text,
                    thinking: response.thinking,
                    modelName: response.modelName,
                    sender: 'bot',
                    error: response.error
                };
                setMessages(prevMessages => [...prevMessages, botResponse]);
            });
        }
    }, []);

    // 检查是否有保存的API Key
    React.useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.getApiKey()
                .then(savedKey => {
                    if (savedKey) {
                        setCurrentApiKey(savedKey);
                    }
                })
                .catch(err => {
                    console.error('获取API Key失败:', err);
                });
        }
    }, []);

    // 发送消息处理函数
    const handleSendMessage = () => {
        if (inputValue.trim() === '') return;

        // 添加用户消息
        const newUserMessage = {
            id: Date.now(),
            text: inputValue,
            sender: 'user'
        };

        // 更新消息列表
        setMessages([...messages, newUserMessage]);

        // 清空输入框
        setInputValue('');

        // 显示输入中状态
        setIsTyping(true);

        // 发送消息到主进程
        if (window.electronAPI) {
            window.electronAPI.sendMessage(inputValue);
        } else {
            // 模拟AI响应（本地测试用）
            setTimeout(() => {
                setIsTyping(false);
                const botResponse = {
                    id: Date.now() + 1,
                    text: '我是一个简单的AI助手Demo，目前还不能真正回答问题，但未来会连接到真实的AI服务。',
                    sender: 'bot'
                };
                setMessages(prevMessages => [...prevMessages, botResponse]);
            }, 1500);
        }
    };

    // 处理输入变化
    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    // 处理按键事件
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // 创建新对话
    const handleNewChat = () => {
        // 重置消息列表
        setMessages([
            { id: Date.now(), text: '👋 晚上好', sender: 'bot' },
            { id: Date.now() + 1, text: '我是您的私人智能助理 LobeChat，请问现在能帮您做什么？', sender: 'bot' }
        ]);

        // 通知主进程重置聊天历史
        if (window.electronAPI) {
            window.electronAPI.newChat();
        }
    };

    // 渲染单个消息
    const renderMessage = (message) => {
        return React.createElement('div', {
            key: message.id,
            className: `message ${message.sender === 'user' ? 'user-message' : 'bot-message'}${message.error ? ' error-message' : ''}`
        },
            // 如果是机器人回复且有思考步骤，则先显示思考步骤
            message.sender === 'bot' && message.thinking &&
            React.createElement(ThinkingSection, { thinking: message.thinking }),
            // 然后显示消息内容
            message.text
        );
    };

    return React.createElement('div', { className: 'app-container' },
        // API Key设置弹窗
        React.createElement(ApiKeyModal, {
            isOpen: isApiKeyModalOpen,
            onClose: closeApiKeyModal,
            onSave: handleApiKeySaved
        }),

        // 侧边栏
        React.createElement('div', { className: 'sidebar' },
            React.createElement('div', {
                className: 'sidebar-icon' + (currentApiKey ? ' has-api-key' : ''),
                onClick: openApiKeyModal,
                title: '设置DeepSeek API Key'
            }, '🤖'),
            React.createElement('div', { className: 'sidebar-icon' }, '📋'),
            React.createElement('div', { className: 'sidebar-icon' }, '⚙️')
        ),

        // 聊天列表
        React.createElement('div', { className: 'chat-list' },
            React.createElement('div', { className: 'chat-header' },
                React.createElement('h2', null, '随便聊聊'),
                React.createElement('button', {
                    style: {
                        border: 'none',
                        background: 'none',
                        fontSize: '24px',
                        cursor: 'pointer'
                    },
                    onClick: handleNewChat
                }, '+')
            ),
            React.createElement('div', { className: 'chat-item active' }, '新对话')
        ),

        // 主聊天区域
        React.createElement('div', { className: 'chat-container' },
            // 消息区域
            React.createElement('div', { className: 'chat-messages' },
                messages.map(message => renderMessage(message)),
                isTyping && React.createElement('div', { className: 'message bot-message' }, '正在输入...'),
                React.createElement('div', { ref: messagesEndRef }) // 用于自动滚动
            ),

            // 输入区域
            React.createElement('div', { className: 'input-container' },
                // 模型选择器
                availableModels.length > 0 && currentModel &&
                React.createElement(ModelSelector, {
                    models: availableModels,
                    currentModel: currentModel,
                    onModelChange: handleModelChange
                }),

                React.createElement('div', { className: 'input-section' },
                    React.createElement('textarea', {
                        className: 'message-input',
                        value: inputValue,
                        onChange: handleInputChange,
                        onKeyPress: handleKeyPress,
                        placeholder: '输入聊天内容...',
                        disabled: isTyping
                    }),
                    React.createElement('button', {
                        className: 'send-button',
                        onClick: handleSendMessage,
                        disabled: isTyping || inputValue.trim() === ''
                    }, '发送')
                )
            )
        )
    );
};

// 渲染React应用
const domContainer = document.getElementById('root');
ReactDOM.render(React.createElement(App), domContainer);

// 流式消息处理
let currentStreamingMessage = null;
let currentStreamingContent = '';
let currentStreamingThinking = '';

// 开始新的流式消息
ipcRenderer.on('stream-start', (event, { messageId, modelName }) => {
    const messagesContainer = document.querySelector('.chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message streaming-message';
    messageDiv.setAttribute('data-message-id', messageId);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    currentStreamingMessage = messageDiv;
    currentStreamingContent = '';
    currentStreamingThinking = '';

    // 滚动到底部
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

// 接收流式消息块
ipcRenderer.on('stream-chunk', (event, { chunk, isThinking }) => {
    if (!currentStreamingMessage) return;

    const contentDiv = currentStreamingMessage.querySelector('.message-content');

    if (isThinking) {
        currentStreamingThinking += chunk;

        // 更新思考过程显示
        let thinkingSection = currentStreamingMessage.querySelector('.thinking-section');
        if (!thinkingSection) {
            thinkingSection = document.createElement('div');
            thinkingSection.className = 'thinking-section';
            currentStreamingMessage.appendChild(thinkingSection);
        }
        thinkingSection.innerHTML = marked.parse(currentStreamingThinking);
    } else {
        currentStreamingContent += chunk;
        contentDiv.innerHTML = marked.parse(currentStreamingContent);
    }

    // 处理代码块高亮
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });

    // 滚动到底部
    document.querySelector('.chat-messages').scrollTop = document.querySelector('.chat-messages').scrollHeight;
});

// 流式消息结束
ipcRenderer.on('stream-end', () => {
    if (currentStreamingMessage) {
        currentStreamingMessage.classList.remove('streaming-message');
        currentStreamingMessage = null;
        currentStreamingContent = '';
        currentStreamingThinking = '';
    }
});
