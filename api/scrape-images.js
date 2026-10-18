const fetch = require('node-fetch');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).json({ success: false, error: 'Thiếu tham số URL!' });
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
                'Referer': 'https://truyenqq.com.vn/'
            }
        });

        if (!response.ok) {
            return res.status(500).json({ success: false, error: `Lỗi kết nối trang đích: ${response.status}` });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        let images = [];

        // 1. Quét qua các thẻ img thông thường và lazy-load
        $('img').each((i, el) => {
            let imgUrl = $(el).attr('data-src') || $(el).attr('data-original') \vert{}\vert{}$(el).attr('src');
            if (imgUrl) {
                if (imgUrl.startsWith('//')) {
                    imgUrl = 'https:' + imgUrl;
                } else if (imgUrl.startsWith('/')) {
                    try {
                        const parsedUrl = new URL(targetUrl);
                        imgUrl = parsedUrl.origin + imgUrl;
                    } catch (e) {}
                }

                const lower = imgUrl.toLowerCase();
                // Lọc bỏ rác, icon, logo
                if (
                    imgUrl.startsWith('http') &&
                    !lower.includes('logo') &&
                    !lower.includes('icon') &&
                    !lower.includes('avatar') &&
                    !lower.includes('placeholder') &&
                    !images.includes(imgUrl)
                ) {
                    images.push(imgUrl);
                }
            }
        });

        // 2. Dự phòng: Nếu dùng thẻ img không bắt được hết, quét toàn bộ nội dung HTML bằng Regex tìm link ảnh CDN truyện
        if (images.length === 0) {
            const imgRegex = /https?:\/\/[^\s"'<>]+?\.(png|jpg|jpeg|webp)/gi;
            let matches = html.match(imgRegex);
            if (matches) {
                for (let m of matches) {
                    const lower = m.toLowerCase();
                    if (
                        !lower.includes('logo') && 
                        !lower.includes('icon') && 
                        !images.includes(m)
                    ) {
                        images.push(m);
                    }
                }
            }
        }

        return res.status(200).json({
            success: true,
            type: 'comic',
            url: targetUrl,
            total: images.length,
            images: images
        });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message || 'Lỗi xử lý hệ thống nội bộ.' });
    }
};
