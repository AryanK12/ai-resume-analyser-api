const fs = require('fs');
const pdfParse = require('pdf-parse');
const httpStatus = require('http-status');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getOffset } = require('../utils/query');
const ApiError = require('../utils/ApiError');
const config = require('../config/config.js');
const db = require('../db/models');

async function extractTextFromPdf(filePath) {
	try {
		const dataBuffer = fs.readFileSync(filePath);
		const data = await pdfParse(dataBuffer);
		return data.text;
	} catch (error) {
		console.error('PDF parsing error:', error.message);
		return null;
	}
}

async function createResume(userId, file, body) {
	const { jobTitle, jobDescription } = body;

	const extractedText = await extractTextFromPdf(file.path);

	const resume = await db.resume
		.create({
			user_id: userId,
			file_name: file.originalname,
			file_url: file.path,
			job_title: jobTitle || null,
			job_description: jobDescription || null,
			extracted_text: extractedText,
			status: extractedText ? 'pending' : 'failed',
		})
		.then((resultEntity) => resultEntity.get({ plain: true }));

	if (!extractedText) {
		return { resume, feedback: null };
	}

	try {
		const feedback = await analyseResume(resume.id, userId);
		return { resume: { ...resume, status: 'completed' }, feedback };
	} catch (error) {
		console.error('Auto-analysis failed:', error.message);
		return { resume, feedback: null };
	}
}

async function getResumeById(resumeId, userId) {
	const resume = await db.resume.findOne({
		where: { id: resumeId, user_id: userId },
		include: [
			{
				model: db.resume_feedback,
				required: false,
			},
		],
	});

	return resume;
}

async function getResumes(req) {	
	const { page: defaultPage, limit: defaultLimit } = config.pagination;
	const { page = defaultPage, limit = defaultLimit } = req.query;
	const userId = req.user.userId;

	const offset = getOffset(page, limit);

	const resumes = await db.resume.findAndCountAll({
		where: { user_id: userId },
		order: [['created_date_time', 'DESC']],
		offset,
		limit,
		raw: true,
	});

	return resumes;
}

async function deleteResumeById(resumeId, userId) {
	const resume = await db.resume.findOne({
		where: { id: resumeId, user_id: userId },
	});

	if (!resume) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Resume not found');
	}

	await db.resume.destroy({
		where: { id: resumeId },
	});

	return true;
}

async function analyseResume(resumeId, userId) {
	const resume = await db.resume.findOne({
		where: { id: resumeId, user_id: userId },
	});

	if (!resume) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Resume not found');
	}

	if (!resume.extracted_text) {
		throw new ApiError(httpStatus.BAD_REQUEST, 'No extracted text available for this resume');
	}

	const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
	const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

	const prompt = `You are an ATS (Applicant Tracking System) resume analyzer. Analyze the following resume text and return ONLY a valid JSON object with no markdown formatting, no code blocks, and no extra text — just the raw JSON.

The JSON must have exactly this structure:
{
  "ats_score": <number 0-100>,
  "tone_score": <number 0-100>,
  "content_score": <number 0-100>,
  "structure_score": <number 0-100>,
  "skills_score": <number 0-100>,
  "overall_score": <number 0-100>,
  "skills_found": ["skill1", "skill2"],
  "missing_skills": ["skill1", "skill2"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "tips": [
    { "category": "string", "message": "string", "severity": "low|medium|high" }
  ]
}

Base "missing_skills" on comparing the resume against the target job title/description if provided, otherwise infer likely relevant skills for the candidate's apparent field.

${resume.job_title ? `Target job title: ${resume.job_title}` : ''}
${resume.job_description ? `Job description: ${resume.job_description}` : ''}

Resume text:
${resume.extracted_text}`;

	let rawResponseText;
	try {
		const result = await model.generateContent(prompt);
		rawResponseText = result.response.text();
	} catch (error) {
		console.error('Gemini API error:', error.message);
		throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'LLM request failed');
	}

	let parsedFeedback;
	try {
		const cleanedText = rawResponseText.replace(/```json\n?|```\n?/g, '').trim();
		parsedFeedback = JSON.parse(cleanedText);
	} catch (error) {
		throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to parse LLM response as JSON');
	}

	const feedback = await db.resume_feedback
		.create({
			resume_id: resume.id,
			ats_score: parsedFeedback.ats_score,
			tone_score: parsedFeedback.tone_score,
			content_score: parsedFeedback.content_score,
			structure_score: parsedFeedback.structure_score,
			skills_score: parsedFeedback.skills_score,
			overall_score: parsedFeedback.overall_score,
			tips: parsedFeedback.tips,
			skills_found: parsedFeedback.skills_found,
			missing_skills: parsedFeedback.missing_skills,
			strengths: parsedFeedback.strengths,
			weaknesses: parsedFeedback.weaknesses,
			suggestions: parsedFeedback.suggestions,
			raw_llm_response: parsedFeedback,
		})
		.then((resultEntity) => resultEntity.get({ plain: true }));

	await db.resume.update({ status: 'completed' }, { where: { id: resume.id } });

	return feedback;
}

module.exports = {
	createResume,
	getResumeById,
	getResumes,
	deleteResumeById,
	analyseResume,
	extractTextFromPdf,
};