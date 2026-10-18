const fetch = require('node-fetch');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Chỉ hỗ trợ phương thức POST' });
    }

    try {
        const { base64Image } = req.body;
        if (!base64Image) {
            return res.status(400).json({ success: false, error: 'Thiếu dữ liệu base64 ảnh!' });
        }

        // Gửi trực tiếp sang OCR.space với Engine 2 chuyên dụng cho truyện tranh
        const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': 'helloworld'
            },
            body: JSON.stringify({
                base64Image: base64Image,
                language: 'vie',
                isOverlayRequired: false,
                scale: true,
                OCREngine: '2'
            })
        });

        const data = await ocrResponse.json();

        if (data.IsErroredOnProcessing) {
            const errorMsg = data.ErrorMessage ? data.ErrorMessage[0] : 'Lỗi xử lý OCR';
            return res.status(200).json({ success: false, error: errorMsg });
        }

        let extractedText = '';
        if (data && data.ParsedResults && data.ParsedResults.length > 0) {
            extractedText = data.ParsedResults[0].ParsedText || '';
        }

        return res.status(200).json({
            success: true,
            text: extractedText.trim()
        });

    } catch (err) {
        return res.status(200).json({ success: false, error: err.message || err.toString() });
    }
};
