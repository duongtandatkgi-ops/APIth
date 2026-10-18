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
        
        // Lọc các thẻ <p> chứa nội dung truyện thực sự (bỏ qua số thuần túy hoặc câu quá ngắn)
        const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
        if (pMatches && pMatches.length > 0) {
            let texts = [];
            for (let p of pMatches) {
                let inner = p.replace(/<[^>]+>/g, '').trim();
                // Chỉ lấy đoạn văn có độ dài > 5 ký tự và KHÔNG PHẢI LÀ SỐ THUẦN TÚY (/^\d+$/)
                if (inner.length > 5 && !/^\d+$/.test(inner)) {
                    texts.push(inner);
                }
            }
            if (texts.length > 0) {
                cleanText = texts.join('\n\n');
            }
        }

        // Phương án dự phòng nếu trang không dùng thẻ p chuẩn
        if (!cleanText || cleanText.length < 50) {
            let bodyHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            bodyHtml = bodyHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
            
            const lines = bodyHtml.replace(/<[^>]+>/g, '\n').split('\n');
            let validLines = lines.map(l => l.trim()).filter(l => l.length > 10 && !/^\d+$/.test(l));
            cleanText = validLines.join('\n\n');
        }

        if (!cleanText || cleanText.length < 20) {
            return res.status(200).json({ 
                success: false, 
                error: 'Không tìm thấy nội dung chữ hợp lệ trên trang này.' 
            });
        }

        return res.status(200).json({
            success: true,
            text: cleanText.substring(0, 20000)
        });

    } catch (err) {
        return res.status(200).json({ 
            success: false, 
            error: `Lỗi xử lý: ${err.message || err.toString()}` 
        });
    }
};
