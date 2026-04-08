const request = require('supertest');
const express = require('express');
const cloud = require('wx-server-sdk');

// 模拟云开发 SDK，避免真实数据库调用
jest.mock('wx-server-sdk', () => ({
  init: jest.fn(),
  database: () => ({
    collection: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    add: jest.fn(),
    get: jest.fn(),
    orderBy: jest.fn().mockReturnThis(),
    aggregate: jest.fn().mockReturnThis(),
    serverDate: () => new Date()
  }),
  command: { aggregate: {} },
  DYNAMIC_CURRENT_ENV: 'prod'
}));

const app = require('../server'); // 指向你的入口文件

describe('馒头接龙 API 100% 覆盖测试套件', () => {
  
  const mockOpenid = 'test-openid-888';

  // --- 1. 用户端接口测试 ---
  
  test('GET /api/products - 应该返回所有在线商品', async () => {
    const response = await request(app)
      .get('/api/products')
      .set('x-wx-openid', mockOpenid);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /api/order - 正常下单流程', async () => {
    const orderData = {
      userName: "张三",
      items: [{ name: "老面馒头", count: 10, price: 1.5 }],
      totalPrice: 15
    };
    
    const response = await request(app)
      .post('/api/order')
      .set('x-wx-openid', mockOpenid)
      .send(orderData);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  // --- 2. 老板端管理接口测试 ---

  test('GET /api/admin/stats - 看板聚合数据查询', async () => {
    const response = await request(app)
      .get('/api/admin/stats')
      .set('x-wx-openid', 'admin-openid');
    
    expect(response.status).toBe(200);
  });

  test('GET /api/admin/orders - 历史订单全量拉取', async () => {
    const response = await request(app)
      .get('/api/admin/orders')
      .set('x-wx-openid', 'admin-openid');
    
    expect(response.status).toBe(200);
  });

  // --- 3. 异常与边界测试 (覆盖 100% 的关键) ---

  test('Missing OpenID Header - 鉴权中间件容错测试', async () => {
    // 模拟无 Header 情况，程序不应崩溃，且应赋予默认或报错
    const response = await request(app).get('/api/products');
    expect(response.status).toBe(200); 
    // 注意：如果你加了强鉴权，这里应该断言 401
  });

  test('Empty Order Data - 空订单提交校验', async () => {
    const response = await request(app)
      .post('/api/order')
      .set('x-wx-openid', mockOpenid)
      .send({}); // 发送空对象
    
    // 如果你在代码里没写校验，这里会过。为了100%覆盖，建议在后端加 if(!items) 逻辑
    expect(response.body).toHaveProperty('success');
  });

  test('Database Connection Error - 模拟数据库宕机', async () => {
    // 强制模拟数据库报错路径
    const db = cloud.database();
    db.collection().get.mockRejectedValueOnce(new Error('DB_ERROR'));

    const response = await request(app)
      .get('/api/products')
      .set('x-wx-openid', mockOpenid);
    
    // 覆盖 try-catch 中的 catch 块
    expect(response.status).toBe(500); 
  });
});