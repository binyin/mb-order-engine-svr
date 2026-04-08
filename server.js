const express = require('express');
const cloud = require('wx-server-sdk');
const app = express();

app.use(express.json());

// 自动检测环境ID
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 中间件：从微信 Header 自动获取身份
const auth = (req, res, next) => {
  req.openid = req.headers['x-wx-openid'];
  next();
};

// --- 用户端接口 ---

// 获取今日可选商品
app.get('/api/products', auth, async (req, res) => {
  const result = await db.collection('products').where({ is_active: true }).get();
  res.send(result);
});

// 提交订单
app.post('/api/order', auth, async (req, res) => {
  const order = {
    ...req.body,
    _openid: req.openid,
    status: 'normal',
    is_paid: false,
    createTime: db.serverDate()
  };
  const result = await db.collection('orders').add({ data: order });
  res.send({ success: true, id: result._id });
});

// --- 老板端接口 ---

// 区域1：聚合统计 (待取看板)
app.get('/api/admin/stats', auth, async (req, res) => {
  const $ = db.command.aggregate;
  const result = await db.collection('orders')
    .aggregate()
    .match({ status: 'normal' })
    .unwind('$items')
    .group({
      _id: '$items.name',
      totalCount: $.sum('$items.count')
    })
    .sort({ totalCount: -1 })
    .end();
  res.send(result);
});

// 区域2：所有订单列表
app.get('/api/admin/orders', auth, async (req, res) => {
  const result = await db.collection('orders')
    .orderBy('createTime', 'desc')
    .get();
  res.send(result);
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));