const fetch = require('node-fetch');

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
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            return res.status(200).json({ 
                success: false, 
                error: `Trang web từ chối kết nối (Mã lỗi: ${response.status})` 
            });
        }

        const html = await response.text();

        let cleanText = '';
        
        // Tự động bóc tách các đoạn văn <p> bằng Regex (không cần thư viện ngoài)
        const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
        if (pMatches && pMatches.length > 0) {
            let texts = pMatches.map(p => p.replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 15);
            cleanText = texts.join('\n\n');
        }

        // Nếu không bắt được thẻ p, lọc toàn bộ body
        if (!cleanText || cleanText.length < 50) {
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            let bodyHtml = bodyMatch ? bodyMatch[1] : html;
            bodyHtml = bodyHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            bodyHtml = bodyHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
            cleanText = bodyHtml.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n\n').trim();
        }

        if (!cleanText || cleanText.length < 20) {
            return res.status(200).json({ 
                success: false, 
                error: 'Không tìm thấy nội dung chữ trên trang này.' 
            });
        }

        return res.status(200).json({
            success: true,
            text: cleanText.substring(0, 15000)
        });

    } catch (err) {
        return res.status(200).json({ 
            success: false, 
            error: `Lỗi xử lý: ${err.message || err.toString()}` 
        });
    }
};
