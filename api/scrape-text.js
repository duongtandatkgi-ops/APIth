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
        
        // 1. Quét các thẻ đoạn văn <p>
        const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
        if (pMatches && pMatches.length > 0) {
            let texts = [];
            for (let p of pMatches) {
                let inner = p.replace(/<[^>]+>/g, '').trim();
                // Bỏ qua các dòng quá ngắn hoặc chỉ là số (tránh lỗi hiện số 0)
                if (inner.length > 15 && isNaN(inner)) {
                    texts.push(inner);
                }
            }
            if (texts.length > 0) {
                cleanText = texts.join('\n\n');
            }
        }

        // 2. Nếu không bắt được qua thẻ p, lọc toàn bộ body
        if (!cleanText || cleanText.length < 50) {
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            let bodyHtml = bodyMatch ? bodyMatch[1] : html;
            bodyHtml = bodyHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            bodyHtml = bodyHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
            
            let rawLines = bodyHtml.replace(/<[^>]+>/g, '\n').split('\n');
            let filteredLines = rawLines.map(l => l.trim()).filter(l => l.length > 20 && isNaN(l));
            cleanText = filteredLines.join('\n\n');
        }

        if (!cleanText || cleanText.length < 20) {
            return res.status(200).json({ 
                success: false, 
                error: 'Không tìm thấy nội dung chữ hợp lệ trên trang này.' 
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
