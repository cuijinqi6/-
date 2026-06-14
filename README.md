# 点菜网页

一个面向两个人一对一使用的点菜网页：客户浏览并下单，管理员维护菜品并实时收到新订单提醒。

## 功能

- 客户页：菜品搜索、分类筛选、排序、数量选择、备注、下单。
- 管理后台：Supabase 邮箱密码登录，新增、编辑、删除、上下架菜品，上传图片。
- 订单：数据库端生成价格快照和总价，后台实时显示新单，可标记已处理。
- 提醒：后台点击“启用提醒音”后，新订单会播放提示音并显示消息。

## 本地运行

1. 安装 Node.js 18 或更高版本。
2. 安装依赖：

```bash
npm install
```

3. 复制环境变量文件：

```bash
cp .env.example .env
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
```

4. 在 `.env` 中填写：

```bash
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_ANON_KEY=你的 Supabase anon key
```

5. 启动：

```bash
npm run dev
```

## Supabase 配置

1. 新建 Supabase 项目。
2. 在 SQL Editor 中执行 `supabase/schema.sql`。
3. 在 Authentication 中创建你的管理员邮箱和密码。
4. 建议关闭公开注册，只保留你自己的管理员账号。
5. 确认 `dish-images` bucket 已创建且为 public。
6. Realtime 需要包含 `orders` 表；SQL 脚本最后一行已尝试加入 publication。

## 页面地址

- 客户点菜页：`/`
- 管理后台：`/#admin`

## 部署到 Vercel

1. 将项目推送到 Git 仓库。
2. 在 Vercel 导入项目。
3. 添加环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Build Command 使用 `npm run build`。
5. Output Directory 使用 `dist`。

## 注意

- 客户无需登录，因此任何知道客户页地址的人都可以提交订单；这符合一对一轻量场景。
- 后台必须保持打开，且浏览器允许音频播放，才能听到实时提示音。
- 如果未来需要微信、短信或邮件提醒，可以在 Supabase Edge Function 或第三方自动化服务中基于新订单事件扩展。
