jest.mock('../../src/db/models', () => ({}));
jest.mock('fs');
jest.mock('pdf-parse');

const fs = require('fs');
const pdfParse = require('pdf-parse');
const { extractTextFromPdf } = require('../../src/services/resume.service');

describe('extractTextFromPdf', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		fs.readFileSync.mockReturnValue(Buffer.from('fake-pdf-bytes'));
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		console.error.mockRestore();
	});

	it('returns the parsed text when pdf-parse succeeds', async () => {
		pdfParse.mockResolvedValue({ text: 'John Doe\nSoftware Engineer' });

		const result = await extractTextFromPdf('/uploads/some-resume.pdf');

		expect(result).toBe('John Doe\nSoftware Engineer');
		expect(fs.readFileSync).toHaveBeenCalledWith('/uploads/some-resume.pdf');
	});

	it('returns null instead of throwing when the file is not a valid PDF', async () => {
		pdfParse.mockRejectedValue(new Error('Invalid PDF structure'));

		const result = await extractTextFromPdf('/uploads/corrupt.pdf');

		expect(result).toBeNull();
	});

	it('returns null instead of throwing when the file cannot be read from disk', async () => {
		fs.readFileSync.mockImplementation(() => {
			throw new Error('ENOENT: no such file or directory');
		});

		const result = await extractTextFromPdf('/uploads/missing.pdf');

		expect(result).toBeNull();
	});
});