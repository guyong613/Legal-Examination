document.addEventListener('DOMContentLoaded', function() {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const status = document.getElementById('status');

    // 加载保存的状态
    chrome.storage.local.get(['enabled'], function(result) {
        toggleSwitch.checked = result.enabled || false;
        status.textContent = toggleSwitch.checked ? '已启用' : '已禁用';
    });

    // 监听开关变化
    toggleSwitch.addEventListener('change', function() {
        const enabled = toggleSwitch.checked;
        status.textContent = enabled ? '已启用' : '已禁用';
        
        // 保存状态
        chrome.storage.local.set({enabled: enabled});

        // 向当前标签页发送消息
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'toggleCopy',
                enabled: enabled
            });
        });
    });
}); 