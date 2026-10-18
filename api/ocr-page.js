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
        // Chỉ định rõ ràng langPath CDN chính thức để tải nhanh tệp tiếng Việt
        const worker = await createWorker('vie', 1, {
            langPath: 'https://tessdata.projectnaptha.com/4.00_best',
            cachePath: '/tmp'
        });

        const imgRes = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://truyenqq.com.vn/'
            }
        });

        if (!imgRes.ok) {
            await worker.terminate();
            return res.status(200).json({ success: false, error: 'Không thể tải hình ảnh từ trang đích.' });
        }

        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data: { text } } = await worker.recognize(buffer);
        await worker.terminate();

        return res.status(200).json({
            success: true,
            text: text ? text.trim() : ''
        });

    } catch (err) {
        return res.status(200).json({ success: false, error: err.message || err.toString() });
    }
};
