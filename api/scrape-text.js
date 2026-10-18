const fetch = require('node-fetch');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).json({ success: false, error: 'Thiếu tham số URL!' });
    }

    try {
        // Gửi request cào dữ liệu với User-Agent giả lập trình duyệt thật
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en-`q=0.7'
            },
            timeout: 10000 // Giới hạn thời gian chờ 10 giây để tránh treo server
        });

        if (!response.ok) {
            return res.status(200).json({ 
                success: false, 
                error: `Trang web từ chối kết nối (HTTP ${response.status}). Có thể trang này chặn Cloudflare/Bot.` 
            });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Xóa các thành phần rác
        $('script, style, nav, footer, header, .ads, .advertisement').remove();

        // Thử tìm nội dung theo các khung chứa nội dung phổ biến
        let text = '';
        const selectors = ['.reading-content', '.chapter-c', '#chapter-content', '.content', '.box-content', 'article', '.story-content', '.chapter-content'];
        
        for (let sel of selectors) {
            if ($(sel).length > 0) {
                text = $(sel).text();
                break;
            }
        }

        // Nếu không tìm thấy qua selector, quét toàn bộ thẻ đoạn văn <p>
        if (!text || text.trim().length < 50) {
            let paragraphs = [];
            $('p').each((i, el) => {
                let pText = $(el).text().trim();
                if (pText.length > 20) paragraphs.push(pText);
            });
            text = paragraphs.join('\n\n');
        }

        if (!text || text.trim().length === 0) {
            return res.status(200).json({ 
                success: false, 
                error: 'Không tìm thấy nội dung chữ. Trang truyện này có thể dùng cấu trúc ẩn hoặc chống cào dữ liệu.' 
            });
        }

        return res.status(200).json({
            success: true,
            text: text.replace(/\n\s*\n/g, '\n\n').trim()
        });

    } catch (err) {
        // Bắt mọi lỗi phát sinh để trả về JSON an toàn, tuyệt đối không làm sập Function Vercel
        return res.status(200).json({ 
            success: false, 
            error: `Lỗi kết nối server: ${err.message || err.toString()}` 
        });
    }
};
