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
        
        // 1. Khoanh vùng chính xác khung chứa nội dung chương của etruyen.online
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

        // Nếu bắt được khung, lọc từng thẻ <p> bên trong
        if (targetHtml) {
            const pMatches = targetHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
            if (pMatches && pMatches.length > 0) {
                let texts = [];
                for (let p of pMatches) {
                    let inner = p.replace(/<[^>]+>/g, '').trim();
                    // Lọc bỏ các dòng rác, thông báo chuyển khoản hoặc quá ngắn
                    if (inner.length > 5 && 
                        !/^\d+$/.test(inner) && 
                        !inner.includes('chuyển khoản') && 
                        !inner.includes('thanh toán') && 
                        !inner.includes('Mua Truyện') &&
                        !inner.includes('Mọi thắc mắc')) {
                        texts.push(inner);
                    }
                }
                if (texts.length > 0) {
                    cleanText = texts.join('\n\n');
                }
            }
        }

        // 2. Dự phòng: Cắt bỏ thủ công các phần rác đầu/cuối nếu quét toàn trang
        if (!cleanText || cleanText.length < 50) {
            let bodyHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            bodyHtml = bodyHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
            
            // Cắt từ khóa bắt đầu nội dung chương thường gặp đến trước phần bình luận/truyện cùng thể loại
            const startIdx = bodyHtml.indexOf('Hai giờ sáng'); // Hoặc điểm bắt đầu nội dung
            const endIdx = bodyHtml.indexOf('Truyện cùng thể loại');
            
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                bodyHtml = bodyHtml.substring(startIdx, endIdx);
            }

            const pMatches = bodyHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
            if (pMatches) {
                let texts = [];
                for (let p of pMatches) {
                    let inner = p.replace(/<[^>]+>/g, '').trim();
                    if (inner.length > 10 && !/^\d+$/.test(inner) && !inner.includes('chuyển khoản')) {
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
