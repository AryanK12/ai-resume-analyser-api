const express = require('express');
const validate = require('../../middlewares/validate');
const upload = require('../../middlewares/upload');
const resumeValidation = require('../../validations/resume.validation');
const resumeController = require('../../controllers/resume.controller');

const router = express.Router();

router
	.route('/')
	.post(
		upload.single('file'),
		validate(resumeValidation.uploadResume),
		resumeController.uploadResume
	)
	.get(validate(resumeValidation.getResumes), resumeController.getResumes);

router
	.route('/:resumeId')
	.get(validate(resumeValidation.getResume), resumeController.getResume)
	.delete(validate(resumeValidation.deleteResume), resumeController.deleteResume);

router
	.route('/:resumeId/analyze')
	.post(validate(resumeValidation.analyseResume), resumeController.analyseResume);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Resumes
 *   description: Resume upload and AI-powered analysis
 */

/**
 * @swagger
 * /resumes:
 *   post:
 *     summary: Upload a resume
 *     description: Upload a PDF resume for AI analysis.
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               jobTitle:
 *                 type: string
 *                 example: Backend Developer
 *               jobDescription:
 *                 type: string
 *                 example: Looking for an engineer experienced in Node.js, PostgreSQL, and REST API design.
 *     responses:
 *       "201":
 *         description: Created
 *       "400":
 *         description: No file uploaded
 *       "401":
 *         description: Unauthorized
 *
 *   get:
 *     summary: List your resumes
 *     description: Get all resumes uploaded by the logged in user.
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of resumes
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         description: Unauthorized
 */

/**
 * @swagger
 * /resumes/{resumeId}:
 *   get:
 *     summary: Get a resume
 *     description: Get a single resume, including any AI feedback.
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Resume id
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         description: Unauthorized
 *       "404":
 *         description: Not found
 *
 *   delete:
 *     summary: Delete a resume
 *     description: Delete a resume owned by the logged in user.
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Resume id
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         description: Unauthorized
 *       "404":
 *         description: Not found
 */

/**
 * @swagger
 * /resumes/{resumeId}/analyze:
 *   post:
 *     summary: Analyze a resume with AI
 *     description: Generate an ATS score, identified skills, gaps, and improvement suggestions using AI.
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Resume id
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         description: Unauthorized
 *       "404":
 *         description: Not found
 */