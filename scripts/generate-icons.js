import { createCanvas } from 'canvas';
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

// 绘制 Activity 图标（心电图线条）
function drawActivityIcon(canvas, size) {
  const ctx = canvas.getContext('2d');
  const padding = size * 0.15;
  const iconSize = size - padding * 2;
  
  // 创建渐变背景（与应用中相同：from-cyan-500 to-purple-600）
  const gradient = ctx.createLinearGradient(padding, padding, size - padding, size - padding);
  gradient.addColorStop(0, '#06b6d4');  // cyan-500
  gradient.addColorStop(1, '#9333ea');  // purple-600
  
  // 绘制圆角矩形背景
  const radius = iconSize * 0.25;
  ctx.beginPath();
  ctx.moveTo(padding + radius, padding);
  ctx.lineTo(size - padding - radius, padding);
  ctx.quadraticCurveTo(size - padding, padding, size - padding, padding + radius);
  ctx.lineTo(size - padding, size - padding - radius);
  ctx.quadraticCurveTo(size - padding, size - padding, size - padding - radius, size - padding);
  ctx.lineTo(padding + radius, size - padding);
  ctx.quadraticCurveTo(padding, size - padding, padding, size - padding - radius);
  ctx.lineTo(padding, padding + radius);
  ctx.quadraticCurveTo(padding, padding, padding + radius, padding);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // 添加阴影效果
  ctx.shadowColor = 'rgba(6, 182, 212, 0.3)';
  ctx.shadowBlur = size * 0.1;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = size * 0.05;
  
  // 绘制 Activity 线条（心电图波形）
  ctx.strokeStyle = 'white';
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'transparent';
  
  const linePadding = iconSize * 0.2;
  const centerY = size / 2;
  const amplitude = iconSize * 0.15;
  
  ctx.beginPath();
  ctx.moveTo(padding + linePadding, centerY);
  
  // 绘制心电图波形
  const segments = [
    { x: 0.15, y: 0 },
    { x: 0.25, y: 0 },
    { x: 0.3, y: -amplitude * 0.5 },
    { x: 0.35, y: amplitude },
    { x: 0.4, y: -amplitude * 0.8 },
    { x: 0.45, y: amplitude * 0.3 },
    { x: 0.5, y: 0 },
    { x: 0.7, y: 0 },
    { x: 0.75, y: -amplitude * 0.3 },
    { x: 0.8, y: 0 },
    { x: 0.85, y: 0 },
  ];
  
  const startX = padding + linePadding;
  const endX = size - padding - linePadding;
  const totalWidth = endX - startX;
  
  segments.forEach((seg, i) => {
    const x = startX + seg.x * totalWidth;
    const y = centerY + seg.y;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  return canvas;
}

// 生成指定尺寸的图标
async function generateIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  drawActivityIcon(canvas, size);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ 生成：${path.basename(outputPath)} (${size}x${size})`);
  
  return buffer;
}

// 生成 Windows ICO 文件
async function generateIco(iconBuffers, outputPath) {
  // 简单的 ICO 文件头
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // 保留
  icoHeader.writeUInt16LE(1, 2); // 类型：1=图标
  icoHeader.writeUInt16LE(iconBuffers.length, 4); // 图标数量
  
  // 目录条目
  const dirEntrySize = 16;
  const dirEntries = Buffer.alloc(iconBuffers.length * dirEntrySize);
  
  // 图标数据偏移量
  let dataOffset = 6 + iconBuffers.length * dirEntrySize;
  
  for (let i = 0; i < iconBuffers.length; i++) {
    const size = [16, 24, 32, 48, 64, 128, 256][i] || 256;
    const dirEntry = dirEntries.slice(i * dirEntrySize, (i + 1) * dirEntrySize);
    dirEntry.writeUInt8(size >= 256 ? 0 : size, 0); // 宽度
    dirEntry.writeUInt8(size >= 256 ? 0 : size, 1); // 高度
    dirEntry.writeUInt8(0, 2); // 颜色数
    dirEntry.writeUInt8(0, 3); // 保留
    dirEntry.writeUInt16LE(1, 4); // 颜色平面
    dirEntry.writeUInt16LE(32, 6); // 位深度
    dirEntry.writeUInt32LE(iconBuffers[i].length, 8); // 数据大小
    dirEntry.writeUInt32LE(dataOffset, 12); // 数据偏移
    
    dataOffset += iconBuffers[i].length;
  }
  
  // 合并文件
  const icoFile = Buffer.concat([icoHeader, dirEntries, ...iconBuffers]);
  fs.writeFileSync(outputPath, icoFile);
  console.log(`✅ 生成：${path.basename(outputPath)} (Windows)`);
}

// 主函数
async function main() {
  console.log('🎨 开始生成 Electron 多平台图标...\n');
  console.log('📐 图标样式：渐变 Activity (cyan-500 to purple-600)\n');
  
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
  console.log('\n💡 提示:');
  console.log('   macOS 需要使用 iconutil 将 PNG 转换为 .icns 格式');
  console.log('   命令：iconutil -c icns icons/ -o icons/icon.icns');
  console.log('\n🎉 完成!\n');
}

main().catch(console.error);