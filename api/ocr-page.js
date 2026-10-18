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
        // Sử dụng OCR Cloud API miễn phí với hỗ trợ tiếng Việt (vie)
        const ocrApiUrl = `https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodeURIComponent(imageUrl)}&language=vie&isOverlayRequired=false`;
        
        const response = await fetch(ocrApiUrl);
        const data = await response.json();

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
