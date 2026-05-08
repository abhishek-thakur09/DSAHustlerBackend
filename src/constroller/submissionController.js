// Modify your existing executeCode to accept 'stdin'
async function executeCode(sourceCode, languageId, stdin = "") {
    const JUDGE0_URL = "http://localhost:2358/submissions";

    try {
        const response = await axios.post(`${JUDGE0_URL}/?base64_encoded=true&wait=false`, {
            source_code: encode(sourceCode),
            language_id: languageId,
            stdin: encode(stdin), // Pass test case input here
        });

        const { token } = response.data;
        return await pollForResult(token);
    } catch (error) {
        console.error("Judge0 Error:", error.message);
    }
}