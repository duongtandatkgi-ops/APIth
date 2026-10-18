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

        // Các khung chứa nội dung chương truyện tranh phổ biến
        const comicSelectors = ['.reading-detail', '.page-chapter', '.box-read', '.chapter-content', '.reading-content'];
        let comicBox = null;
        for (let sel of comicSelectors) {
            if ($(sel).length > 0) {
                comicBox = $(sel).first();
                break;
            }
        }

        let images = [];
        let container = comicBox && comicBox.length > 0 ? comicBox : $('body');

        container.find('img').each((i, el) => {
            let imgUrl = $(el).attr('data-src') || $(el).attr('data-original') \vert{}\vert{}$(el).attr('src');
            if (imgUrl) {
                // Chuẩn hóa URL tương đối thành tuyệt đối
                if (imgUrl.startsWith('//')) {
                    imgUrl = 'https:' + imgUrl;
                } else if (imgUrl.startsWith('/')) {
                    const parsedUrl = new URL(targetUrl);
                    imgUrl = parsedUrl.origin + imgUrl;
                }
                
                const lowerImg = imgUrl.toLowerCase();
                // Lọc bỏ rác, logo nhỏ, icon
                if (
                    !lowerImg.includes('logo') && 
                    !lowerImg.includes('icon') && 
                    !lowerImg.includes('avatar') &&
                    !images.includes(imgUrl) &&
                    (lowerImg.startsWith('http://') || lowerImg.startsWith('https://'))
                ) {
                    images.push(imgUrl);
                }
            }
        });

        return res.status(200).json({
            success: true,
            type: 'comic',
            url: targetUrl,
            total: images.length,
            images: images
        });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
