// api/question.js
import { request } from '@/utils/request.js'; // @ 代表项目根目录

// 1. 获取所有科目
export const getSubjects = () => {
	return request({
		url: '/api/subjects',
		method: 'GET'
	});
};

// 2. 获取目录树 (Categories)
export const getCategories = (subjectId) => {
	return request({
		url: '/api/categories',
		method: 'GET',
		data: { subjectId } // UniApp 会自动把它拼成 ?subjectId=xxx
	});
};

// 3. 获取题目列表
export const getQuestions = (params) => {
	// params 包含: subjectId, categoryIds, tags, type, difficulty
	return request({
		url: '/api/questions',
		method: 'GET',
		data: params 
	});
};

// 4. 保存/录入题目 (POST)
export const saveQuestion = (data) => {
	return request({
		url: '/api/questions',
		method: 'POST',
		data: data
	});
};

// 5. 更新题目 (PUT)
export const updateQuestion = (id, data) => {
	return request({
		url: `/api/questions/${id}`,
		method: 'PUT',
		data: data
	});
};

// 6. 删除题目 (DELETE)
export const deleteQuestion = (id) => {
	return request({
		url: `/api/questions/${id}`,
		method: 'DELETE'
	});
};

// 7. 目录管理 (新增目录)
export const manageCategory = (payload) => {
    return request({
        url: '/api/categories/manage',
        method: 'POST',
        data: payload
    });
};