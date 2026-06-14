# CloudBase 配置

## 1. 创建环境

在腾讯云 CloudBase 控制台创建一个环境，记下环境 ID，并写入项目根目录 `.env`：

```env
VITE_CLOUDBASE_ENV_ID=你的环境ID
```

## 2. 开启登录方式

在 CloudBase 控制台开启邮箱密码登录，并创建你的管理员账号。后台地址是：

```text
/#admin
```

## 3. 创建数据库集合

创建两个集合：

- `dishes`
- `orders`

`dishes` 文档字段：

```json
{
  "name": "番茄炒蛋",
  "category": "家常菜",
  "price": 18,
  "image_url": "cloudbase-file-url",
  "is_available": true,
  "created_at": "2026-06-14T00:00:00.000Z",
  "updated_at": "2026-06-14T00:00:00.000Z"
}
```

`orders` 文档字段：

```json
{
  "remark": "少油",
  "total_amount": 36,
  "status": "new",
  "items": [
    {
      "dish_id": "dish-doc-id",
      "dish_name": "番茄炒蛋",
      "unit_price": 18,
      "quantity": 2,
      "subtotal": 36
    }
  ],
  "created_at": "2026-06-14T00:00:00.000Z",
  "updated_at": "2026-06-14T00:00:00.000Z"
}
```

## 4. 文件存储

开启云存储。项目会把菜品图片上传到：

```text
dish-images/
```

## 5. 权限建议

第一版为了两个人一对一使用，客户页需要读取上架菜品并创建订单，后台需要登录后管理菜品和订单。

推荐权限策略：

- `dishes`：所有人可读；只有登录用户可写。
- `orders`：所有人可创建；只有登录用户可读和更新。
- 云存储：所有人可读菜品图片；只有登录用户可上传。

如果 CloudBase 控制台提供“安全规则”编辑，请按上面的意图配置。不同控制台版本的规则语法可能略有差异，优先使用控制台的可视化权限模板。

## 6. 部署

使用 CloudBase Web 应用托管部署本项目：

- 构建命令：`npm run build`
- 输出目录：`dist`
- 环境变量：`VITE_CLOUDBASE_ENV_ID`
