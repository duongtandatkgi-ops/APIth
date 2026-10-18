const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

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
        // 1. Tải ảnh về qua server của chúng ta với đầy đủ Referer header để lách lớp chống trộm băng thông
        const imgRes = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://truyenqq.com.vn/'
            }
        });

        if (!imgRes.ok) {
            return res.status(200).json({ success: false, error: `Không thể tải ảnh (HTTP ${imgRes.status})` });
        }

        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = `data:image/jpeg;base64,${buffer.toString('base64')}`;

        // 2. Gửi dữ liệu ảnh Base64 lên OCR API qua phương thức POST
        const params = new URLSearchParams();
        params.append('apikey', 'helloworld');
        params.append('language', 'vie');
        params.append('base64Image', base64Data);
        params.append('isOverlayRequired', 'false');

        const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            body: params
        });

        const data = await ocrResponse.json();

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
