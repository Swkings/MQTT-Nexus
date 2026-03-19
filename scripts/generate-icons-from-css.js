import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

// 确保目录存在
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// 创建 HTML 模板（完全使用应用的 CSS）
function createHtmlTemplate(size) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${size}px;
      height: ${size}px;
      background: transparent;
    }
    
    .icon-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${size * 0.8}px;
      height: ${size * 0.8}px;
      border-radius: ${size * 0.2}px;
      background: linear-gradient(135deg, #06b6d4 0%, #9333ea 100%);
      box-shadow: 0 ${size * 0.05} ${size * 0.1} rgba(6, 182, 212, 0.3);
    }
    
    .activity-icon {
      width: ${size * 0.5}px;
      height: ${size * 0.5}px;
      color: white;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  </style>
</head>
<body>
  <div class="icon-container">
    <svg class="activity-icon" viewBox="0 0 24 24">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  </div>
</body>
</html>
  `;
}

// 精确绘制 Activity 图标（基于 Lucide React 的 SVG path）
// D: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
function drawActivityPath(ctx, startX, startY, size) {
  const scale = size / 24; // SVG viewBox is 24x24
  
  ctx.beginPath();
  
  // 解析 SVG path 命令
  // M22 12 - 移动到 (22, 12)
  ctx.moveTo(startX + 22 * scale, startY + 12 * scale);
  
  // h-2.48 - 水平向左 2.48
  ctx.lineTo(startX + (22 - 2.48) * scale, startY + 12 * scale);
  
  // a2 2 0 0 0-1.93 1.46 - 圆弧
  ctx.lineTo(startX + (22 - 2.48 - 1.93) * scale, startY + (12 + 1.46) * scale);
  
  // l-2.35 8.36 - 向左下
  ctx.lineTo(startX + (22 - 2.48 - 1.93 - 2.35) * scale, startY + (12 + 1.46 + 8.36) * scale);
  
  // a.25.25 0 0 1-.48 0 - 小圆弧
  ctx.lineTo(startX + (22 - 2.48 - 1.93 - 2.35 - 0.48) * scale, startY + (12 + 1.46 + 8.36) * scale);
  
  // L9.24 2.18 - 直线到
  ctx.lineTo(startX + 9.24 * scale, startY + 2.18 * scale);
  
  // a.25.25 0 0 0-.48 0 - 小圆弧
  ctx.lineTo(startX + (9.24 - 0.48) * scale, startY + 2.18 * scale);
  
  // l-2.35 8.36 - 向左下
  ctx.lineTo(startX + (9.24 - 0.48 - 2.35) * scale, startY + (2.18 + 8.36) * scale);
  
  // A2 2 0 0 1 4.49 12 - 大圆弧
  ctx.lineTo(startX + 4.49 * scale, startY + 12 * scale);
  
  // H2 - 水平到
  ctx.lineTo(startX + 2 * scale, startY + 12 * scale);
  
  ctx.stroke();
}

// 绘制图标（完全匹配 CSS 样式）
function drawIconFromCss(canvas, size) {
  const ctx = canvas.getContext('2d');
  
  // 计算尺寸（基于 App.tsx 的 CSS）
  // w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 shadow-lg shadow-cyan-500/20
  const containerSize = size * 0.8; // 80% 画布大小
  const iconSize = size * 0.6; // 图标占容器的 60% (w-6 h-6 in w-10 h-10)
  const radius = size * 0.15; // rounded-xl
  const padding = (size - containerSize) / 2;
  const iconPadding = (containerSize - iconSize) / 2;
  
  // 1. 绘制渐变背景
  const gradient = ctx.createLinearGradient(
    padding, padding,
    size - padding, size - padding
  );
  gradient.addColorStop(0, '#06b6d4');   // from-cyan-500
  gradient.addColorStop(1, '#9333ea');   // to-purple-600
  
  // 2. 绘制圆角矩形
  ctx.beginPath();
  ctx.roundRect(padding, padding, containerSize, containerSize, radius);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // 3. 绘制阴影 (shadow-lg shadow-cyan-500/20)
  ctx.shadowColor = 'rgba(6, 182, 212, 0.2)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.06;
  
  // 重新绘制以应用阴影
  ctx.beginPath();
  ctx.roundRect(padding, padding, containerSize, containerSize, radius);
  ctx.fill();
  
  // 4. 绘制 Activity 图标
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'white'; // text-white
  ctx.lineWidth = Math.max(1.5, size * 0.04);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const iconStartX = padding + iconPadding;
  const iconStartY = padding + iconPadding;
  drawActivityPath(ctx, iconStartX, iconStartY, iconSize);
  
  return canvas;
}

// 生成指定尺寸的图标
async function generateIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  drawIconFromCss(canvas, size);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ 生成：${path.basename(outputPath)} (${size}x${size})`);
  
  return buffer;
}

// 生成 Windows ICO 文件
async function generateIco(iconBuffers, outputPath) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(iconBuffers.length, 4);
  
  const dirEntrySize = 16;
  const dirEntries = Buffer.alloc(iconBuffers.length * dirEntrySize);
  
  let dataOffset = 6 + iconBuffers.length * dirEntrySize;
  
  for (let i = 0; i < iconBuffers.length; i++) {
    const size = [16, 24, 32, 48, 64, 128, 256][i] || 256;
    const dirEntry = dirEntries.slice(i * dirEntrySize, (i + 1) * dirEntrySize);
    dirEntry.writeUInt8(size >= 256 ? 0 : size, 0);
    dirEntry.writeUInt8(size >= 256 ? 0 : size, 1);
    dirEntry.writeUInt8(0, 2);
    dirEntry.writeUInt8(0, 3);
    dirEntry.writeUInt16LE(1, 4);
    dirEntry.writeUInt16LE(32, 6);
    dirEntry.writeUInt32LE(iconBuffers[i].length, 8);
    dirEntry.writeUInt32LE(dataOffset, 12);
    dataOffset += iconBuffers[i].length;
  }
  
  const icoFile = Buffer.concat([icoHeader, dirEntries, ...iconBuffers]);
  fs.writeFileSync(outputPath, icoFile);
  console.log(`✅ 生成：${path.basename(outputPath)} (Windows)`);
}

// 主函数
async function main() {
    console.log('🎨 开始生成 Electron 图标（精确还原 CSS 设计）...\n');
  console.log('📐 设计来源：src/App.tsx:240-242');
  console.log('🎨 CSS 样式:');
  console.log('   - bg-gradient-to-br from-cyan-500 to-purple-600');
  console.log('   - rounded-xl');
  console.log('   - shadow-lg shadow-cyan-500/20');
  console.log('⚡ 图标：Lucide Activity (w-6 h-6)\n');
  
  const iconBuffers = [];
  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
  
  // 生成所有尺寸的 PNG
  for (const size of sizes) {
    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    const buffer = await generateIcon(size, outputPath);
    iconBuffers.push(buffer);
  }
  
  console.log();
  
  // 生成 Windows ICO
  const icoOutput = path.join(ICONS_DIR, 'icon.ico');
  await generateIco(iconBuffers.slice(0, 7), icoOutput);
  
  // 生成 512x512 默认图标
  const defaultIcon = path.join(PUBLIC_DIR, 'icon.png');
  fs.copyFileSync(path.join(ICONS_DIR, 'icon-512x512.png'), defaultIcon);
  console.log(`✅ 生成：${path.basename(defaultIcon)} (512x512 默认)\n`);
  
  // 生成 macOS 需要的各尺寸图标
  console.log('🍎 生成 macOS 图标集...');
  const macosSizes = [16, 32, 64, 128, 256, 512, 1024];
  for (const size of macosSizes) {
    const src = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    const dest = path.join(ICONS_DIR, `icon_${size}.png`);
    fs.copyFileSync(src, dest);
    console.log(`✅ 复制：${path.basename(dest)}`);
  }
  
  // 生成 Linux 需要的图标
  console.log('\n🐧 生成 Linux 图标集...');
  const linuxSizes = [16, 24, 32, 48, 64, 128, 256, 512];
  for (const size of linuxSizes) {
    const src = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    const dest = path.join(ICONS_DIR, `${size}x${size}.png`);
    fs.copyFileSync(src, dest);
    console.log(`✅ 复制：${path.basename(dest)}`);
  }
  
  console.log('\n✨ 图标生成完成！\n');
  console.log('📁 输出目录：' + ICONS_DIR);
  console.log('\n📋 生成的文件:');
  console.log('   Windows: icon.ico');
  console.log('   macOS:   icon_*.png (需要转换为 .icns)');
  console.log('   Linux:   *x*.png');
  console.log('   通用：icon-*.png');
  console.log('\n💡 下一步:');
  console.log('   运行：node scripts/generate-icns-simple.js');
  console.log('   生成 macOS .icns 图标\n');
}

main().catch(console.error);