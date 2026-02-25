const fs = require('fs');
const path = require('path');

// 22x22 透明 PNG，带简单日历轮廓（黑色）
const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAAPklEQVQ4T2NkYGD4z0ABYBzVMKphQDQwqoFRDYxqYFQDoxoY1cCoBkY1MKqBUQ2MamBUA6MaGNXAwBoAAGmAAb0Q2Lg4AAAAAElFTkSuQmCC';

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
const iconPath = path.join(assetsDir, 'icon.png');
fs.writeFileSync(iconPath, Buffer.from(iconBase64, 'base64'));
console.log('Created icon at', iconPath);
