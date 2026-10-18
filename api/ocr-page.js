const { createWorker } = require('tesseract.js');
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
        // Khởi tạo Tesseract OCR cho tiếng Việt, lưu cache vào /tmp của Vercel
        const worker = await createWorker('vie', 1, {
            cachePath: '/tmp',
        });

        // Tải ảnh từ nguồn truyện qua proxy nội bộ
        const imgRes = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://truyenqq.com.vn/'
            }
        });

        if (!imgRes.ok) {
            await worker.terminate();
            return res.status(200).json({ success: true, text: '' });
        }

        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Nhận diện chữ từ ảnh
        const { data: { text } } = await worker.recognize(buffer);
        await worker.terminate();

        return res.status(200).json({
            success: true,
            text: text ? text.trim() : ''
        });

    } catch (err) {
        return res.status(200).json({ success: false, error: err.message });
    }
};
