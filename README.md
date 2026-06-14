# 点菜网页

一个面向两个人一对一使用的点菜网页：客户浏览并下单，管理员维护菜品并收到新订单提醒。项目已迁移到腾讯云 CloudBase，适合国内公网访问。

## 功能

- 客户页：菜品搜索、分类筛选、排序、数量选择、备注、下单。
- 管理后台：CloudBase 邮箱密码登录，新增、编辑、删除、上下架菜品，上传图片。
- 订单：保存菜品快照、数量、小计和总价，后台可标记“已处理”。
- 提醒：后台点击“启用提醒音”后，会每 8 秒检查新订单，有新单时播放提示音并显示消息。

## 本地运行

1. 安装 Node.js 18 或更高版本，推荐 Node.js LTS。
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

4. 在 `.env` 中填写 CloudBase 环境 ID：

```env
VITE_CLOUDBASE_ENV_ID=你的CloudBase环境ID
```

5. 启动：

```bash
npm run dev
```

## CloudBase 配置

详细配置见 [cloudbase/README.md](cloudbase/README.md)。

需要完成：

- 创建 CloudBase 环境。
- 开启邮箱密码登录，并创建管理员账号。
- 创建 `dishes` 和 `orders` 数据库集合。
- 开启云存储，用于菜品图片。
- 配置集合权限：客户可读菜品和创建订单，管理员登录后可管理菜品和订单。

## 页面地址

- 客户点菜页：`/`
- 管理后台：`/#admin`

## 部署到 CloudBase Web 应用托管

1. 将项目上传到 Git 仓库，或使用 CloudBase 控制台支持的上传/导入方式。
2. 在 CloudBase Web 应用托管中创建应用。
3. 构建命令：

```bash
npm install && npm run build
```

4. 输出目录：

```text
dist
```

5. 添加环境变量：

```env
VITE_CLOUDBASE_ENV_ID=你的CloudBase环境ID
```

部署完成后，客户打开 CloudBase 提供的公网地址 `/`，你打开 `/#admin`。

## 注意

- 这一版采用前端直连 CloudBase 数据库，适合轻量一对一使用。
- 后台页面必须保持打开，并点击一次“启用提醒音”，才能听到新订单提示音。
- 如果以后要防止客户篡改价格或做微信/短信提醒，建议增加 CloudBase 云函数来统一创建订单和推送通知。
