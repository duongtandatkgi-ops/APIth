const fetch = require('node-fetch');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).json({ success: false, error: 'Thiếu tham số URL ảnh!' });
    }

    try {
        // 1. Tải ảnh từ trang truyện với Referer động để lách chống chặn
        const parsedUrl = new URL(imageUrl);
        const dynamicReferer = `${parsedUrl.protocol}//${parsedUrl.hostname}/`;

        const imgRes = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': dynamicReferer
            }
        });

        if (!imgRes.ok) {
            return res.status(200).json({ success: false, error: 'Không tải được ảnh từ trang truyện.' });
        }

        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = `data:image/jpeg;base64,${buffer.toString('base64')}`;

        // 2. Gửi request dưới dạng JSON chuẩn xác sang OCR.space
        const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': 'helloworld'
            },
            body: JSON.stringify({
                base64Image: base64Data,
                language: 'vie',
                isOverlayRequired: false
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
