const fetch = require('node-fetch');

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

    const { text, groupId, apiKey } = req.body;
    if (!text || !groupId || !apiKey) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin cấu hình MiniMax (text, groupId, apiKey)!' });
    }

    try {
        const minimaxUrl = `https://api.minimax.chat/v1/t2a_v2?GroupId=${groupId}`;
        
        const response = await fetch(minimaxUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "speech-01-turbo",
                text: text,
                stream: false,
                voice_setting: {
                    voice_id: "male-qn-qingse", // Hoặc voice_id nhân bản của bạn
                    speed: 1.0,
                    vol: 1.0,
                    pitch: 0
                },
                audio_setting: {
                    sample_rate: 32000,
                    bitrate: 128000,
                    format: "mp3",
                    channel: 1
                }
            })
        });

        const data = await response.json();

        if (data.base_resp && data.base_resp.status_code === 0) {
            return res.status(200).json({
                success: true,
                audioHex: data.data.audio // MiniMax trả về dạng Hex hoặc URL audio
            });
        } else {
            throw new Error(data.base_resp ? data.base_resp.status_msg : 'Lỗi từ MiniMax API');
        }

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
