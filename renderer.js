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
        React.createElement('select', {
            className: 'model-selector',
            onChange: (e) => onModelChange(e.target.value)
        },
        models.map(model =>
            React.createElement('option', {
                key: model.id,
                value: model.id,
                className: model.id === currentModel.id ? 'active' : ''
            }, model.name)
        )
    ));
}

// 创建思考步骤组件
const ThinkingSection = ({ thinking }) => {
    if (!thinking) return null;

    return React.createElement('div', { className: 'thinking-section' },
        React.createElement('div', { className: 'thinking-section-title' },
            '思考过程'
        ),
        React.createElement('div', {
            className: 'thinking-content',
            dangerouslySetInnerHTML: { __html: marked.parse(thinking) }
        })
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

// 创建动态加载指示器组件
const TypingIndicator = () => {
    return React.createElement('div', { className: 'typing-indicator' },
        React.createElement('span', null),
        React.createElement('span', null),
        React.createElement('span', null)
    );
};

// 创建消息组件
const Message = ({ message }) => {
    const [isReasoningExpanded, setIsReasoningExpanded] = React.useState(true);
    const { text, sender, thinking, error, isStreaming } = message;

    // 当开始显示答案时自动折叠推理过程
    React.useEffect(() => {
        if (text && thinking) {
            setIsReasoningExpanded(false);
        }
    }, [text]);

    if (sender === 'user') {
        return React.createElement('div', { className: 'message user-message' },
            React.createElement('div', { className: 'message-content' }, text)
        );
    }

    const messageClass = `message ${sender === 'bot' ? 'bot-message' : 'user-message'} ${error ? 'error-message' : ''}`;

    return React.createElement('div', { className: 'message-wrapper' },
        thinking && React.createElement('div', { className: 'thinking-section' },
            React.createElement('div', {
                className: 'thinking-section-title',
                onClick: () => setIsReasoningExpanded(!isReasoningExpanded),
                style: { cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
            },
                React.createElement('span', null, '思考过程'),
                React.createElement('span', { className: 'toggle-icon' },
                    isReasoningExpanded ? '▼' : '▶'
                )
            ),
            isReasoningExpanded && React.createElement('div', {
                className: 'thinking-content',
                dangerouslySetInnerHTML: { __html: marked.parse(thinking) }
            })
        ),
        text && React.createElement('div', {
            className: messageClass,
            dangerouslySetInnerHTML: { __html: marked.parse(text) }
        })
    );
};

// 创建固定菜单栏组件
const FixedSidebar = ({ onOpenApiKey, hasApiKey }) => {
    return React.createElement('div', { className: 'fixed-sidebar' },
        React.createElement('div', {
            className: `sidebar-icon ${hasApiKey ? 'has-api-key' : ''}`,
            onClick: onOpenApiKey,
            title: '设置 API Key'
        }, '🤖'),
        React.createElement('div', {
            className: 'sidebar-icon',
            title: '聊天记录'
        }, '📋'),
        React.createElement('div', {
            className: 'sidebar-icon',
            title: '设置'
        }, '⚙️')
    );
};

// 创建聊天列表栏组件
const ChatSidebar = ({ onNewChat, isSidebarCollapsed, onToggleSidebar }) => {
    return React.createElement('div', { className: `chat-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}` },
        React.createElement('div', { className: 'chat-sidebar-header' },
            React.createElement('h1', { className: 'app-title' }, 'AI Chat'),
            React.createElement('button', {
                className: 'toggle-sidebar',
                onClick: onToggleSidebar,
                title: isSidebarCollapsed ? '展开' : '收起'
            }, isSidebarCollapsed ? '→' : '←')
        ),
        React.createElement('div', { className: 'chat-list' },
            // 这里可以添加聊天列表项
        ),
        React.createElement('div', { className: 'new-chat-button-container' },
            React.createElement('button', {
                className: 'new-chat-button',
                onClick: onNewChat,
                title: '新建对话'
            },
                React.createElement('span', { className: 'plus-icon' }, '+'),
                !isSidebarCollapsed && React.createElement('span', null, '新建对话')
            )
        )
    );
};

// 创建App组件
const App = () => {
    const [messages, setMessages] = React.useState([]);
    const [inputValue, setInputValue] = React.useState('');
    const [isTyping, setIsTyping] = React.useState(false);
    const messagesEndRef = React.useRef(null);
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = React.useState(false);
    const [currentApiKey, setCurrentApiKey] = React.useState('');
    const [availableModels, setAvailableModels] = React.useState([]);
    const [currentModel, setCurrentModel] = React.useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

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

    // 监听接收消息事件
    React.useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.receiveMessage((response) => {
                setIsTyping(false);

                if (response.isStreaming) {
                    // 处理流式响应
                    setMessages(prevMessages => {
                        const lastMessage = prevMessages[prevMessages.length - 1];
                        if (lastMessage && lastMessage.isStreaming) {
                            // 创建消息的副本
                            const updatedMessage = { ...lastMessage };

                            // 累积内容而不是替换
                            if (response.text) {
                                updatedMessage.text = (updatedMessage.text || '') + response.text;
                            }
                            if (response.reasoningContent) {
                                updatedMessage.thinking = (updatedMessage.thinking || '') + response.reasoningContent;
                            }

                            if (response.isEnd) {
                                updatedMessage.isStreaming = false;
                            }

                            // 返回更新后的消息数组
                            const updatedMessages = [...prevMessages];
                            updatedMessages[updatedMessages.length - 1] = updatedMessage;
                            return updatedMessages;
                        } else if (!response.isEnd) {
                            // 创建新的流式消息
                            return [...prevMessages, {
                                id: Date.now(),
                                text: response.text || '',
                                thinking: response.reasoningContent || '',
                                modelName: response.modelName,
                                sender: 'bot',
                                error: response.error,
                                isStreaming: true
                            }];
                        }
                        return prevMessages;
                    });
                } else {
                    // 处理非流式响应
                    if (response.text || response.reasoningContent) {
                        const botResponse = {
                            id: Date.now(),
                            text: response.text || '',
                            thinking: response.reasoningContent || '',
                            modelName: response.modelName,
                            sender: 'bot',
                            error: response.error
                        };
                        setMessages(prevMessages => [...prevMessages, botResponse]);
                    }
                }
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

    // 处理发送消息
    const handleSendMessage = () => {
        if (!inputValue.trim()) return;

        // 添加用户消息
        const userMessage = {
            id: Date.now(),
            text: inputValue,
            sender: 'user'
        };
        setMessages(prevMessages => [...prevMessages, userMessage]);
        setInputValue('');
        setIsTyping(true);

        // 发送消息到主进程
        window.electronAPI.sendMessage(inputValue)
            .catch(err => {
                console.error('发送消息失败:', err);
                setIsTyping(false);
            });
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

    // 处理侧边栏收缩/展开
    const handleToggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    // 处理新建对话
    const handleNewChat = () => {
        if (window.electronAPI) {
            window.electronAPI.newChat();
            setMessages([]);
            setInputValue('');
        }
    };

    return React.createElement('div', { className: 'app-container' },
        // 固定菜单栏
        React.createElement(FixedSidebar, {
            onOpenApiKey: openApiKeyModal,
            hasApiKey: !!currentApiKey
        }),

        // 聊天列表栏
        React.createElement(ChatSidebar, {
            onNewChat: handleNewChat,
            isSidebarCollapsed: isSidebarCollapsed,
            onToggleSidebar: handleToggleSidebar
        }),

        // 主聊天区域
        React.createElement('div', { className: 'chat-area' },
            React.createElement('div', { className: 'chat-container' },
                React.createElement('div', { className: 'chat-messages', ref: messagesEndRef },
                    messages.map(message =>
                        React.createElement(Message, {
                            key: message.id,
                            message
                        })
                    ),
                    // isTyping && React.createElement(TypingIndicator),
                    React.createElement('div', { ref: messagesEndRef })
                )
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
                    placeholder: '输入聊天内容，按 Enter 发送...',
                    disabled: isTyping
                })
            )
        ),
        
        // API Key设置弹窗 - 移到App根节点下
        React.createElement(ApiKeyModal, {
            isOpen: isApiKeyModalOpen,
            onClose: closeApiKeyModal,
            onSave: handleApiKeySaved
        })
    )
);
};
// 渲染App组件
ReactDOM.render(React.createElement(App, null), document.getElementById('root'));