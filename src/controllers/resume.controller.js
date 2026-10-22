const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { resumeService } = require('../services');

const uploadResume = catchAsync(async (req, res) => {
	if (!req.file) {
		throw new ApiError(httpStatus.BAD_REQUEST, 'No file uploaded');
	}
	const { resume, feedback } = await resumeService.createResume(req.user.userId, req.file, req.body);
	res.status(httpStatus.CREATED).send({ resume, feedback });
});

const getResumes = catchAsync(async (req, res) => {
	const resumes = await resumeService.getResumes(req);
	res.send({ resumes });
});

const getResume = catchAsync(async (req, res) => {
	const resume = await resumeService.getResumeById(req.params.resumeId, req.user.userId);
	if (!resume) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Resume not found');
	}
	res.send({ resume });
});

const deleteResume = catchAsync(async (req, res) => {
	await resumeService.deleteResumeById(req.params.resumeId, req.user.userId);
	res.send({ success: true });
});

const analyseResume = catchAsync(async (req, res) => {
	const feedback = await resumeService.analyseResume(req.params.resumeId, req.user.userId);
	res.send({ feedback });
});

module.exports = {
	uploadResume,
	getResumes,
	getResume,
	deleteResume,
	analyseResume,
};