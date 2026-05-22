export const changelogVersions = [
  { version: 'v2.9.4-alpha', date: '2026-05-22', group: '2.9.x' },
  { version: 'v2.9.3-alpha', date: '2026-05-22', group: '2.9.x' },
  { version: 'v2.9.2-alpha', date: '2026-05-22', group: '2.9.x' },
  { version: 'v2.9.1-alpha', date: '2026-05-22', group: '2.9.x' },
  { version: 'v2.9.0-alpha', date: '2026-05-22', group: '2.9.x' },
  { version: 'v2.8.2-alpha', date: '2026-05-22', group: '2.8.x' },
  { version: 'v2.8.1-alpha', date: '2026-05-21', group: '2.8.x' },
  { version: 'v2.8.0-alpha', date: '2026-05-21', group: '2.8.x' },
  { version: 'v2.7.1-alpha', date: '2026-05-21', group: '2.7.x' },
  { version: 'v2.7.0-alpha', date: '2026-05-21', group: '2.7.x' },
  { version: 'v2.6.0-alpha', date: '2026-05-20', group: '2.6' },
  { version: 'v2.5.4-alpha', date: '2026-05-20', group: '2.5.x' },
  { version: 'v2.5.3-alpha', date: '2026-05-20', group: '2.5.x' },
  { version: 'v2.5.2-alpha', date: '2026-05-20', group: '2.5.x' },
  { version: 'v2.5.1-alpha', date: '2026-05-20', group: '2.5.x' },
  { version: 'v2.5.0-alpha', date: '2026-05-20', group: '2.5.x' },
  { version: 'v2.1.5-alpha', date: '2026-05-20', group: '2.1.x' },
  { version: 'v2.1.4-alpha', date: '2026-05-20', group: '2.1.x' },
  { version: 'v2.1.3-alpha', date: '2026-05-20', group: '2.1.x' },
  { version: 'v2.1.2-alpha', date: '2026-05-20', group: '2.1.x' },
  { version: 'v2.1.1-alpha', date: '2026-05-20', group: '2.1.x' },
  { version: 'v2.1.0-alpha', date: '2026-05-20', group: '2.1.x' },
  { version: 'v2.0.0-alpha', date: '2026-05-19', group: '2.0' },
  { version: 'v1.3.0-alpha', date: '2026-05-19', group: '1.3' },
  { version: 'v1.2.2-alpha', date: '2026-05-19', group: '1.2.x' },
  { version: 'v1.2.1-alpha', date: '2026-05-18', group: '1.2.x' },
  { version: 'v1.2.0-alpha', date: '2026-05-18', group: '1.2.x' },
  { version: 'v1.1.0-alpha', date: '2026-05-18', group: '1.1' },
  { version: 'v1.0.0', date: '2026-05-18', group: '1.0' }
]

export const changelogData = {
  'v2.9.4-alpha': {
    date: '2026-05-22',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '食品库存管理：支持设置数量，一键「吃掉一件」减少库存，最后一件吃掉自动清理并提示"嗝~"',
          '添加/编辑食品独立路由页面（/foods/add、/foods/edit/:id），不再内嵌列表页，扫码结果直达新增页',
          '数据导入标签冲突处理：检测标签上限，支持选择性保留标签或去标签导入',
          '版本更新提醒：发版后首次打开自动弹窗展示更新日志'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '页面切换性能跃升：路由懒加载 + keep-alive 组件缓存，页面秒切不再卡顿',
          '页面预加载优化：首页加载后自动后台预载二维码等重页面，首次访问不再长时间等待',
          '关于页面重构：开源声明独立三级页面，含 MIT 许可证说明与开源资源致谢，署名图标作者 Royyan Wijaya',
          'Toast 提示液态玻璃风格居中显示，最后一件绿色玻璃区分',
          'PDF 二维码打印：水印移至最上层，页码 canvas 渲染避免字体缺失，合成失败卡片自动跳过',
          '标签颜色分配算法防死循环保护',
          '诊断日志全面增强：新增设备信息字段（devicePixelRatio / maxTouchPoints / reducedMotion），API 请求摘要信息，SW/条码错误日志完善'
        ]
      },
      {
        type: '修复',
        color: 'red',
        items: [
          '修复了一些体验问题'
        ]
      }
    ]
  },
  'v2.9.3-alpha': {
    date: '2026-05-22',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '食品库存管理：支持设置数量，一键「吃掉一件」减少库存，最后一件吃掉自动清理并提示"嗝~"',
          '添加/编辑食品独立路由页面（/foods/add、/foods/edit/:id），不再内嵌列表页，扫码结果直达新增页',
          '数据导入标签冲突处理：检测标签上限，支持选择性保留标签或去标签导入',
          '版本更新提醒：发版后首次打开自动弹窗展示更新日志'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '页面切换性能跃升：路由懒加载 + keep-alive 组件缓存，页面秒切不再卡顿',
          '页面预加载优化：首页加载后自动后台预载二维码等重页面，首次访问不再长时间等待',
          '关于页面重构：开源声明独立三级页面，含 MIT 许可证说明与开源资源致谢，署名图标作者 Royyan Wijaya',
          'Toast 提示液态玻璃风格居中显示，最后一件绿色玻璃区分',
          'PDF 二维码打印：水印移至最上层，页码 canvas 渲染避免字体缺失，合成失败卡片自动跳过',
          '标签颜色分配算法防死循环保护',
          '诊断日志全面增强：新增设备信息字段（devicePixelRatio / maxTouchPoints / reducedMotion），API 请求摘要信息，SW/条码错误日志完善'
        ]
      },
      {
        type: '修复',
        color: 'red',
        items: [
          '修复了一些体验问题'
        ]
      }
    ]
  },
  'v2.9.2-alpha': {
    date: '2026-05-22',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '食品库存管理：支持设置数量，一键「吃掉一件」减少库存，最后一件吃掉自动清理并提示"嗝~"',
          '添加/编辑食品独立路由页面（/foods/add、/foods/edit/:id），不再内嵌列表页，扫码结果直达新增页',
          '数据导入标签冲突处理：检测标签上限，支持选择性保留标签或去标签导入',
          '版本更新提醒：发版后首次打开自动弹窗展示更新日志'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '页面切换性能跃升：路由懒加载 + keep-alive 组件缓存，页面秒切不再卡顿',
          '关于页面重构：开源声明独立三级页面，含 MIT 许可证说明与开源资源致谢，署名图标作者 Royyan Wijaya',
          'Toast 提示液态玻璃风格居中显示，最后一件绿色玻璃区分',
          'PDF 二维码打印：水印移至最上层，页码 canvas 渲染避免字体缺失，合成失败卡片自动跳过',
          '标签颜色分配算法防死循环保护',
          '诊断日志全面增强：新增设备信息字段（devicePixelRatio / maxTouchPoints / reducedMotion），API 请求摘要信息，SW/条码错误日志完善'
        ]
      },
      {
        type: '修复',
        color: 'red',
        items: [
          '修复了一些体验问题'
        ]
      }
    ]
  },
  'v2.9.1-alpha': {
    date: '2026-05-22',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '食品库存管理：支持设置数量，一键「吃掉一件」减少库存，最后一件吃掉自动清理并提示"嗝~"',
          '添加/编辑食品独立路由页面（/foods/add、/foods/edit/:id），不再内嵌列表页，扫码结果直达新增页',
          '数据导入标签冲突处理：检测标签上限，支持选择性保留标签或去标签导入',
          '版本更新提醒：发版后首次打开自动弹窗展示更新日志'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '页面切换性能跃升：路由懒加载 + keep-alive 组件缓存，页面秒切不再卡顿',
          '关于页面重构：开源声明独立三级页面，含 MIT 许可证说明与开源资源致谢，署名图标作者 Royyan Wijaya',
          'Toast 提示液态玻璃风格居中显示，最后一件绿色玻璃区分',
          'PDF 二维码打印：水印移至最上层，页码 canvas 渲染避免字体缺失，合成失败卡片自动跳过',
          '标签颜色分配算法防死循环保护',
          '诊断日志全面增强：新增设备信息字段（devicePixelRatio / maxTouchPoints / reducedMotion），API 请求摘要信息，SW/条码错误日志完善'
        ]
      },
      {
        type: '修复',
        color: 'red',
        items: [
          '修复了一些体验问题'
        ]
      }
    ]
  },
  'v2.9.0-alpha': {
    date: '2026-05-22',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '食品库存管理：支持设置数量，一键「吃掉一件」减少库存，最后一件吃掉自动清理并提示"嗝~"',
          '添加/编辑食品独立路由页面（/foods/add、/foods/edit/:id），不再内嵌列表页，扫码结果直达新增页',
          '数据导入标签冲突处理：检测标签上限，支持选择性保留标签或去标签导入',
          '版本更新提醒：发版后首次打开自动弹窗展示更新日志'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '页面切换性能跃升：路由懒加载 + keep-alive 组件缓存，页面秒切不再卡顿',
          '关于页面重构：开源声明独立三级页面，含 MIT 许可证说明与开源资源致谢，署名图标作者 Royyan Wijaya',
          'Toast 提示液态玻璃风格居中显示，最后一件绿色玻璃区分',
          'PDF 二维码打印：水印移至最上层，页码 canvas 渲染避免字体缺失，合成失败卡片自动跳过',
          '标签颜色分配算法防死循环保护',
          '诊断日志全面增强：新增设备信息字段（devicePixelRatio / maxTouchPoints / reducedMotion），API 请求摘要信息，SW/条码错误日志完善'
        ]
      }
    ]
  },
  'v2.8.2-alpha': {
    date: '2026-05-22',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '二维码 PDF 打印：下载 A4 排列 PDF，5 列网格排版（30 个/页），品牌标题 + 斜铺水印，支持多页自动分页'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '食品管理筛选状态持久化：筛选/标签/搜索/排序状态写入 URL query，返回页面时自动恢复'
        ]
      }
    ]
  },
  'v2.8.1-alpha': {
    date: '2026-05-21',
    sections: [
      {
        type: '修复',
        color: 'red',
        items: [
          '鸿蒙/荣耀系统浏览器 Vue 渲染崩溃：build target 降级至 es2015',
          '移动端标签管理页删除按钮不可见：hover 依赖改为 md 断点常显',
          '移动端添加食品页标签上限信息图标无法点击：触控区域 16px → 44px'
        ]
      }
    ]
  },
  'v2.8.0-alpha': {
    date: '2026-05-21',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '邀请码注册系统：INVITE_MODE 环境变量开关 + 5 个种子邀请码，check-email / verify-invite 新接口',
          '内测协议（betaAgreement.js）：独立 HTML 文档，邀请码输入区内联展示 + 勾选确认',
          '数据库管理脚本 server/manage.js：复用 DATABASE_PATH 变量，写操作需 --yes 确认，防误操作',
          '登录页验证码/密码 Tab 切换器，URL query 参数同步模式状态'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '徽章系统 UI 重构：圆点标记改为渐变光环边框，3 处头像位置效果统一',
          '用户协议与隐私政策：新增邀请码注册说明 + 邀请码数据收集声明',
          '开发文档重写：新增邀请码系统章节 + 数据库管理工具章节 + 徽章运维操作更新',
          '诊断日志新增 userBadge 字段，辅助排查徽章显示问题'
        ]
      },
      {
        type: '修复',
        color: 'red',
        items: [
          '邀请码验证 SQL 中 datetime("now") 双引号被 SQLite 当列名的错误',
          'LoginView.vue 邀请码区域模板嵌套错误'
        ]
      }
    ]
  },
  'v2.7.1-alpha': {
    date: '2026-05-21',
    sections: [
      {
        type: '优化',
        color: 'blue',
        items: [
          '用户协议排版：功能列表改列表项、账号安全拆分、数据管理操作分段',
          '隐私政策排版：诊断日志拆段、修复 HTML 闭合标签 bug',
          'README 路线图更新 + 补充在线演示链接',
          '版本日志弹窗重构：新增 changelog.js 独立数据文件，收录 21 个版本完整历史日志',
          '版本日志下拉选择器按 minor 分组（2.7.x / 2.6 / 2.5.x …），支持折叠/展开',
          '版本日志内容区动态渲染，选中版本即时切换，弹窗高度固定不增长'
        ]
      },
      {
        type: '修复',
        color: 'red',
        items: [
          '隐私政策第七节缺少闭合标签导致显示异常'
        ]
      }
    ]
  },
  'v2.7.0-alpha': {
    date: '2026-05-21',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '标签持久化系统：独立 tags 表，移除食品标签不会全局删除',
          '标签管理页：8 标签上限 + 计数器 + 新建标签 API（POST /api/foods/tags）',
          '排序切换：搜索框旁胶囊形排序器（按添加时间 / 按到期紧急程度）',
          '关于详情页：开发者信息、GitHub 开源链接、反馈邮箱、版本日志',
          '食品详情页改为只读模式（移除编辑/删除按钮）'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '移动端二维码卡片：3 位数字显示剩余天数，替代两列文字',
          '移动端筛选栏：三字按钮自适应换行',
          '移动端食品卡片：剩余天数 + 日期两行布局',
          '标签筛选面板：移动端右对齐、纵向排列',
          '搜索框改为胶囊形，与排序切换器视觉统一',
          '条形码扫描器：降低 FPS、移除实验性 BarcodeDetector，提升性能',
          '诊断日志覆盖：标签、排序、扫码、导出、资料编辑',
          '用户协议与隐私政策：标签持久化、诊断日志声明更新'
        ]
      },
      {
        type: '修复',
        color: 'red',
        items: [
          '食品详情页返回按钮错误导航到首页'
        ]
      }
    ]
  },
  'v2.6.0-alpha': {
    date: '2026-05-20',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '完整标签管理系统：彩色胶囊标签输入 + 已有标签补全 + 全局 8 标签上限',
          '标签筛选栏：支持按标签过滤食品列表',
          '标签管理页：设置 → 数据管理 → 标签管理，支持全局删除标签',
          '食品详情页彩色标签胶囊展示',
          '全局删除标签 API：DELETE /api/foods/tags/:tagName',
          '数据库 tags 列迁移（TEXT DEFAULT \'[]\'）',
          '首页已过期栏目：与临期双栏并排，最多 2 条，无数据时友好提示',
          '二维码页根据状态变颜色：可食用绿 / 临期黄 / 过期红',
          '二维码卡片显示彩色剩余天数'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '首页精简：删除快捷入口卡片，改为临期+过期双栏一屏展示',
          '标签输入超限时禁用输入框 + ℹ 图标点击弹窗提示解决路径',
          '二维码卡片同一行左右并排显示过期日期和剩余天数'
        ]
      },
      {
        type: '修复',
        color: 'red',
        items: [
          '标签计数器改为全局 allTags.length，正确反映系统标签总数',
          '模板内联 .filter() 改为 computed 属性，避免性能卡顿',
          '超限弹窗使用 <Teleport to="body"> 确保正常显示',
          '标签管理删除确认弹窗 tagCounts 正确解包 ref（.value）',
          '标签管理图标替换为 Heroicons 标准标签形状'
        ]
      }
    ]
  },
  'v2.5.4-alpha': {
    date: '2026-05-20',
    sections: [
      {
        type: '修复',
        color: 'red',
        items: [
          '扫码页摄像头视频异常放大（移除 object-fit: cover）',
          '条形码扫码框宽度过小（宽度翻倍）'
        ]
      }
    ]
  },
  'v2.5.3-alpha': {
    date: '2026-05-20',
    sections: [
      {
        type: '修复',
        color: 'red',
        items: [
          '扫码页摄像头画面未铺满容器（四周黑边问题）',
          '二维码扫码框被压缩成竖长方形（改为正方形）',
          '条形码扫码框高度过大（改为扁长形更匹配条码）'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          'aspectRatio 根据屏幕实际比例动态计算，不再硬编码',
          '新增 CSS 强制 video 元素 object-fit: cover 铺满'
        ]
      }
    ]
  },
  'v2.5.2-alpha': {
    date: '2026-05-20',
    sections: [
      {
        type: '修复',
        color: 'red',
        items: [
          '设置页版本号不显示：__APP_VERSION__ 未暴露给 Vue 模板'
        ]
      }
    ]
  },
  'v2.5.1-alpha': {
    date: '2026-05-20',
    sections: [
      {
        type: '修复',
        color: 'red',
        items: [
          '二维码扫码框：恢复正方形比例并居中显示'
        ]
      }
    ]
  },
  'v2.5.0-alpha': {
    date: '2026-05-20',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '独立全屏扫码页 (ScanView)，摄像头不再嵌入表单',
          '扫码 10 秒超时温馨提醒，可重试或返回手动录入',
          '二维码批量打印页面 (QRCodesView)',
          '5 按钮底部导航栏：首页 / 食品 / 二维码 / 扫码 / 设置',
          'PC 端桌面导航栏 (DesktopHeader)',
          '诊断日志系统：API 调用追踪、路由追踪、一键导出按钮',
          '保质期录入支持天 / 周 / 月单位切换',
          '详情页保质期按原始录入单位显示',
          '开发环境真实 JWT 模拟登录 (/api/auth/dev-login)'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '手机端食品卡片新增编辑/删除图标按钮（行内显示，不撑高卡片）',
          '设置页布局重排：数据管理提至关于上方',
          '关于内部重排：版本号 → 用户协议 → 隐私政策 → 导出诊断日志',
          '首页改为仪表盘：统计卡片 + 临期提醒 + 快捷入口',
          '扫码页 UI 匹配整体设计语言',
          '扫码返回自动恢复表单状态'
        ]
      },
      {
        type: '修复',
        color: 'red',
        items: [
          'PC 端添加按钮在非食品页无法打开表单',
          '扫码页返回按钮在摄像头未就绪时无响应',
          '条形码扫描速度慢 — 指定格式列表 + BarcodeDetector API'
        ]
      }
    ]
  },
  'v2.1.5-alpha': {
    date: '2026-05-20',
    sections: [
      {
        type: '修复',
        color: 'red',
        items: [
          'PC 端设置页无返回入口 — 添加桌面端专属「返回首页」按钮',
          '首页切设置页导航栏跳动 — scrollbar-gutter: stable 预留滚动条空间'
        ]
      }
    ]
  },
  'v2.1.4-alpha': {
    date: '2026-05-20',
    sections: [
      {
        type: '优化',
        color: 'blue',
        items: [
          '品牌字体切换为 Playfair Display + Noto Serif SC — 英文优雅衬线 + 中文思源宋体',
          '设置页去 Header — 移除割裂的「返回首页」按钮，底部导航栏扩展至设置页',
          '设置页底部留白 — 防止导航栏遮挡内容'
        ]
      }
    ]
  },
  'v2.1.3-alpha': {
    date: '2026-05-20',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '编辑资料二级页面 — 头像选择（9 宫格）、昵称/签名修改、保存',
          '设置页「编辑」按钮入口 — 替代旧的内联编辑'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '设置页交互重构 — 资料行为纯只读展示，编辑统一走二级页面',
          '头像选择面板复用注册页风格 — 简洁底部面板'
        ]
      },
      {
        type: '修复',
        color: 'red',
        items: [
          '保存资料后 localStorage 不同步 — 刷新不丢失修改'
        ]
      }
    ]
  },
  'v2.1.2-alpha': {
    date: '2026-05-20',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '注册流程升级为 5 步向导（邮箱验证 → 密码 → 头像 → 资料 → 成功页）',
          '头像选择器（9 宫格 Lorelei 风格 + 换一批）',
          '个性签名字段（bio）',
          '注册成功页（UID 展示 + 五彩纸屑动画）'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '头像风格从 thumbs 切换为 lorelei',
          '开发模式自动跳过 Turnstile 人机验证（前后端）',
          '开发模式验证码输出到终端（不调用 Resend）'
        ]
      }
    ]
  },
  'v2.1.1-alpha': {
    date: '2026-05-20',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '全屏开发水印 — 斜向平铺，标注「开发预览版」+ 网址，防止截图误传',
          '水印开关机制 — 通过 client/.env 的 VITE_ENABLE_WATERMARK 控制，上线一键关闭',
          '.gitignore 白名单放行 client/.env（仅允许非敏感前端配置上传）'
        ]
      },
      {
        type: '修复',
        color: 'red',
        items: [
          'PC 端登录后导航栏按钮靠左问题 — 已登录时「添加食品」+ 头像增加 ml-auto 靠右对齐'
        ]
      }
    ]
  },
  'v2.1.0-alpha': {
    date: '2026-05-20',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '设置页 UI 全面重构 — 参考「有数」设计风格，分组式图标列表布局',
          '数据管理功能 — JSON 格式导出/导入食品数据，支持去重',
          'PWA 支持 — 可添加到桌面，Service Worker 离线缓存策略',
          '品牌横幅卡 — 绿色渐变背景，显示已管理食品数量',
          '开发模式模拟登录按钮（生产环境自动移除）'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '设置页分组：个人资料 / 数据管理 / 关于 / 账号与安全',
          '每行设置项带彩色圆形图标（蓝/琥珀/绿/紫/红/灰）',
          '退出登录增加确认弹窗（useConfirm）',
          '未登录状态品牌化 — 横幅 + 功能列表带图标',
          '当前版本号显示在关于区块顶部'
        ]
      },
      {
        type: '修复',
        color: 'red',
        items: [
          '导入数据无去重问题（按 name+produce_date 去重）'
        ]
      }
    ]
  },
  'v2.0.0-alpha': {
    date: '2026-05-19',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '完整认证系统 — 邮箱验证码 + 密码双模式登录/注册',
          'JWT 鉴权（HMAC-SHA256，30 天有效期）+ Bearer Token 中间件',
          'Cloudflare Turnstile 人机验证（发送验证码前必须完成）',
          'Resend 邮件 API 集成，发送 6 位数字验证码邮件',
          '用户协议 & 隐私政策 — 注册前必须同意',
          '自动注册提示 — 未注册邮箱验证通过后自动创建账号',
          '用户徽章系统 — 开发者 / 内测 / 共创者徽章（SQL 即可配置）',
          '登录页 3 步向导（邮箱 → 验证码 → 注册）',
          '设置页双态（未登录欢迎页 / 已登录资料编辑页）',
          'PC 端 Header 导航 — 已登录显示头像+设置，未登录显示登录按钮'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          'foods 路由增加用户数据隔离（user_id 权限控制）',
          '历史食品数据保持公开可访问（user_id 允许 NULL）',
          '密码安全：scrypt 哈希 + 随机盐 + timingSafeEqual 比较',
          '频率限制：IP 级别滑动窗口（发送验证码 3 次/分钟）',
          '开发文档全面重写（排版优化 + 新功能文档补充）'
        ]
      }
    ]
  },
  'v1.3.0-alpha': {
    date: '2026-05-19',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '底部胶囊导航栏（仅手机端），中间凸起圆形"+"按钮',
          '霞鹜文楷 + Nunito 字体引入（Google Fonts）',
          'Tailwind v4 自定义主题色 — 草绿色系主色调'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '全局视觉风格升级：卡片增强阴影 + 左侧状态色条（绿/黄/红）',
          '背景色改为极淡绿灰（bg-bg）',
          '确认弹窗圆角加大、阴影柔和，与新风格统一',
          '详情页返回按钮改为胶囊形带图标'
        ]
      }
    ]
  },
  'v1.2.2-alpha': {
    date: '2026-05-19',
    sections: [
      {
        type: '修复',
        color: 'red',
        items: [
          '扫码框高度 — 增加条形码扫码框高度，提升扫码体验'
        ]
      }
    ]
  },
  'v1.2.1-alpha': {
    date: '2026-05-18',
    sections: [
      {
        type: '优化',
        color: 'blue',
        items: [
          '手机扫码框大小 — 缩小手机端扫码框，改善条形码/二维码对焦和识别体验'
        ]
      }
    ]
  },
  'v1.2.0-alpha': {
    date: '2026-05-18',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '扫码模式选择 — 可选择扫条形码或二维码',
          '二维码扫描 — 扫描已有食品二维码自动填充名称',
          '自定义确认弹窗 — 替换浏览器原生 confirm，删除操作更优雅'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '手机摄像头支持 — 启用 HTTPS，解决手机浏览器摄像头调用问题',
          '扫码引导线 — 仅在条形码模式下显示，二维码模式隐藏'
        ]
      },
      {
        type: '修复',
        color: 'red',
        items: [
          '手机摄像头访问 — 添加 HTTPS 支持，解决手机浏览器无法调用摄像头的问题'
        ]
      }
    ]
  },
  'v1.1.0-alpha': {
    date: '2026-05-18',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '条形码扫描识别 — 扫码自动填充食品名称（apibyte.cn API）',
          '扫码引导线 — 扫描框中间绿色渐变引导线，辅助对准条形码'
        ]
      },
      {
        type: '优化',
        color: 'blue',
        items: [
          '扫码交互 — 扫码功能集成到添加食品表单内，名称输入框右侧扫码图标',
          '详情页排版 — 二维码提示文字改为两行显示'
        ]
      },
      {
        type: '技术',
        color: 'gray',
        items: [
          '新增 /api/barcode/:code 路由，代理条形码查询 API',
          '新增 dotenv 依赖，支持 .env 环境变量配置',
          '新增 html5-qrcode 依赖，支持摄像头扫码'
        ]
      }
    ]
  },
  'v1.0.0': {
    date: '2026-05-18',
    sections: [
      {
        type: '新增',
        color: 'green',
        items: [
          '食品管理核心功能 — 录入、编辑、删除食品',
          '自动过期状态计算 — 可食用（>14天）/ 临期（≤14天）/ 已过期',
          '二维码生成 — 每个食品生成专属二维码，扫码直达详情页',
          '响应式双视图布局 — PC 端表格视图宽屏管理面板 / 手机端卡片列表紧凑操作 / 详情页 PC 左右分栏手机上下堆叠',
          '食品详情页 — 完整信息展示 + 可打印二维码',
          '删除确认弹窗，防止误操作'
        ]
      },
      {
        type: '技术栈',
        color: 'gray',
        items: [
          '前端：Vue 3 + Vite + Tailwind CSS + Vue Router',
          '后端：Express.js + better-sqlite3 (SQLite)',
          '二维码：node-qrcode'
        ]
      }
    ]
  }
}

// 按 minor 分组
export function getGroupedVersions() {
  const groups = {}
  for (const v of changelogVersions) {
    if (!groups[v.group]) groups[v.group] = []
    groups[v.group].push(v)
  }
  return groups
}
