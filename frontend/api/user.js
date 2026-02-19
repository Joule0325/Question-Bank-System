import { request } from '@/utils/request.js';

// 关注用户
export const followUser = (targetId) => {
    return request({
        url: '/api/user/follow',
        method: 'POST',
        data: { targetId }
    });
};