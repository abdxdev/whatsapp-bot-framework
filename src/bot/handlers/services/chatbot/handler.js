export async function sendMessage(ctx) {
  const { args, chatId, userId, stateManager, storageManager } = ctx;
  const { prompt } = args;

  if (!prompt?.trim()) return 'Message required';

  const settings = await stateManager.getServiceSettings(chatId, 'chatbot');
  const history = await storageManager.getEntries(chatId, 'chatbot', 'history') || [];

  const userMessage = {
    id: Date.now().toString(36),
    role: 'user',
    content: prompt,
    userId,
    timestamp: new Date().toISOString()
  };

  await storageManager.addEntry(chatId, 'chatbot', 'history', userMessage);

  const aiResponse = await generateAIResponse(prompt, history, settings);

  const assistantMessage = {
    id: (Date.now() + 1).toString(36),
    role: 'assistant',
    content: aiResponse,
    timestamp: new Date().toISOString()
  };

  await storageManager.addEntry(chatId, 'chatbot', 'history', assistantMessage);

  const currentHistory = await storageManager.getEntries(chatId, 'chatbot', 'history');
  if (currentHistory.length > 50) {
    const toRemove = currentHistory.slice(0, currentHistory.length - 50);
    for (const msg of toRemove) {
      await storageManager.deleteEntry(chatId, 'chatbot', 'history', msg.id);
    }
  }

  return aiResponse;
}

async function generateAIResponse(prompt, history, settings) {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return `Received: "${prompt}"\n\n_AI not configured. Set AI_API_KEY or OPENAI_API_KEY._`;
  }

  try {
    return `Processing: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"\n\n_API call not implemented._`;
  } catch (error) {
    console.error('AI API error:', error);
    return `Error: ${error.message}`;
  }
}

export async function clearHistory(ctx) {
  const { chatId, storageManager } = ctx;
  await storageManager.clearEntries(chatId, 'chatbot', 'history');
  return 'History cleared';
}
