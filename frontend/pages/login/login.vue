<template>
  <view class="auth-container">
    <view class="auth-box">
      <view class="auth-header">
        <text class="tab" :class="{active: isLogin}" @click="isLogin=true">登录</text>
        <text class="tab" :class="{active: !isLogin}" @click="isLogin=false">注册</text>
      </view>
      
      <view class="form-body">
        <input class="input-field" v-model="form.username" placeholder="用户名" />
        <input class="input-field" v-model="form.password" type="password" placeholder="密码" />
        
        <view class="submit-btn" @click="handleSubmit">
          {{ isLogin ? '进入系统' : '立即注册' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { request } from '@/utils/request.js';

const isLogin = ref(true);
const form = reactive({ username: '', password: '' });

const handleSubmit = async () => {
    if(!form.username || !form.password) return uni.showToast({title:'请填写完整', icon:'none'});
    
    const url = isLogin.value ? '/api/auth/login' : '/api/auth/register';
    try {
        const res = await request({ url, method: 'POST', data: form });
        
        if (isLogin.value) {
            // 保存 Token
            uni.setStorageSync('token', res.token);
            
            // === 【核心修复】保存完整的用户信息，包含 VIP 和等级 ===
            uni.setStorageSync('user', { 
                username: res.username,
                role: res.role || 'user',
                uid: res.uid,
                inviteCode: res.inviteCode,
                // 新增保存字段
                level: res.level,
                xp: res.xp,
                vipType: res.vipType,
                vipExpiry: res.vipExpiry,
                vipLevel: res.vipLevel,
                vipXp: res.vipXp,
                avatar: res.avatar,
                nickname: res.nickname
            });
            // ===============================================
        
            uni.showToast({ title: '欢迎回来', icon: 'success' });
            setTimeout(() => {
                uni.reLaunch({ url: '/pages/index/index' });
            }, 500);
        } else {
             uni.showToast({ title: '注册成功，请登录', icon: 'success' });
             isLogin.value = true;
        }
    } catch(e) {
        uni.showToast({ title: e.error || '请求失败', icon: 'none' });
    }
};
</script>

<style lang="scss">
.auth-container { height: 100vh; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
.auth-box { width: 350px; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
.auth-header { display: flex; border-bottom: 2px solid #f1f5f9; margin-bottom: 25px; }
.tab { flex: 1; text-align: center; padding-bottom: 10px; font-weight: bold; color: #94a3b8; cursor: pointer; transition: color 0.3s; }
.tab.active { color: #2563eb; border-bottom: 2px solid #2563eb; margin-bottom: -2px; }
.input-field { background: #f8fafc; border: 1px solid #e2e8f0; height: 45px; border-radius: 8px; margin-bottom: 15px; padding: 0 15px; font-size: 14px; }
.submit-btn { background: #2563eb; color: white; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 10px; }
.submit-btn:hover { background: #1d4ed8; }
</style>