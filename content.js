let isEnabled = false;
let answerDiv = null; // 用于存储答案显示div的引用
let jsonAnswer;

// 添加加载JSON文件的函数
async function loadJsonAnswer() {
    try {
        const jsonUrl = chrome.runtime.getURL('converted.json');
        const response = await fetch(jsonUrl);
        jsonAnswer = await response.json();
        console.log('JSON答案加载成功');
    } catch (error) {
        console.error('加载JSON答案失败:', error);
    }
}

// 在文件开头添加答案内容

const ALL_ANSWERS = ``;
// 主要功能代码
function enableDebugAndCopy() {
    console.log('enableDebugAndCopy called');
    
    // 1. 添加样式
    const style = document.createElement('style');
    style.id = 'enable-selection-style';
    style.textContent = `
        * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: default !important;
            pointer-events: auto !important;
        }
        
        [unselectable="on"] {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }

        .block-header,
        .block-title,
        .block-content,
        .block,
        .block * {
            user-select: text !important;
            -webkit-user-select: text !important;
            pointer-events: auto !important;
        }
    `;
    document.head.appendChild(style);

    // 2. 使用 MutationObserver 监视 DOM 变化
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // 元素节点
                        removeEventListeners(node);
                        enableSelection(node);
                    }
                });
            }
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // 3. 移除事件监听器的函数
    function removeEventListeners(element) {
        const events = ['contextmenu', 'selectstart', 'copy', 'cut', 'paste', 'keydown', 'mousedown'];
        events.forEach(event => {
            element[`on${event}`] = null;
        });
    }

    // 4. 启用选择的函数
    function enableSelection(element) {
        element.style.userSelect = 'text';
        element.style.webkitUserSelect = 'text';
        element.setAttribute('unselectable', 'off');
    }

    // 5. 处理所有现有元素
    document.querySelectorAll('*').forEach(el => {
        removeEventListeners(el);
        enableSelection(el);
    });

    // 6. 修改事监听器部分
    document.addEventListener('contextmenu', function(e) {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            e.preventDefault(); // 阻止默认右键菜单
            e.stopPropagation();
            showCustomContextMenu(e.clientX, e.clientY, selectedText);
        } else {
            e.stopPropagation(); // 保持原有功能
        }
    }, true);

    document.addEventListener('selectstart', e => e.stopPropagation(), true);
    document.addEventListener('copy', e => e.stopPropagation(), true);
    document.addEventListener('cut', e => e.stopPropagation(), true);
    document.addEventListener('paste', e => e.stopPropagation(), true);
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey && e.key === 'c') || e.key === 'F12') {
            e.stopPropagation();
        }
        // 修改Ctrl+E快捷键支持，使用与右键菜单相同的showAnswer函数
        if (e.ctrlKey && e.key.toLowerCase() === 'q') {
            e.preventDefault(); // 阻止默认行为
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                showAnswer(selectedText); // 使用showAnswer而不是showOriginalAnswer
            }
        }
    }, true);

    // 7. 定期检查
    window._checkInterval = setInterval(() => {
        document.querySelectorAll('*').forEach(el => {
            removeEventListeners(el);
            enableSelection(el);
        });
    }, 500);

    // 点击其他地方时隐藏自定义菜单
    document.addEventListener('click', function(e) {
        const contextMenu = document.getElementById('customContextMenu');
        if (contextMenu) {
            contextMenu.remove();
        }
    });
}

// 禁用功能
function disableDebugAndCopy() {
    const style = document.getElementById('enable-selection-style');
    if (style) {
        style.remove();
    }
    if (window._checkInterval) {
        clearInterval(window._checkInterval);
    }

    // 移除答案div
    if (answerDiv) {
        answerDiv.remove();
        answerDiv = null;
    }
}

// 添加以下新函数
function showCustomContextMenu(x, y, selectedText) {
    // 移除已存在的菜单（如果有）
    const existingMenu = document.getElementById('customContextMenu');
    if (existingMenu) {
        existingMenu.remove();
    }

    // 创建自定义菜单
    const menu = document.createElement('div');
    menu.id = 'customContextMenu';
    menu.style.cssText = `
        position: fixed;
        z-index: 10000;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 5px 0;
        box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
        left: ${x}px;
        top: ${y}px;
    `;

    // 创建"显示答案"选项
    const showAnswerOption = document.createElement('div');
    showAnswerOption.textContent = '显示答案';
    showAnswerOption.style.cssText = `
        padding: 5px 20px;
        cursor: pointer;
        background: white;
    `;
    
    // 添加悬停效果
    showAnswerOption.addEventListener('mouseover', () => {
        showAnswerOption.style.backgroundColor = '#f0f0f0';
    });
    showAnswerOption.addEventListener('mouseout', () => {
        showAnswerOption.style.backgroundColor = 'white';
    });
    
    showAnswerOption.addEventListener('click', (e) => {
        e.stopPropagation();
        showAnswer(selectedText);
        menu.remove();
    });

    menu.appendChild(showAnswerOption);
    document.body.appendChild(menu);
}

function showAnswer(text) {
    // 如果已存在答案div，先移除
    if (answerDiv) {
        answerDiv.remove();
    }

    // 从jsonAnswer中查找匹配的内容
    let matchedTexts = [];  // 改为数组存储所有匹配项
    if (jsonAnswer) {
        // 遍历jsonAnswer的所有键值对
        for (const [key, value] of Object.entries(jsonAnswer)) {
            if (value && typeof value === 'string' && value.includes(text)) {
                // 找到匹配项,添加到数组中
                const index = value.indexOf(text);
                const highlightedText = value.substring(0, index) + 
                                      `<span style="color: #ff0000;">${text}</span>` + 
                                      value.substring(index + text.length);
                matchedTexts.push(highlightedText);
            }
        }
    }

    // 如果没找到匹配,显示未找到提示
    let finalContent = matchedTexts.length > 0 
        ? matchedTexts.join('<hr style="border-color: #666; margin: 10px 0;">') // 用分隔线分开每条匹配
        : `未找到匹配内容: <span style="color: #ff0000;">${text}</span>`;

    // 创建新的答案div
    answerDiv = document.createElement('div');
    answerDiv.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: ${window.innerHeight / 3}px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        font-size: 16px;
        z-index: 9999;
        opacity: 0.5;
        transition: opacity 0.3s;
        font-weight: bold;
        overflow-y: auto;
    `;

    // 处理文本,添加颜色高亮
    const processedText = finalContent
        .replace(/答案[:：]/g, '<span style="color: #0000ff;">答案: </span>') 
        .replace(/([ABCDEF]|[√×])/g, '<span style="color: #00ff00;">$1</span>');
    
    answerDiv.innerHTML = processedText;

    // 添加匹配数量显示
    if (matchedTexts.length > 0) {
        const countDiv = document.createElement('div');
        countDiv.style.cssText = `
            position: absolute;
            right: 40px;
            top: 5px;
            color: #0088ff;
            font-size: 14px;
        `;
        countDiv.textContent = `找到 ${matchedTexts.length} 条匹配`;
        answerDiv.appendChild(countDiv);
    }

    // 添加鼠标悬停效果
    answerDiv.addEventListener('mouseover', () => {
        answerDiv.style.opacity = '0.8';
    });
    answerDiv.addEventListener('mouseout', () => {
        answerDiv.style.opacity = '0.5';
    });

    // 添加关闭按钮
    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        position: absolute;
        right: 10px;
        top: 5px;
        cursor: pointer;
        font-size: 20px;
        color: white;
    `;
    closeButton.addEventListener('click', () => {
        answerDiv.remove();
        answerDiv = null;
    });

    answerDiv.appendChild(closeButton);
    document.body.appendChild(answerDiv);
}

// 修改showOriginalAnswer函数以保持一致的样式
function showOriginalAnswer(text) {
    answerDiv = document.createElement('div');
    answerDiv.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: ${window.innerHeight / 3}px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        font-size: 16px;
        z-index: 9999;
        opacity: 0.5;
        transition: opacity 0.3s;
        font-weight: bold;
        overflow-y: auto;
    `;
    
    // 将整个文本用红色显示
    const processedText = matchedText
    .replace(/答案/g, '<span style="color: #0000ff;">答案</span>') // 先将"答案"替换为蓝色
    .replace(/([ABCDEF]|[√×])/g, '<span style="color: #00ff00;">$1</span>'); // 再处理其他需要显示为绿色的字符
    answerDiv.innerHTML = processedText;


    // 添加鼠标悬停效果
    answerDiv.addEventListener('mouseover', () => {
        answerDiv.style.opacity = '0.8';
    });
    answerDiv.addEventListener('mouseout', () => {
        answerDiv.style.opacity = '0.5';
    });

    // 添加关闭按钮
    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        position: absolute;
        right: 10px;
        top: 5px;
        cursor: pointer;
        font-size: 20px;
        color: white;
    `;
    closeButton.addEventListener('click', () => {
        answerDiv.remove();
        answerDiv = null;
    });

    answerDiv.appendChild(closeButton);
    document.body.appendChild(answerDiv);
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received:', request);
    if (request.action === 'toggleCopy') {
        isEnabled = request.enabled;
        console.log('Toggle state:', isEnabled);
        if (isEnabled) {
            enableDebugAndCopy();
        } else {
            disableDebugAndCopy();
        }
    }
});

// 检查初始状态
console.log('Checking initial state...');
loadJsonAnswer(); // 加载JSON文件
chrome.storage.local.get(['enabled'], function(result) {
    isEnabled = result.enabled || false;
    console.log('Initial state:', isEnabled);
    if (isEnabled) {
        enableDebugAndCopy();
    }
});

// 在页面加载完成后再次检查
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
    if (isEnabled) {
        enableDebugAndCopy();
    }
}); 