// utils/request.js

// ⚠️ 重要：配置后端地址
// 1. 如果你只在电脑浏览器(H5)调试，可以用 'http://localhost:3001'
// 2. 如果你要用手机 App 或小程序调试，必须把 'localhost' 改成你电脑的局域网 IP (例如 192.168.1.5)
// 3. 这里的 /api 是为了适配你后端的路由
const BASE_URL = 'http://localhost:3001'; 
//const BASE_URL = 'http://120.27.108.202'; 

export const request = (options) => {
	return new Promise((resolve, reject) => {
		const token = uni.getStorageSync('token');
		const header = {
			'content-type': 'application/json',
			...options.header 
		};
		
		if (token) {
			header['Authorization'] = 'Bearer ' + token;
		}

		uni.request({
			url: BASE_URL + options.url, 
			method: options.method || 'GET',
			data: options.data || {},
			header: header,
			success: (res) => {
				console.log(`【${options.method}】${options.url}`, res.statusCode);
				
				if (res.statusCode === 200) {
					resolve(res.data);
				} else if (res.statusCode === 401) {
					// 【修改点】如果是公共模式下触发的 401，不强制跳转登录
					if (options.data && options.data.mode === 'public') {
						console.warn('公共模式下未登录，忽略跳转');
						resolve({ data: [] }); 
					} else {
						uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
						uni.removeStorageSync('token');
						uni.removeStorageSync('user');
						setTimeout(() => {
							uni.redirectTo({ url: '/pages/login/login' });
						}, 1000);
						reject(res.data);
					}
				} else {
					uni.showToast({
						title: res.data.error || '请求失败',
						icon: 'none'
					});
					reject(res.data);
				}
			},
			fail: (err) => {
				uni.showToast({ title: '网络连接失败', icon: 'none' });
				reject(err);
			}
		});
	});
};

export const baseUrl = BASE_URL;