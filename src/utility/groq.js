const { Groq } = require('groq-sdk');
const https = require('https');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});
//buatkan agar bisa melihat berbagai chat sebelumnnya
async function getLastMessages(client, channelId, limit = 20) {
    const channel = await client.channels.fetch(channelId);
   
    if (!channel?.isTextBased()) return [];
   
    const fetched = await channel.messages.fetch({ limit });
   
    return Array.from(
      fetched.sort((a, b) => a.createdTimestamp - b.createdTimestamp).values()
    );
  }

async function groqRequest(ask, messages) {
    // Format previous messages for conversation context
    const messageHistory = messages.map(msg => {
        const username = msg.author.username;
        const content = msg.content;
        return `${username}: ${content}`;
    }).join('\n');

    const chatCompletion = await groq.chat.completions.create({
        "messages": [
          {
            "role": "user",
            "content": `Jawab dengan jawaban satu kalimat atau dua penjelasan pendek, untuk menyambungkan percakapan ini:\n${messageHistory}\n\nUser: ${ask}`
          }
        ],
        "model": "meta-llama/llama-4-scout-17b-16e-instruct",
        "temperature": 1,
        "max_completion_tokens": 512,
        "top_p": 1,
        "stream": false,
        "stop": null
      });
      
      console.log(chatCompletion.choices[0].message.content);
      return chatCompletion.choices[0].message.content
    
}
async function groqRequest_chat(ask, messages) {
    // Format previous messages for conversation context
    const messageHistory = messages.map(msg => {
        const username = msg.author.username;
        const content = msg.content;
        return `${username}: ${content}`;
    }).join('\n');

    const chatCompletion = await groq.chat.completions.create({
        "messages": [
          {
            "role": "user",
            "content": `Jawab dengan jawaban pendek, untuk menyambungkan percakapan ini:\n${messageHistory}\n\nUser: ${ask}`
          }
        ],
        "model": "meta-llama/llama-4-scout-17b-16e-instruct",
        "temperature": 1,
        "max_completion_tokens": 512,
        "top_p": 1,
        "stream": false,
        "stop": null
      });
      
      console.log(chatCompletion.choices[0].message.content);
      return chatCompletion.choices[0].message.content
    
}
async function googleSearch(query) {
    const apiKey = process.env.SERPI_API_KEY;
    
    if (!apiKey) {
        throw new Error('SerpAPI key is required. Please set SERPI_API_KEY in .env file.');
    }
    
    const encodedQuery = encodeURIComponent(query);
    const url = `https://serpapi.com/search.json?api_key=${apiKey}&q=${encodedQuery}&num=5`;
    
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    
                    if (result.error) {
                        reject(new Error(result.error));
                        return;
                    }
                    
                    if (!result.organic_results || result.organic_results.length === 0) {
                        resolve('Tidak ada hasil pencarian ditemukan.');
                        return;
                    }
                    
                    const searchResults = result.organic_results.map((item, index) => {
                        return `${index + 1}. ${item.title}\n${item.snippet}\nURL: ${item.link}`;
                    }).join('\n\n');
                    
                    resolve(searchResults);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

async function groqSearch(search) {
    try {
        const google = await googleSearch(search);
        const chatCompletion = await groq.chat.completions.create({
            "messages": [
              {
                "role": "user",
                "content": `Jawab dengan singkat maksimall 2 kalimat dan 2 link referensi, dan Gunakan informasi berikut ini juga untuk menjawab pertanyaan:\n\n${google}\n\nPertanyaan: ${search}`
              }
            ],
            "model": "meta-llama/llama-4-scout-17b-16e-instruct",
            "temperature": 1,
            "max_completion_tokens": 512,
            "top_p": 1,
            "stream": false,
            "stop": null
          });
          
          const hasil = chatCompletion.choices[0].message.content;
          console.log(hasil);
          return hasil;
    } catch (error) {
        console.error('Error in groqSearch:', error.message);
        return `Maaf, terjadi kesalahan saat melakukan pencarian: ${error.message}`;
    }
}

module.exports = { groqRequest, groqSearch, getLastMessages, groqRequest_chat };
