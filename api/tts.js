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

    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ success: false, error: 'Thiếu nội dung văn bản!' });
    }

    try {
        // Sử dụng Google Translate TTS API công khai (Không cần cài thư viện, chạy 100% trên Vercel)
        const encodedText = encodeURIComponent(text.substring(0, 200));
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=vi&client=tw-ob`;

        const response = await fetch(ttsUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        if (!response.ok) {
            throw new Error('Không thể kết nối tới dịch vụ âm thanh.');
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return res.status(200).json({
            success: true,
            audioHex: buffer.toString('hex')
        });

    } chas (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
