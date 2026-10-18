const fetch = require('node-fetch');
const Jimp = require('jimp');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).json({ success: false, error: 'Thiếu tham số URL ảnh!' });
    }

    try {
        // 1. Tải ảnh từ trang truyện với Referer động
        const parsedUrl = new URL(imageUrl);
        const dynamicReferer = `${parsedUrl.protocol}//${parsedUrl.hostname}/`;

        const imgRes = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': dynamicReferer
            }
        });

        if (!imgRes.ok) {
            return res.status(200).json({ success: false, error: 'Không tải được ảnh từ trang truyện.' });
        }

        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Dùng Jimp xử lý ảnh Webtoon siêu dài (cắt/thu nhỏ về kích thước an toàn cho OCR)
        const image = await Jimp.read(buffer);
        
        // Giới hạn chiều rộng và chiều cao để không bị quá tải bộ nhớ OCR
        image.scaleToFit(1000, 2500); // Tự động co giãn vừa khung chuẩn của OCR.space
        
        const compressedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        const base64Data = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;

        // 3. Gửi sang OCR.space với Engine 2
        const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': 'helloworld'
            },
            body: JSON.stringify({
                base64Image: base64Data,
                language: 'vie',
                isOverlayRequired: false,
                scale: true,
                OCREngine: '2'
            })
        });

        const data = await ocrResponse.json();

        if (data.IsErroredOnProcessing) {
            const errorMsg = data.ErrorMessage ? data.ErrorMessage[0] : 'Lỗi xử lý OCR';
            return res.status(200).json({ success: false, error: errorMsg });
        }

        let extractedText = '';
        if (data && data.ParsedResults && data.ParsedResults.length > 0) {
            extractedText = data.ParsedResults[0].ParsedText || '';
        }

        return res.status(200).json({
            success: true,
            text: extractedText.trim()
        });

    } catch (err) {
        return res.status(200).json({ success: false, error: err.message || err.toString() });
    }
};
