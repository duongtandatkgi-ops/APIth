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
        
        // 1. Khoanh vùng các khung nội dung truyện chính thức của etruyen.online và các web truyện chữ phổ biến
        const contentContainers = [
            /<div[^>]*class="[^"]*chapter-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<div[^>]*class="[^"]*content-chapter[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<div[^>]*class="[^"]*reading-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<div[^>]*id="chapter-content"[^>]*>([\s\S]*?)<\/div>/i
        ];

        let targetHtml = '';
        for (let regex of contentContainers) {
            let match = html.match(regex);
            if (match && match[1]) {
                targetHtml = match[1];
                break;
            }
        }

        // Nếu tìm thấy khung chứa, chỉ quét thẻ <p> bên trong khung đó
        if (targetHtml) {
            const pMatches = targetHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
            if (pMatches && pMatches.length > 0) {
                let texts = [];
                for (let p of pMatches) {
                    let inner = p.replace(/<[^>]+>/g, '').trim();
                    if (inner.length > 5 && !/^\d+$/.test(inner)) {
                        texts.push(inner);
                    }
                }
                if (texts.length > 0) {
                    cleanText = texts.join('\n\n');
                }
            }
        }

        // 2. Dự phòng nếu không bắt được khung chính, lọc toàn bộ body nhưng bỏ qua các thẻ rác
        if (!cleanText || cleanText.length < 50) {
            let bodyHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            bodyHtml = bodyHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
            bodyHtml = bodyHtml.replace(/<header\b[^<]*>[\s\S]*?<\/header>/gi, '');
            bodyHtml = bodyHtml.replace(/<footer\b[^<]*>[\s\S]*?<\/footer>/gi, '');
            
            const pMatches = bodyHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
            if (pMatches) {
                let texts = [];
                for (let p of pMatches) {
                    let inner = p.replace(/<[^>]+>/g, '').trim();
                    if (inner.length > 15 && !/^\d+$/.test(inner) && !inner.includes('Đăng nhập') && !inner.includes('Tài khoản')) {
                        texts.push(inner);
                    }
                }
                cleanText = texts.join('\n\n');
            }
        }

        if (!cleanText || cleanText.length < 20) {
            return res.status(200).json({ 
                success: false, 
                error: 'Không tìm thấy nội dung chữ hợp lệ trên trang này.' 
            });
        }

        return res.status(200).json({
            success: true,
            text: cleanText.substring(0, 25000)
        });

    } catch (err) {
        return res.status(200).json({ 
            success: false, 
            error: `Lỗi xử lý: ${err.message || err.toString()}` 
        });
    }
};
