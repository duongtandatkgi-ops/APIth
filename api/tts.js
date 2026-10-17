const { MsEdgeTTS, Voices } = require("ms-edge-tts");

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

    const { text, rate } = req.body;
    if (!text) {
        return res.status(400).json({ success: false, error: 'Thiếu nội dung văn bản!' });
    }

    try {
        const tts = new MsEdgeTTS();
        await tts.setMetadata(Voices.vi_VN_HoaiMy, "audio-24khz-48kbitrate-mono-mp3");

        let speedStr = "+0%";
        if (rate && rate !== 1.0) {
            let percent = Math.round((rate - 1.0) * 100);
            speedStr = (percent >= 0 ? "+" : "") + percent + "%";
        }

        const audioStream = tts.toStream(text, { rate: speedStr });
        
        let chunks = [];
        for await (const chunk of audioStream) {
            chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);

        return res.status(200).json({
            success: true,
            audioHex: audioBuffer.toString('hex')
        });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
