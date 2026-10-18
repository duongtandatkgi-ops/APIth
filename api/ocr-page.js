const fetch = require('node-fetch');
const Jimp = require('jimp');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Chỉ hỗ trợ phương thức POST' });
    }

    try {
        const { base64Image } = req.body;
        if (!base64Image) {
            return res.status(400).json({ success: false, error: 'Thiếu dữ liệu base64 ảnh!' });
        }

        // Chuyển đổi base64 sang buffer để xử lý bằng Jimp
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const image = await Jimp.read(buffer);
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        let extractedFullText = '';
        const sliceHeight = 2500; // Cắt ảnh thành từng khúc cao 2500px để OCR đọc cực kỳ rõ chữ

        if (height > sliceHeight) {
            for (let y = 0; y < height; y += sliceHeight) {
                let currentHeight = Math.min(sliceHeight, height - y);
                let cropped = image.clone().crop(0, y, width, currentHeight);
                let sliceBuffer = await cropped.getBufferAsync(Jimp.MIME_JPEG);
                let sliceBase64 = `data:image/jpeg;base64,${sliceBuffer.toString('base64')}`;

                let ocrRes = await sendToOcr(sliceBase64);
                if (ocrRes) {
                    extractedFullText += '\n' + ocrRes;
                }
            }
        } else {
            extractedFullText = await sendToOcr(base64Image);
        }

        return res.status(200).json({
            success: true,
            text: extractedFullText.trim()
        });

    } catch (err) {
        return res.status(200).json({ success: false, error: err.message || err.toString() });
    }
};

async function sendToOcr(base64Img) {
    try {
        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': 'helloworld'
            },
            body: JSON.stringify({
                base64Image: base64Img,
                language: 'vie',
                isOverlayRequired: false,
                scale: true,
                OCREngine: '2' // Engine 2 chuyên dụng cho bong bóng thoại truyện tranh
            })
        });

        const data = await response.json();
        if (data.IsErroredOnProcessing) return '';
        if (data && data.ParsedResults && data.ParsedResults.length > 0) {
            return data.ParsedResults[0].ParsedText || '';
        }
        return '';
    } catch (e) {
        return '';
    }
}
