# AI Chat 应用组件树结构

```
App (app-container)
├── ApiKeyModal (modal-overlay)
│   └── modal-container
│       ├── modal-header
│       │   ├── h2 (标题)
│       │   └── modal-close-btn (关闭按钮)
│       ├── modal-body
│       │   ├── modal-description (描述文本)
│       │   ├── input-group
│       │   │   ├── label (API Key标签)
│       │   │   └── api-key-input (输入框)
│       │   ├── error-message (错误信息)
│       │   └── success-message (成功信息)
│       └── modal-footer
│           ├── modal-cancel-btn (取消按钮)
│           └── modal-save-btn (保存按钮)
├── FixedSidebar (fixed-sidebar)
│   ├── sidebar-icon (API Key设置)
│   ├── sidebar-icon (聊天记录)
│   └── sidebar-icon (设置)
├── ChatSidebar (chat-sidebar)
│   ├── chat-sidebar-header
│   │   ├── app-title (应用标题)
│   │   └── toggle-sidebar (切换侧边栏按钮)
│   ├── chat-list (聊天列表)
│   └── new-chat-button-container
│       └── new-chat-button (新建对话按钮)
│           ├── plus-icon (+图标)
│           └── span (新建对话文本)
├── chat-area
│   ├── chat-container
│   │   └── chat-messages (消息列表区域)
│   │       ├── Message (message-wrapper)
│   │       │   ├── thinking-section (思考过程区域)
│   │       │   │   ├── thinking-section-title (标题)
│   │       │   │   │   ├── span (思考过程文本)
│   │       │   │   │   └── toggle-icon (展开/折叠图标)
│   │       │   │   └── thinking-content (思考内容)
│   │       │   └── message (bot-message/user-message)
│   │       │       └── message-content (用户消息内容)
│   │       └── div (用于自动滚动的引用元素)
│   └── input-container (输入区域)
│       ├── ModelSelector (model-selector-container)
│       │   └── select (model-selector)
│       │       └── option (模型选项)
│       └── input-section
│           └── textarea (message-input)
```

## 组件层次说明

1. **App** - 应用的根容器，包含所有其他组件
   - 使用Flex布局，占满整个视口

2. **FixedSidebar** - 固定在左侧的图标菜单栏
   - 包含设置API Key、聊天记录和设置等功能图标
   - API Key图标在设置后会显示绿色指示点

3. **ChatSidebar** - 聊天列表侧边栏
   - 可折叠/展开
   - 包含应用标题、聊天列表和新建对话按钮

4. **chat-area** - 主要聊天区域容器
   - 包含聊天内容和输入区域
   - 使用Flex布局，方向为列

5. **chat-container** - 聊天内容容器
   - 包含消息列表
   - 使用Grid布局

6. **Message** - 消息组件
   - 根据sender属性区分用户消息和机器人消息
   - 机器人消息可能包含思考过程部分
   - 思考过程可折叠/展开

7. **ApiKeyModal** - API Key设置弹窗 (App的直接子组件)
   - 条件渲染：只在isOpen为true时显示
   - 包含标题、描述、输入框和操作按钮

8. **ModelSelector** - 模型选择器
   - 条件渲染：只在有可用模型且已选择当前模型时显示
   - 使用select元素显示可选的AI模型列表

9. **TypingIndicator** - 输入指示器
   - 显示机器人正在输入的动态效果
   - 包含三个动画点

10. **ThinkingSection** - 思考过程组件
    - 独立组件，用于显示AI的思考过程
    - 在Message组件中使用