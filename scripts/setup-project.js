const fs = require('node:fs');
const path = require('node:path');

function setupProject(root = path.join(__dirname, '..')) {
  const template = path.join(root, 'project.config.example.json');
  const target = path.join(root, 'project.config.json');
  try {
    fs.copyFileSync(template, target, fs.constants.COPYFILE_EXCL);
    return { created: true };
  } catch (error) {
    if (error.code === 'EEXIST') return { created: false };
    throw error;
  }
}

if (require.main === module) {
  try {
    const { created } = setupProject();
    console.log(created
      ? '已创建 project.config.json，可在微信开发者工具中导入项目根目录。'
      : 'project.config.json 已存在，保留本机 AppID 和设置。');
  } catch (error) {
    console.error(`项目初始化失败：${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { setupProject };
