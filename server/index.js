require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app = require('./app');

const PORT = process.env.PORT || 3001;

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
});

process.on('SIGTERM', async () => {
  console.log('\n收到 SIGTERM 信号，正在优雅关闭...');
  await app.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n收到 SIGINT 信号，正在优雅关闭...');
  await app.shutdown();
  process.exit(0);
});

app.initialize()
  .then(() => app.start(PORT))
  .then((port) => {
    console.log(`\n🎉 服务已启动在端口 ${port}`);
  })
  .catch((error) => {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  });
