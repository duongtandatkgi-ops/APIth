const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Cấu hình CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(200).json({ success: false, error: 'Thiếu tham số URL!' });
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Referer': 'https://truyenqq.com.vn/'
            }
        });

        if (!response.ok) {
            return res.status(200).json({ success: false, error: `Lỗi kết nối trang đích (HTTP ${response.status})` });
        }

        const html = await response.text();
        let images = [];

        // Sử dụng Regex tìm tất cả các đường dẫn ảnh (jpg, png, webp, jpeg) trong mã nguồn trang
        const imgRegex = /https?:\/\/[^\s"'<>]+?\.(png|jpg|jpeg|webp)(\?[^\s"'<>]*)?/gi;
        let matches = html.match(imgRegex);

        if (matches) {
            for (let m of matches) {
                let lower = m.toLowerCase();
                // Lọc bỏ các ảnh rác, logo, icon, banner quảng cáo
                if (
                    !lower.includes('logo') &&
                    !lower.includes('icon') &&
                    !lower.includes('avatar') &&
                    !lower.includes('ads') &&
                    !lower.includes('banner') &&
                    !images.includes(m)
                ) {
                    images.push(m);
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
        // Luôn trả về JSON chuẩn ngay cả khi có lỗi hệ thống để extension không bao giờ bị crash
        return res.status(200).json({ success: false, error: err.message || 'Lỗi xử lý hệ thống nội bộ.' });
    }
};
