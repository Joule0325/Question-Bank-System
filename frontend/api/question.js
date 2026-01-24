import { request } from '@/utils/request.js';

export const getSubjects = () => { return request({ url: '/api/subjects', method: 'GET' }); };
export const getCategories = (subjectId) => { return request({ url: '/api/categories', method: 'GET', data: { subjectId } }); };

// [修改] 传递 subjectId 以获取特定科目的筛选条件
export const getFilters = (subjectId) => {
    return request({
        url: '/api/filters',
        method: 'GET',
        data: { subjectId }
    });
};

export const getQuestions = (params) => { return request({ url: '/api/questions', method: 'GET', data: params }); };
export const saveQuestion = (data) => { return request({ url: '/api/questions', method: 'POST', data: data }); };
export const updateQuestion = (id, data) => { return request({ url: `/api/questions/${id}`, method: 'PUT', data: data }); };
export const deleteQuestion = (id) => { return request({ url: `/api/questions/${id}`, method: 'DELETE' }); };
export const manageCategory = (payload) => { return request({ url: '/api/categories/manage', method: 'POST', data: payload }); };