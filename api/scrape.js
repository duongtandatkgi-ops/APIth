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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9',
                'Referer': new URL(targetUrl).origin
            }
        });

        if (!response.ok) {
            throw new Error(`Lỗi kết nối: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // --- BƯỚC 1: KIỂM VÀ LẤY ẢNH (Dành cho trang web chỉ có ảnh / truyện tranh) ---
        // Các khung chứa ảnh phổ biến của các trang truyện (TruyenQQ, NetTruyen, v.v.)
        const comicSelectors = ['.reading-detail', '.page-chapter', '.box-read', '.chapter-content', '.reading-content'];
        let comicBox = null;
        for (let sel of comicSelectors) {
            if ($(sel).length > 0) {
                comicBox = $(sel).first();
                break;
            }
        }

        let images = [];
        if (comicBox && comicBox.length > 0) {
            comicBox.find('img').each((i, el) => {
                // Lấy link ảnh từ các thuộc tính lazy-load (data-src, data-original) hoặc src thông thường
                let imgUrl = $(el).attr('data-src') || $(el).attr('data-original') \vert{}\vert{}$(el).attr('src');
                if (imgUrl) {
                    // Xử lý chuẩn hóa nếu là đường dẫn tương đối
                    if (imgUrl.startsWith('//')) {
                        imgUrl = 'https:' + imgUrl;
                    } else if (imgUrl.startsWith('/')) {
                        const parsedUrl = new URL(targetUrl);
                        imgUrl = parsedUrl.origin + imgUrl;
                    }
                    
                    // Lọc bỏ các ảnh rác (icon, logo nhỏ, v.v.)
                    if (!imgUrl.includes('logo') && !imgUrl.includes('icon') && !images.includes(imgUrl)) {
                        images.push(imgUrl);
                    }
                }
            });
        }

        // Nếu tìm thấy danh sách ảnh, trả về kết quả dạng Comic (truyện tranh)
        if (images.length > 0) {
            return res.status(200).json({
                success: true,
                type: 'comic',
                url: targetUrl,
                totalImages: images.length,
                images: images
            });
        }

        // --- BƯỚC 2: FALLBACK VỀ CÀO TEXT (Dành cho trang truyện chữ / văn bản) ---
        $('script, style, nav, footer, header, .ads, .hidden, iframe, noscript').remove();

        const textSelectors = ['.chapter-c', '.reading-content', '#content', 'article', '.box-content', '.chapter-content', '.entry-content'];
        let contentBox = null;
        for (let sel of textSelectors) {
            if ($(sel).length > 0) {
                contentBox = $(sel).first();
                break;
            }
        }

        let textContent = "";
        if (contentBox && contentBox.length > 0) {
            contentBox.find('br').replaceWith('\n');
            textContent = contentBox.text();
        } else {
            $('body').find('br').replaceWith('\n');
            textContent = $('body').text();
        }

        const cleanText = textContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');

        return res.status(200).json({
            success: true,
            type: 'novel',
            url: targetUrl,
            content: cleanText.substring(0, 15000)
        });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
