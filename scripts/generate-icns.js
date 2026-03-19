import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT_DIR, 'public', 'icons');

async function generateIcns() {
  console.log('🍎 开始生成 macOS .icns 图标...\n');
  
  // 准备 iconset 目录
  const iconsetDir = path.join(ICONS_DIR, 'icon.iconset');
  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true });
  }
  
  // 复制 PNG 到 iconset 目录（macOS 需要的命名格式）
  const sizes = [
    { from: 'icon_16.png', to: 'icon_16x16.png' },
    { from: 'icon_32.png', to: 'icon_16x16@2x.png' },
    { from: 'icon_64.png', to: 'icon_32x32.png' },
    { from: 'icon_128.png', to: 'icon_32x32@2x.png' },
    { from: 'icon_256.png', to: 'icon_128x128.png' },
    { from: 'icon_512.png', to: 'icon_256x256@2x.png' },
    { from: 'icon_1024.png', to: 'icon_512x512@2x.png' },
  ];
  
  console.log('📦 准备 iconset 文件...');
  for (const { from, to } of sizes) {
    const src = path.join(ICONS_DIR, from);
    const dest = path.join(iconsetDir, to);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`✅ 复制：${from} -> ${to}`);
    }
  }
  
  console.log('\n🔨 生成 .icns 文件...');
  
  // 尝试使用 png2icns 命令行工具
  try {
    const outputFile = path.join(ICONS_DIR, 'icon.icns');
    const pngFiles = sizes.map(s => path.join(iconsetDir, s.to)).filter(f => fs.existsSync(f));
    
    // 使用 png2icns
    const args = [
      '-o', outputFile,
      ...pngFiles
    ];
    
    execSync(`png2icns ${args.join(' ')}`, { stdio: 'inherit' });
    
    console.log(`\n✅ 生成：${outputFile}`);
    const stats = fs.statSync(outputFile);
    console.log(`📊 文件大小：${(stats.size / 1024).toFixed(2)} KB`);
    
    // 清理 iconset 目录
    fs.rmSync(iconsetDir, { recursive: true, force: true });
    console.log('\n🧹 清理临时文件...');
    
    console.log('\n✨ macOS 图标生成完成！\n');
    
  } catch (error) {
    console.error('\n❌ 自动生成 .icns 失败');
    console.log('\n💡 手动生成方法:');
    console.log('\n方法 1: 在 macOS 系统上');
    console.log('   1. 创建 icon.iconset 目录');
    console.log('   2. 将所有 icon_*.png 复制到 icon.iconset/');
    console.log('   3. 运行：iconutil -c icns icon.iconset -o icons/icon.icns');
    console.log('\n方法 2: 使用在线转换工具');
    console.log('   https://cloudconvert.com/png-to-icns');
    console.log('   https://iconverticons.com/online/');
    console.log('\n方法 3: 使用 GIMP 或 Inkscape');
    console.log('   导出为 .icns 格式\n');
    
    // 不清理 iconset，方便用户手动使用
    console.log('📁 iconset 目录已保留：' + iconsetDir);
  }
}

generateIcns().catch(console.error);