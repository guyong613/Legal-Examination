document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const convertBtn = document.getElementById('convertBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const previewTable = document.getElementById('previewTable').getElementsByTagName('tbody')[0];
    
    let convertedData = null;

    convertBtn.addEventListener('click', function() {
        const file = fileInput.files[0];
        if (!file) {
            alert('请先选择文件！');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            convertedData = convertToJson(text);
            displayPreview(convertedData);
            downloadBtn.style.display = 'block';
        };
        reader.readAsText(file);
    });

    downloadBtn.addEventListener('click', function() {
        if (!convertedData) return;
        
        const blob = new Blob([JSON.stringify(convertedData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'converted.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    function convertToJson(text) {
        const lines = text.split('\n');
        const result = {};
        let currentKey = null;
        let currentValue = [];
        
        lines.forEach((line) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return; // 跳过空行
            
            // 检查是否以数字开头
            if (/^\d/.test(trimmedLine)) {
                // 如果之前有存储的内容，保存它
                if (currentKey) {
                    result[currentKey] = currentValue.join('<br>');
                }
                // 开始新的条目
                currentKey = `item${Object.keys(result).length + 1}`;
                currentValue = [trimmedLine];
            } else {
                // 如果不是以数字开头，且有当前条目，则附加到当前条目
                if (currentKey) {
                    currentValue.push(trimmedLine);
                } else {
                    // 如果是第一行且不以数字开头，创建第一个条目
                    currentKey = 'item1';
                    currentValue = [trimmedLine];
                }
            }
        });
        
        // 保存最后一个条目
        if (currentKey && currentValue.length > 0) {
            result[currentKey] = currentValue.join('<br>');
        }
        
        return result;
    }

    function displayPreview(data) {
        previewTable.innerHTML = '';
        
        for (const [key, value] of Object.entries(data)) {
            const row = previewTable.insertRow();
            const keyCell = row.insertCell(0);
            const valueCell = row.insertCell(1);
            
            keyCell.textContent = key;
            valueCell.innerHTML = value;
        }
    }
}); 