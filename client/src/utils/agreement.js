export const USER_AGREEMENT_HTML = `
<div class="space-y-4">
  <h3 class="text-base font-semibold text-gray-800">一、服务描述</h3>
  <p>Datelife（"食品日期管理"）是一款用于帮助用户管理食品保质期的在线工具。</p>
  <p>主要功能包括：</p>
  <ul class="list-disc pl-5 space-y-1">
    <li>录入食品的生产日期和保质期</li>
    <li>自动计算过期时间并标记状态（正常 / 临期 / 过期）</li>
    <li>通过扫码（条形码 / 二维码）快速识别和查询食品信息</li>
    <li>为每个食品生成专属二维码供扫码查看详情</li>
    <li>标签管理（自定义标签全局持久存储、按标签筛选和批量管理，最多支持 8 个标签）</li>
    <li>邀请码注册（INVITE_MODE 模式下新用户需凭邀请码完成注册，包含内测协议确认）</li>
    <li>数据的导入与导出备份</li>
    <li>食品数据采用软删除机制，删除或消费后数据仍保留，已印出的二维码持续有效</li>
  </ul>

  <h3 class="text-base font-semibold text-gray-800">二、用户账号</h3>
  <p>使用 Datelife 的云端同步功能需要注册账号。账号安全由您自行负责：</p>
  <ul class="list-disc pl-5 space-y-1">
    <li>妥善保管登录密码</li>
    <li>不向他人泄露验证码</li>
    <li>及时退出公共设备上的登录状态</li>
  </ul>
  <p>Datelife 不会以任何理由主动询问您的密码。</p>

  <h3 class="text-base font-semibold text-gray-800">三、用户行为规范</h3>
  <p>在使用 Datelife 服务时，您同意不会从事以下行为：</p>
  <ul class="list-disc pl-5 space-y-1">
    <li>利用本平台进行任何非法活动</li>
    <li>对本平台进行技术攻击或干扰（包括但不限于：暴力破解、DDoS 攻击、爬取数据）</li>
    <li>批量注册虚假账号</li>
    <li>滥用扫码功能进行未经授权的批量采集</li>
    <li>导入包含恶意代码或异常格式的备份文件</li>
    <li>录入违反法律法规的食品信息或内容</li>
    <li>利用本平台传播有害信息</li>
  </ul>

  <h3 class="text-base font-semibold text-gray-800">四、知识产权</h3>
  <p>您录入的所有食品数据归您所有。Datelife 平台的代码、设计、商标等知识产权归开发者所有，受法律保护。</p>

  <h3 class="text-base font-semibold text-gray-800">五、数据管理操作</h3>
  <p>部分数据管理操作（如全局删除标签）为批量修改操作，一旦执行将不可撤销。系统在执行此类操作前会弹出确认提示，请仔细核对后再确认。</p>

  <p><strong>标签持久存储</strong>：您添加的自定义标签独立存储于系统中，即使从所有食品中移除该标签，标签名称仍会保留，直到您在「标签管理」页面主动执行全局删除。全局删除将同时从标签列表和所有关联食品中移除该标签（系统最多支持 8 个标签）。用户应对自己的数据管理操作负责。</p>

  <p><strong>食品软删除</strong>：删除或消费食品后，该食品记录不会从数据库中物理移除，而是标记为已消费状态。这是为了确保已印出的二维码持续有效——扫码仍可查看食品的基本信息。已消费的食品不会出现在您的食品列表中。</p>

  <h3 class="text-base font-semibold text-gray-800">六、服务可用性</h3>
  <p>我们将尽最大努力保证服务的稳定运行，但不对因不可抗力（包括但不限于：服务器故障、网络中断、第三方服务异常）导致的服务中断承担责任。服务可能会在不预先通知的情况下进行维护升级。</p>

  <h3 class="text-base font-semibold text-gray-800">七、免责声明</h3>
  <p>Datelife 按「现状」(As Is) 提供服务，不对以下情况承担任何责任：</p>
  <ul class="list-disc pl-5 space-y-1">
    <li>因您自身原因（如密码泄露、设备丢失）导致的数据泄露或损失</li>
    <li>基于我们提供的数据计算出的过期时间与实际过期时间存在偏差导致的食品误食</li>
    <li>因未及时查看提醒而食用过期食品造成的任何健康问题</li>
  </ul>

  <h3 class="text-base font-semibold text-gray-800">八、协议变更</h3>
  <p>我们有权在必要时修改本协议内容。修改后的协议将在应用内公示，您继续使用 Datelife 即视为同意修改后的协议。</p>

  <h3 class="text-base font-semibold text-gray-800">九、适用法律</h3>
  <p>本协议的解释、效力及纠纷解决均适用中华人民共和国法律。系统中所有日期和时间的计算均以 UTC+8（中国标准时间）为基准。</p>
</div>
<p class="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-200">最后更新：2026 年 5 月 26 日</p>
`

export const PRIVACY_POLICY_HTML = `
<div class="space-y-4">
  <h3 class="text-base font-semibold text-gray-800">一、信息收集</h3>
  <p>为了提供 Datelife 服务，我们会收集以下信息：</p>
  <ul class="list-disc pl-5 space-y-1">
    <li><strong>账号信息</strong>：邮箱地址、昵称、头像种子</li>
    <li><strong>业务数据</strong>：您录入的食品名称、生产日期、保质期、条形码、自定义标签等数据。删除或消费食品后，记录仍保留（含消费时间戳）以确保二维码持续可用</li>
    <li><strong>设备权限</strong>：扫码功能需要临时调用摄像头。摄像头仅在扫码期间使用，<strong>不会存储、录制或传输任何图像数据</strong></li>
  </ul>
  <p><strong>我们不会收集</strong>：真实姓名、身份证号、手机号码、位置信息等敏感个人信息。</p>
  <p><strong>标签隐私提示</strong>：自定义标签用于食品分类管理，建议避免在标签中使用真实姓名、身份证号、手机号等敏感个人信息。</p>

  <p><strong>邀请码信息</strong>：当 INVITE_MODE 启用时，注册需提供邀请码。邀请码使用记录（使用者 UID、使用时间）存储在服务端，仅用于限制邀请码使用次数。邀请码本身不包含您的个人身份信息。</p>

  <p><strong>诊断日志</strong>：应用中包含一个本地诊断日志系统，记录应用运行状态、API 调用、路由跳转等非敏感信息。日志<strong>仅存储在您的浏览器本地</strong>，不会自动上传。</p>

  <p>只有在您主动使用「导出诊断日志」功能并手动发送给我们时，我们才能获取这些日志用于问题排查。</p>

  <p>日志内容不包含密码、完整条码数据等敏感信息，但可能包含标签名称。建议避免在标签中使用个人敏感信息。</p>

  <h3 class="text-base font-semibold text-gray-800">二、信息使用</h3>
  <p>收集的信息仅用于以下目的：</p>
  <ul class="list-disc pl-5 space-y-1">
    <li>为您提供云同步功能，使您的食品数据可在多设备间访问</li>
    <li>发送验证码邮件以完成身份验证</li>
    <li>生成和管理您的专属头像</li>
    <li>改进和优化我们的产品和服务</li>
  </ul>
  <p><strong>我们承诺</strong>：不出售、不共享、不交易您的任何个人数据。您的数据不会被用于任何 AI 模型训练。</p>

  <h3 class="text-base font-semibold text-gray-800">三、信息存储</h3>
  <ul class="list-disc pl-5 space-y-1">
    <li><strong>本地存储</strong>：使用浏览器 localStorage 存储登录状态令牌 (Token)</li>
    <li><strong>服务端存储</strong>：您的加密密码哈希值和个人数据存储在我们的数据库中</li>
    <li>登录令牌 (JWT) 有效期为 30 天，过期后需重新登录</li>
    <li>密码采用 scrypt 算法进行单向哈希存储，即使我们也无法还原您的原始密码</li>
  </ul>

  <h3 class="text-base font-semibold text-gray-800">四、信息保护</h3>
  <ul class="list-disc pl-5 space-y-1">
    <li>所有数据传输均通过 HTTPS 加密通道</li>
    <li>密码经过单向哈希处理，不以明文形式存储</li>
    <li>数据库部署在持久化存储卷中，避免容器重启导致数据丢失</li>
    <li>我们对 API 接口实施速率限制，防止暴力破解</li>
  </ul>

  <h3 class="text-base font-semibold text-gray-800">五、用户权利</h3>
  <p>您对个人数据享有以下权利：</p>
  <ul class="list-disc pl-5 space-y-1">
    <li><strong>导出数据</strong>：您可以随时请求获取我们持有的您的所有数据副本，包括食品信息和标签数据</li>
    <li><strong>删除数据</strong>：退出登录可清除本地缓存；您可在设置页删除单个食品或全局删除标签；如需删除全部服务器端数据，请通过设置页操作或联系我们（将在 7 个工作日内处理）</li>
    <li><strong>更正信息</strong>：您可以随时修改昵称、个性签名等信息</li>
    <li><strong>拒绝非必要收集</strong>：除账号必需信息外，其他信息均为可选填写</li>
  </ul>

  <h3 class="text-base font-semibold text-gray-800">六、Cookie 与本地存储</h3>
  <p>我们仅在您的浏览器中使用 localStorage 来保存登录状态，不使用任何第三方 Cookie，也不嵌入任何追踪脚本或分析工具。</p>

  <h3 class="text-base font-semibold text-gray-800">七、第三方服务</h3>
  <p>为提供完整服务，我们集成了以下第三方服务：</p>
  <ul class="list-disc pl-5 space-y-1">
    <li><strong>Resend</strong> — 用于发送验证码邮件（邮件服务商，美国）</li>
    <li><strong>DiceBear</strong> — 用于根据头像种子生成个性化头像图片（德国）</li>
    <li><strong>Cloudflare Turnstile</strong> — 用于人机验证，防止自动化滥用（美国）</li>
    <li><strong>apibyte.cn</strong> — 用于查询商品条形码信息（中国）</li>
  </ul>
  <p>这些服务均有各自独立的隐私政策。我们确保这些集成符合最小必要原则。</p>

  <h3 class="text-base font-semibold text-gray-800">八、数据保留与删除</h3>
  <ul class="list-disc pl-5 space-y-1">
    <li>在您账号存续期间，我们将保留您的数据</li>
    <li>删除或消费的食品记录会保留软删除标记，以确保已印出的二维码持续有效</li>
    <li>如您发起删除全部数据的请求，我们将在 7 个工作日内完成彻底删除</li>
    <li>如计划停止运营，我们将至少提前 30 天通知用户进行数据备份</li>
  </ul>

  <h3 class="text-base font-semibold text-gray-800">九、未成年人保护</h3>
  <p>如果您未满 14 周岁，请在监护人的陪同和同意下使用本服务。如发现未成年人未经监护人同意注册了账号，请联系我们进行处理。</p>

  <h3 class="text-base font-semibold text-gray-800">十、政策更新</h3>
  <p>当本隐私政策发生重大变更时，我们将在应用内显著位置发布更新通知。建议您定期查阅本政策以了解最新信息。</p>
</div>
<p class="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-200">最后更新：2026 年 5 月 26 日</p>
`
