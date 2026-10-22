const Joi = require('@hapi/joi');

const uploadResume = {
	body: Joi.object().keys({
		jobTitle: Joi.string().allow('', null),
		jobDescription: Joi.string().allow('', null),
	}),
};

const getResumes = {
	query: Joi.object().keys({
		limit: Joi.number().min(1),
		page: Joi.number().min(1),
	}),
};

const getResume = {
	params: Joi.object().keys({
		resumeId: Joi.string(),
	}),
};

const deleteResume = {
	params: Joi.object().keys({
		resumeId: Joi.string(),
	}),
};

const analyseResume = {
	params: Joi.object().keys({
		resumeId: Joi.string(),
	}),
};

module.exports = {
	uploadResume,
	getResumes,
	getResume,
	deleteResume,
	analyseResume,
};