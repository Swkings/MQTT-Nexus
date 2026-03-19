import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT_DIR, 'public', 'icons');

// ICNS 类型标识符
const ICNS_TYPES = {
  'icon_16.png': 'icp4',
  'icon_32.png': 'icp5',
  'icon_64.png': 'icp6',
  'icon_128.png': 'icp7',
  'icon_256.png': 'icp8',
  'icon_512.png': 'icp9',
  'icon_1024.png': 'ic10',
};

// 写入大端整数
function writeUInt32BE(buffer, value, offset) {
  buffer[offset] = (value >> 24) & 0xFF;
  buffer[offset + 1] = (value >> 16) & 0xFF;
  buffer[offset + 2] = (value >> 8) & 0xFF;
  buffer[offset + 3] = value & 0xFF;
}

async function generateIcns() {
  console.log('🍎 开始生成 macOS .icns 图标...\n');
  
  const iconsetDir = path.join(ICONS_DIR, 'icon.iconset');
  
  // 准备 PNG 文件列表
  const pngFiles = Object.entries(ICNS_TYPES)
    .map(([filename, type]) => {
      const filepath = path.join(ICONS_DIR, filename);
      return { filename, type, filepath };
    })
    .filter(item => fs.existsSync(item.filepath));
  
  if (pngFiles.length === 0) {
    console.log('⚠️  未找到 PNG 文件，先生成 PNG 图标');
    return;
  }
  
  console.log('📦 读取 PNG 文件...');
  const iconData = [];
  
  for (const { filename, type, filepath } of pngFiles) {
    const data = fs.readFileSync(filepath);
    console.log(`✅ 读取：${filename} (${(data.length / 1024).toFixed(1)} KB, ${type})`);
    iconData.push({ type, data });
  }
  
  console.log('\n🔨 构建 ICNS 文件...');
  
  // ICNS 文件头：8 字节
  // - 4 字节：'icns' (0x69636e73)
  // - 4 字节：文件总长度
  const headerSize = 8;
  
  // 计算总大小
  let totalSize = headerSize;
  for (const icon of iconData) {
    // 每个图标：8 字节头 + PNG 数据（填充到 4 字节对齐）
    const iconSize = 8 + icon.data.length;
    const paddedSize = Math.ceil(iconSize / 4) * 4;
    totalSize += paddedSize;
  }
  
  // 创建缓冲区
  const icnsBuffer = Buffer.alloc(totalSize);
  
  // 写入文件头
  icnsBuffer.write('icns', 0, 'ascii');
  writeUInt32BE(icnsBuffer, totalSize, 4);
  
  // 写入图标数据
  let offset = headerSize;
  for (const icon of iconData) {
    // 图标类型
    icnsBuffer.write(icon.type, offset, 'ascii');
    offset += 4;
    
    // 图标大小（包括头和填充）
    const iconSize = 8 + icon.data.length;
    const paddedSize = Math.ceil(iconSize / 4) * 4;
    writeUInt32BE(icnsBuffer, paddedSize, offset);
    offset += 4;
    
    // PNG 数据
    icon.data.copy(icnsBuffer, offset);
    offset += icon.data.length;
    
    // 填充到 4 字节对齐
    const padding = paddedSize - iconSize;
    if (padding > 0) {
      icnsBuffer.fill(0, offset, offset + padding);
      offset += padding;
    }
    
    console.log(`✅ 写入：${icon.type} (${icon.data.length} bytes)`);
  }
  
  // 保存文件
  const outputFile = path.join(ICONS_DIR, 'icon.icns');
  fs.writeFileSync(outputFile, icnsBuffer);
  
  console.log(`\n✅ 生成：${outputFile}`);
  console.log(`📊 文件大小：${(icnsBuffer.length / 1024).toFixed(2)} KB`);
  console.log(`📊 图标数量：${iconData.length}`);
  
  // 清理 iconset 目录
  fs.rmSync(iconsetDir, { recursive: true, force: true });
  console.log('\n🧹 清理临时文件...');
  
  console.log('\n✨ macOS 图标生成完成！\n');
}

generateIcns().catch(console.error);