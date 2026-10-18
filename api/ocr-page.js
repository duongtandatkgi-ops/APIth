const fetch = require('node-fetch');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).send('Thiếu URL ảnh');
    }

    try {
        // Tự động bóc tách tên miền từ URL ảnh để làm Referer chuẩn xác cho từng web (MangaToon, TruyệnQQ, v.v.)
        const parsedUrl = new URL(imageUrl);
        const dynamicReferer = `${parsedUrl.protocol}//${parsedUrl.hostname}/`;

        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': dynamicReferer
            }
        });

        if (!response.ok) {
            return res.status(response.status).send('Không thể tải ảnh');
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);

        const buffer = await response.buffer();
        return res.send(buffer);
    } catch (err) {
        return res.status(500).send(err.message);
    }
};
