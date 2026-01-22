// utils/request.js

// ⚠️ 重要：配置后端地址
// 1. 如果你只在电脑浏览器(H5)调试，可以用 'http://localhost:3001'
// 2. 如果你要用手机 App 或小程序调试，必须把 'localhost' 改成你电脑的局域网 IP (例如 192.168.1.5)
// 3. 这里的 /api 是为了适配你后端的路由
const BASE_URL = 'http://localhost:3001'; 

export const request = (options) => {
	return new Promise((resolve, reject) => {
		// uni.request 是 UniApp 提供的核心网络请求 API
		uni.request({
			url: BASE_URL + options.url, // 拼接完整的接口地址
			method: options.method || 'GET', // 默认为 GET
			data: options.data || {}, // 参数
			header: {
				'content-type': 'application/json' // 默认 JSON 格式
				// 以后这里可以加 token: 'Bearer ' + token
			},
			success: (res) => {
				// 打印一下日志，方便你调试
				console.log(`【${options.method}】${options.url}`, res.data);
				
				// 判断 HTTP 状态码
				if (res.statusCode === 200) {
					// 请求成功，返回后端的数据
					resolve(res.data);
				} else {
					// 后端报错 (比如 404, 500)
					uni.showToast({
						title: '接口请求失败',
						icon: 'none'
					});
					reject(res.errMsg || '请求失败');
				}
			},
			fail: (err) => {
				// 网络完全不通的情况 (比如后端没启动，或者 IP 填错了)
				uni.showToast({
					title: '网络连接失败',
					icon: 'none'
				});
				console.error('网络错误:', err);
				reject(err);
			}
		});
	});
};

// 导出基础地址，以后上传图片可能需要直接拼 URL
export const baseUrl = BASE_URL;