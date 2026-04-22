const WebSocket = require('ws');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     🧪 CRM Real-time Sync - E2E Test Suite           ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

const WS_URL = 'ws://localhost:5012/ws';
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(testName, status, details = '') {
  const icon = status === '✅' ? '✅' : '❌';
  console.log(`${icon} ${testName}${details ? ': ' + details : ''}`);

  if (status === '✅') {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  testResults.tests.push({
    name: testName,
    status: status,
    details: details
  });
}

async function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log('\n📡 [测试1] WebSocket连接测试');

    const ws = new WebSocket(WS_URL);

    ws.on('open', () => {
      logTest('WebSocket连接', '✅', '连接成功建立');
      ws.close();
      resolve();
    });

    ws.on('error', (error) => {
      logTest('WebSocket连接', '❌', error.message);
      reject(error);
    });

    setTimeout(() => {
      logTest('WebSocket连接', '❌', '连接超时（5秒）');
      ws.close();
      reject(new Error('Connection timeout'));
    }, 5000);
  });
}

async function testEventEmission() {
  return new Promise((resolve) => {
    console.log('\n📤 [测试2] 事件发射测试（模拟管理员操作）');

    const adminWs = new WebSocket(WS_URL);
    let testCompleted = false;

    adminWs.on('open', () => {
      console.log('  → 管理员客户端已连接');

      // 模拟课程创建事件
      const testEvent = {
        type: 'course:created',
        data: {
          id: 'test-course-001',
          title: '测试课程-E2E验证',
          description: '这是一个端到端测试课程',
          timestamp: new Date().toISOString()
        },
        source: 'admin'
      };

      adminWs.send(JSON.stringify(testEvent));
      logTest('事件发射', '✅', `已发送 ${testEvent.type} 事件`);

      setTimeout(() => {
        if (!testCompleted) {
          testCompleted = true;
          adminWs.close();
          resolve();
        }
      }, 1000);
    });

    adminWs.on('error', (error) => {
      logTest('事件发射', '❌', error.message);
      if (!testCompleted) {
        testCompleted = true;
        resolve();
      }
    });
  });
}

async function testUserRealtimeReception() {
  return new Promise((resolve) => {
    console.log('\n📥 [测试3] 用户端实时接收测试');

    const userWs = new WebSocket(WS_URL);
    let eventReceived = false;
    let testCompleted = false;

    userWs.on('open', () => {
      console.log('  → 用户客户端已连接，等待接收事件...');

      // 发送测试事件模拟管理员操作
      const adminWs = new WebSocket(WS_URL);
      adminWs.on('open', () => {
        setTimeout(() => {
          const testEvent = {
            type: 'product:created',
            data: {
              id: 'test-product-001',
              name: '测试商品-E2E',
              price: 99.99
            },
            source: 'admin'
          };
          adminWs.send(JSON.stringify(testEvent));
          adminWs.close();
        }, 500);
      });
    });

    userWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'product:created') {
          eventReceived = true;
          logTest('用户端事件接收', '✅', `收到事件: ${message.type}`);
          console.log(`     📦 事件数据: ${JSON.stringify(message.data, null, 2)}`);
        }
      } catch (e) {
        // 忽略解析错误
      }

      if (!testCompleted) {
        testCompleted = true;
        userWs.close();
        resolve();
      }
    });

    userWs.on('error', (error) => {
      logTest('用户端事件接收', '❌', error.message);
      if (!testCompleted) {
        testCompleted = true;
        resolve();
      }
    });

    setTimeout(() => {
      if (!eventReceived && !testCompleted) {
        logTest('用户端事件接收', '⚠️', '未收到事件（可能需要多个客户端同时在线）');
        testCompleted = true;
        userWs.close();
        resolve();
      }
    }, 3000);
  });
}

async function testMultipleEventTypes() {
  return new Promise((resolve) => {
    console.log('\n🔄 [测试4] 多类型事件广播测试');

    const eventTypes = [
      'video:updated',
      'course:deleted',
      'redPacket:published'
    ];

    let receivedEvents = [];
    let testCompleted = false;

    const receiverWs = new WebSocket(WS_URL);

    receiverWs.on('open', () => {
      console.log('  → 接收客户端已连接');

      const senderWs = new WebSocket(WS_URL);
      senderWs.on('open', () => {
        eventTypes.forEach((eventType, index) => {
          setTimeout(() => {
            const event = {
              type: eventType,
              data: { id: `test-${index}`, test: true },
              source: 'admin'
            };
            senderWs.send(JSON.stringify(event));
          }, index * 300);
        });

        setTimeout(() => {
          senderWs.close();
        }, 1500);
      });
    });

    receiverWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (eventTypes.includes(message.type)) {
          receivedEvents.push(message.type);
        }

        if (receivedEvents.length >= eventTypes.length && !testCompleted) {
          testCompleted = true;
          logTest('多类型事件广播', '✅', `收到 ${receivedEvents.length}/${eventTypes.length} 种事件类型`);
          console.log(`     📋 收到的事件: ${receivedEvents.join(', ')}`);
          receiverWs.close();
          resolve();
        }
      } catch (e) {
        // 忽略
      }
    });

    receiverWs.on('error', (error) => {
      logTest('多类型事件广播', '❌', error.message);
      if (!testCompleted) {
        testCompleted = true;
        resolve();
      }
    });

    setTimeout(() => {
      if (!testCompleted) {
        testCompleted = true;
        logTest('多类型事件广播', '⚠️', `收到 ${receivedEvents.length}/${eventTypes.length} 种事件`);
        receiverWs.close();
        resolve();
      }
    }, 5000);
  });
}

async function runAllTests() {
  console.log('开始执行端到端测试...\n');

  try {
    await testWebSocketConnection();
    await testEventEmission();
    await testUserRealtimeReception();
    await testMultipleEventTypes();
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('📊 测试结果汇总');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`总测试数: ${testResults.passed + testResults.failed}`);
  console.log(`通过: ${testResults.passed} ✅`);
  console.log(`失败: ${testResults.failed} ❌`);
  console.log(`通过率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 所有测试通过！实时同步功能运行正常！');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查上方日志获取详细信息');
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

runAllTests();