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

    // Bạn có thể dán trực tiếp Gemini API Key vào đây hoặc để qua biến môi trường Vercel
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'DÁN_GEMINI_API_KEY_CỦA_BẠN_VÀO_ĐÂY';

    try {
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
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: "Hãy đọc và trích xuất toàn bộ văn bản, chữ viết, bong bóng thoại tiếng Việt có trong bức ảnh truyện tranh này. Chỉ trả về phần nội dung văn bản tìm được, giữ nguyên thứ tự từ trên xuống dưới, không thêm lời bình luận."
                        },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }
            ]
        };

        const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const geminiData = await geminiRes.json();

        if (geminiData.error) {
            return res.status(200).json({ success: false, error: geminiData.error.message });
        }

        let extractedText = '';
        if (geminiData.candidates && geminiData.candidates[0]?.content?.parts?.[0]?.text) {
            extractedText = geminiData.candidates[0].content.parts[0].text;
        }

        return res.status(200).json({
            success: true,
            text: extractedText.trim()
        });

    } catch (err) {
        return res.status(200).json({ success: false, error: err.message || err.toString() });
    }
};
