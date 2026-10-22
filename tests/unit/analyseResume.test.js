jest.mock('../../src/db/models', () => ({
	resume: {
		findOne: jest.fn(),
		update: jest.fn().mockResolvedValue([1]),
	},
	resume_feedback: {
		create: jest.fn(),
	},
}));

const mockGenerateContent = jest.fn();
jest.mock('@google/generative-ai', () => ({
	GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
		getGenerativeModel: jest.fn(() => ({ generateContent: mockGenerateContent })),
	})),
}));

const httpStatus = require('http-status');
const db = require('../../src/db/models');
const { analyseResume } = require('../../src/services/resume.service');

function geminiResponse(text) {
	return { response: { text: () => text } };
}

describe('analyseResume', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		db.resume.update.mockResolvedValue([1]);
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		console.error.mockRestore();
	});

	it('throws a 404 ApiError when the resume does not belong to the user', async () => {
		db.resume.findOne.mockResolvedValue(null);

		await expect(analyseResume('resume-1', 'user-1')).rejects.toMatchObject({
			statusCode: httpStatus.NOT_FOUND,
		});
	});

	it('throws a 400 ApiError when the resume has no extracted text', async () => {
		db.resume.findOne.mockResolvedValue({ id: 'resume-1', extracted_text: null });

		await expect(analyseResume('resume-1', 'user-1')).rejects.toMatchObject({
			statusCode: httpStatus.BAD_REQUEST,
		});
	});

	it('throws a 500 ApiError when the Gemini API call itself fails', async () => {
		db.resume.findOne.mockResolvedValue({ id: 'resume-1', extracted_text: 'some resume text' });
		mockGenerateContent.mockRejectedValue(new Error('network timeout'));

		await expect(analyseResume('resume-1', 'user-1')).rejects.toMatchObject({
			statusCode: httpStatus.INTERNAL_SERVER_ERROR,
			message: 'LLM request failed',
		});
	});

	it('throws a 500 ApiError when Gemini returns text that is not valid JSON', async () => {
		db.resume.findOne.mockResolvedValue({ id: 'resume-1', extracted_text: 'some resume text' });
		mockGenerateContent.mockResolvedValue(
			geminiResponse('Sorry, I cannot analyze this resume right now.')
		);

		await expect(analyseResume('resume-1', 'user-1')).rejects.toMatchObject({
			statusCode: httpStatus.INTERNAL_SERVER_ERROR,
			message: 'Failed to parse LLM response as JSON',
		});
	});

	it('strips ```json code fences before parsing a valid Gemini response, then saves it', async () => {
		db.resume.findOne.mockResolvedValue({ id: 'resume-1', extracted_text: 'some resume text' });

		const feedbackPayload = {
			ats_score: 82,
			tone_score: 75,
			content_score: 80,
			structure_score: 88,
			skills_score: 70,
			overall_score: 79,
			skills_found: ['Node.js'],
			missing_skills: ['Kubernetes'],
			strengths: ['Clear structure'],
			weaknesses: ['No metrics'],
			suggestions: ['Quantify achievements'],
			tips: [{ category: 'content', message: 'Add numbers', severity: 'medium' }],
		};
		mockGenerateContent.mockResolvedValue(
			geminiResponse('```json\n' + JSON.stringify(feedbackPayload) + '\n```')
		);
		db.resume_feedback.create.mockResolvedValue({
			get: () => ({ id: 'feedback-1', ...feedbackPayload }),
		});

		const feedback = await analyseResume('resume-1', 'user-1');

		expect(feedback.ats_score).toBe(82);
		expect(db.resume_feedback.create).toHaveBeenCalledWith(
			expect.objectContaining({ resume_id: 'resume-1', ats_score: 82 })
		);
		expect(db.resume.update).toHaveBeenCalledWith(
			{ status: 'completed' },
			{ where: { id: 'resume-1' } }
		);
	});
});